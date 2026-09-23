import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import RoleOperationLock from '../models/RoleOperationLock.js'
import User from '../models/User.js'
import ApiError from '../utils/ApiError.js'
import { CONTENT_MANAGER_ROLES, OWNER_ONLY_ROLES, ROLE_MANAGER_ROLES } from '../utils/roles.js'
import { normalizeEmail } from './authService.js'

const LOCK_ID = 'role-management'
const LEASE_MS = 3 * 60 * 1000
const ROLE_CONFLICT = 'The requested role change is no longer available. Refresh and try again.'

function toTeamMember(user) {
  return {
    id: user._id.toString(), name: user.name, email: user.email,
    role: user.role, accountStatus: user.accountStatus,
    createdAt: user.createdAt, lastLoginAt: user.lastLoginAt || null,
  }
}

export async function listTeamMembers({ page, pageSize, search, sort }) {
  const filter = { role: { $in: CONTENT_MANAGER_ROLES } }
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [{ name: new RegExp(escaped, 'i') }, { email: new RegExp(escaped, 'i') }]
  }
  const descending = sort.startsWith('-')
  const field = descending ? sort.slice(1) : sort
  const direction = descending ? -1 : 1
  const [users, totalRecords] = await Promise.all([
    User.find(filter).select('name email role accountStatus createdAt lastLoginAt')
      .sort({ [field]: direction, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    User.countDocuments(filter),
  ])
  return { users: users.map(toTeamMember), pagination: {
    page, pageSize, totalRecords, totalPages: Math.ceil(totalRecords / pageSize),
  } }
}

async function withRoleLock(operation) {
  const claimId = randomUUID()
  const now = new Date()
  try {
    await RoleOperationLock.create({ _id: LOCK_ID, claimId, leaseUntil: new Date(now.getTime() + LEASE_MS) })
  } catch (error) {
    if (error.code !== 11000) throw error
    const reclaimed = await RoleOperationLock.findOneAndUpdate(
      { _id: LOCK_ID, leaseUntil: { $lte: now } },
      { $set: { claimId, leaseUntil: new Date(now.getTime() + LEASE_MS) } }, { new: true },
    )
    if (!reclaimed) throw new ApiError(409, 'Another role change is in progress. Try again shortly.', 'ROLE_CHANGE_BUSY')
  }
  let lostClaim = false
  const heartbeat = setInterval(async () => {
    try {
      const result = await RoleOperationLock.updateOne({ _id: LOCK_ID, claimId }, { $set: { leaseUntil: new Date(Date.now() + LEASE_MS) } })
      if (!result.matchedCount) lostClaim = true
    } catch { lostClaim = true }
  }, 20_000)
  heartbeat.unref()
  try {
    return await operation(async () => {
      if (lostClaim || !(await RoleOperationLock.exists({ _id: LOCK_ID, claimId, leaseUntil: { $gt: new Date() } }))) {
        throw new ApiError(409, 'Role-change claim expired. Try again.', 'ROLE_CHANGE_BUSY')
      }
    })
  } finally {
    clearInterval(heartbeat)
    await RoleOperationLock.deleteOne({ _id: LOCK_ID, claimId })
  }
}

async function verifyActor(actorId, currentPassword, allowedRoles) {
  const actor = await User.findById(actorId).select('+passwordHash')
  if (!actor || actor.accountStatus !== 'active' || !allowedRoles.includes(actor.role)) {
    throw new ApiError(403, 'You do not have permission to change this role.', 'FORBIDDEN')
  }
  if (!(await bcrypt.compare(currentPassword, actor.passwordHash))) {
    throw new ApiError(403, 'Current password is incorrect.', 'REAUTHENTICATION_FAILED')
  }
  return actor
}

async function changeRole({ actorId, currentPassword, allowedRoles, targetId, targetEmail, confirmEmail,
  expectedRole, newRole, action, requireActive = false }) {
  // Password verification precedes the durable claim; bad guesses do not occupy it.
  await verifyActor(actorId, currentPassword, allowedRoles)
  return withRoleLock(async (checkClaim) => {
    const actor = await verifyActor(actorId, currentPassword, allowedRoles)
    const target = targetId
      ? await User.findById(targetId).select('name email role accountStatus createdAt lastLoginAt')
      : await User.findOne({ email: normalizeEmail(targetEmail) }).select('name email role accountStatus createdAt lastLoginAt')
    if (!target) throw new ApiError(404, 'The target account was not found.', 'USER_NOT_FOUND')
    if (target._id.equals(actor._id)) throw new ApiError(409, 'You cannot change your own role.', 'SELF_ROLE_CHANGE')
    if (target.role !== expectedRole || (requireActive && target.accountStatus !== 'active')) {
      throw new ApiError(409, ROLE_CONFLICT, 'ROLE_CONFLICT')
    }
    if (confirmEmail && normalizeEmail(confirmEmail) !== target.email) {
      throw new ApiError(400, 'Typed email does not match the target account.', 'EMAIL_CONFIRMATION_MISMATCH')
    }
    await checkClaim()
    const audit = { operationId: randomUUID(), actor: actor._id, actorRole: actor.role,
      target: target._id, action, previousRole: expectedRole, newRole, occurredAt: new Date() }
    const updated = await User.findOneAndUpdate({ _id: target._id, role: expectedRole,
      ...(requireActive && { accountStatus: 'active' }) },
    { $set: { role: newRole }, $push: { roleAudit: audit } },
    { new: true, runValidators: true })
    if (!updated) throw new ApiError(409, ROLE_CONFLICT, 'ROLE_CONFLICT')
    return toTeamMember(updated)
  })
}

export const promoteStudent = (actorId, { email, currentPassword }) => changeRole({
  actorId, currentPassword, allowedRoles: ROLE_MANAGER_ROLES, targetEmail: email,
  expectedRole: 'student', newRole: 'admin', action: 'admin_promoted', requireActive: true,
})
export const revokeAdmin = (actorId, userId, { currentPassword }) => changeRole({
  actorId, currentPassword, allowedRoles: ROLE_MANAGER_ROLES, targetId: userId,
  expectedRole: 'admin', newRole: 'student', action: 'admin_access_revoked', requireActive: true,
})
export const grantCoOwner = (actorId, userId, { currentPassword, confirmEmail }) => changeRole({
  actorId, currentPassword, allowedRoles: OWNER_ONLY_ROLES, targetId: userId, confirmEmail,
  expectedRole: 'admin', newRole: 'co_owner', action: 'co_owner_granted', requireActive: true,
})
export const revokeCoOwner = (actorId, userId, { currentPassword, confirmEmail }) => changeRole({
  actorId, currentPassword, allowedRoles: OWNER_ONLY_ROLES, targetId: userId, confirmEmail,
  expectedRole: 'co_owner', newRole: 'admin', action: 'co_owner_access_revoked', requireActive: true,
})
