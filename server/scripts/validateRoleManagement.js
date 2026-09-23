import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import app from '../src/app.js'
import User from '../src/models/User.js'
import StudentProfile from '../src/models/StudentProfile.js'
import { signAccessToken } from '../src/utils/jwt.js'

const databaseName = `dae2uni_role_test_${randomUUID().replaceAll('-', '')}`
const prefix = `temporary-role-${randomUUID()}`
const password = `Aa1${randomBytes(20).toString('base64url')}`
const originalUri = process.env.MONGODB_URI
let server
let checks = 0
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks++ }
function check(value, label) { assert.ok(value, label); checks++ }
async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers: { Accept: 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...(body && { 'Content-Type': 'application/json' }) },
    ...(body && { body: JSON.stringify(body) }),
  })
  return { status: response.status, payload: await response.json() }
}
const post = (path, token, body) => request(path, { method: 'POST', token, body })

async function main() {
  if (!originalUri) throw new Error('Local MongoDB test configuration is required.')
  const uri = new URL(originalUri)
  if (uri.protocol !== 'mongodb:' || !['127.0.0.1', 'localhost'].includes(uri.hostname)) {
    throw new Error('Role validation only runs against local MongoDB.')
  }
  uri.pathname = `/${databaseName}`
  process.env.MONGODB_URI = uri.toString()
  await mongoose.connect(process.env.MONGODB_URI)
  equal(mongoose.connection.name, databaseName, 'isolated role database')
  await User.init()
  const hash = await bcrypt.hash(password, 12)
  const records = await User.create([
    { name: 'Temporary Owner', email: `${prefix}-owner@example.invalid`, passwordHash: hash, role: 'owner', ownerMarker: 'permanent_owner', accountStatus: 'active' },
    { name: 'Temporary Co Owner', email: `${prefix}-coowner@example.invalid`, passwordHash: hash, role: 'co_owner', accountStatus: 'active' },
    { name: 'Temporary Admin', email: `${prefix}-admin@example.invalid`, passwordHash: hash, role: 'admin', accountStatus: 'active' },
    { name: 'Temporary Student A', email: `${prefix}-student-a@example.invalid`, passwordHash: hash, role: 'student', accountStatus: 'active' },
    { name: 'Temporary Student B', email: `${prefix}-student-b@example.invalid`, passwordHash: hash, role: 'student', accountStatus: 'active' },
    { name: 'Temporary Student C', email: `${prefix}-student-c@example.invalid`, passwordHash: hash, role: 'student', accountStatus: 'active' },
    { name: 'Temporary Inactive', email: `${prefix}-inactive@example.invalid`, passwordHash: hash, role: 'student', accountStatus: 'suspended' },
  ])
  const [owner, coOwner, admin, studentA, studentB, studentC, inactive] = records
  const profile = await StudentProfile.create({ user: studentA._id, profileStatus: 'draft' })
  const tokens = Object.fromEntries(records.map((user) => [user.role === 'student' ? user.email : user.role, signAccessToken(user)]))
  const ownerToken = tokens.owner, coToken = tokens.co_owner, adminToken = tokens.admin
  const studentToken = signAccessToken(studentA)
  server = app.listen(0)
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })

  equal((await request('/api/admin/ping', { token: ownerToken })).status, 200, 'Owner content access')
  equal((await request('/api/admin/ping', { token: coToken })).status, 200, 'Co-Owner content access')
  equal((await request('/api/admin/ping', { token: adminToken })).status, 200, 'Admin content access')
  equal((await request('/api/admin/ping', { token: studentToken })).status, 403, 'Student content denied')
  equal((await request('/api/admin/administrators')).status, 401, 'team list authentication')
  equal((await request('/api/admin/administrators', { token: adminToken })).status, 403, 'Admin cannot list team')
  equal((await request('/api/admin/administrators', { token: studentToken })).status, 403, 'Student cannot list team')
  equal((await request('/api/admin/administrators', { token: coToken })).status, 200, 'Co-Owner can list team')
  const list = await request('/api/admin/administrators?pageSize=2&page=1&sort=-createdAt', { token: ownerToken })
  equal(list.status, 200, 'Owner team list')
  equal(list.payload.data.pagination.totalRecords, 3, 'team total excludes Students')
  equal(list.payload.data.users.length, 2, 'bounded team page')
  check(!/password|ownerMarker|roleAudit|token/i.test(JSON.stringify(list.payload)), 'team list serialization safe')
  equal((await request('/api/admin/administrators?pageSize=101', { token: ownerToken })).status, 400, 'page size bounded')
  equal((await request('/api/admin/administrators?search=%24set', { token: ownerToken })).payload.data.pagination.totalRecords, 0, 'literal search')
  equal((await request('/api/admin/administrators?sort=passwordHash', { token: ownerToken })).status, 400, 'sort allowlist')
  equal((await request('/api/setup/status')).payload.data.ownerSetupRequired, false, 'existing Owner locks setup')

  const promotePath = '/api/admin/administrators/promote'
  const promoteBody = { email: studentA.email, currentPassword: password }
  equal((await post(promotePath, adminToken, promoteBody)).status, 403, 'Admin cannot promote')
  equal((await post(promotePath, ownerToken, { email: studentA.email })).status, 400, 'acting password required')
  equal((await post(promotePath, ownerToken, { ...promoteBody, currentPassword: `${password}x` })).status, 403, 'wrong password rejected')
  equal((await post(promotePath, ownerToken, { ...promoteBody, role: 'owner' })).status, 400, 'role injection rejected')
  equal((await post(promotePath, ownerToken, { ...promoteBody, $set: { role: 'owner' } })).status, 400, 'operator injection rejected')
  const pollution = JSON.parse(JSON.stringify(promoteBody).replace(/}$/, ',"__proto__":{"role":"owner"}}'))
  equal((await post(promotePath, ownerToken, pollution)).status, 400, 'prototype key rejected')
  equal((await post(promotePath, ownerToken, { email: inactive.email, currentPassword: password })).status, 409, 'inactive Student rejected')
  equal((await post(promotePath, ownerToken, { email: admin.email, currentPassword: password })).status, 409, 'existing Admin rejected')
  equal((await post(promotePath, ownerToken, { email: owner.email, currentPassword: password })).status, 409, 'Owner target rejected')
  equal((await post(promotePath, ownerToken, promoteBody)).payload.data.user.role, 'admin', 'Owner promotes Student')
  equal((await StudentProfile.findById(profile._id))?.user.toString(), studentA.id, 'profile preserved after promotion')
  equal((await request('/api/admin/ping', { token: studentToken })).status, 200, 'promoted existing token gains content access')
  equal((await post(promotePath, coToken, { email: studentB.email, currentPassword: password })).status, 200, 'Co-Owner promotes Student')
  await User.updateOne({ _id: studentB._id }, { $set: { accountStatus: 'suspended' } })
  equal((await post(`/api/admin/administrators/${studentB.id}/revoke`, ownerToken,
    { currentPassword: password, confirmed: true })).status, 409, 'inactive Admin cannot be changed')
  await User.updateOne({ _id: studentB._id }, { $set: { accountStatus: 'active' } })

  const grantPath = `/api/admin/administrators/${studentA.id}/grant-co-owner`
  const coBody = { currentPassword: password, confirmEmail: studentA.email, confirmed: true }
  equal((await post(grantPath, coToken, coBody)).status, 403, 'Co-Owner cannot grant Co-Owner')
  equal((await post(grantPath, adminToken, coBody)).status, 403, 'Admin cannot grant Co-Owner')
  equal((await post(grantPath, ownerToken, { ...coBody, confirmEmail: studentB.email })).status, 400, 'typed email mismatch')
  equal((await post(grantPath, ownerToken, { ...coBody, currentPassword: 'wrong' })).status, 403, 'Owner password required')
  equal((await post(`/api/admin/administrators/${studentC.id}/grant-co-owner`, ownerToken, { ...coBody, confirmEmail: studentC.email })).status, 409, 'Student cannot directly become Co-Owner')
  equal((await post(`/api/admin/administrators/${owner.id}/grant-co-owner`, ownerToken, { ...coBody, confirmEmail: owner.email })).status, 409, 'Owner self-target rejected')
  equal((await post(grantPath, ownerToken, coBody)).payload.data.user.role, 'co_owner', 'Owner grants Co-Owner')
  await User.updateOne({ _id: studentA._id }, { $set: { accountStatus: 'suspended' } })
  equal((await post(`/api/admin/administrators/${studentA.id}/revoke-co-owner`, ownerToken, coBody)).status,
    409, 'inactive Co-Owner cannot be changed')
  await User.updateOne({ _id: studentA._id }, { $set: { accountStatus: 'active' } })
  equal((await request('/api/admin/administrators', { token: studentToken })).status, 200, 'new Co-Owner team access')
  equal((await post(`/api/admin/administrators/${studentB.id}/grant-co-owner`, studentToken, { ...coBody, confirmEmail: studentB.email })).status, 403, 'new Co-Owner cannot grant peer')

  const revokeCoPath = `/api/admin/administrators/${studentA.id}/revoke-co-owner`
  equal((await post(revokeCoPath, coToken, coBody)).status, 403, 'Co-Owner cannot revoke peer')
  equal((await post(revokeCoPath, studentToken, coBody)).status, 403, 'Co-Owner cannot revoke self')
  equal((await post(revokeCoPath, adminToken, coBody)).status, 403, 'Admin cannot revoke Co-Owner')
  equal((await post(revokeCoPath, ownerToken, { ...coBody, confirmEmail: 'wrong@example.invalid' })).status, 400, 'revoke typed email required')
  equal((await post(revokeCoPath, ownerToken, coBody)).payload.data.user.role, 'admin', 'Owner revokes Co-Owner to Admin')
  equal((await request('/api/admin/ping', { token: studentToken })).status, 200, 'former Co-Owner retains content access')
  equal((await request('/api/admin/administrators', { token: studentToken })).status, 403, 'former Co-Owner loses team access')

  const revokePath = `/api/admin/administrators/${studentA.id}/revoke`
  const revokeBody = { currentPassword: password, confirmed: true }
  equal((await post(revokePath, adminToken, revokeBody)).status, 403, 'Admin cannot revoke Admin')
  equal((await post(revokePath, coToken, revokeBody)).payload.data.user.role, 'student', 'Co-Owner revokes Admin to Student')
  equal((await request('/api/admin/ping', { token: studentToken })).status, 403, 'demoted existing token loses content access')
  equal((await request('/api/student/profile', { token: studentToken })).status, 200, 'demoted account retains Student profile access')
  equal((await StudentProfile.findById(profile._id))?.user.toString(), studentA.id, 'profile preserved after revocation')
  equal((await post(`/api/admin/administrators/${coOwner.id}/revoke`, ownerToken, revokeBody)).status, 409, 'Co-Owner target rejected by Admin revoke')
  equal((await post(`/api/admin/administrators/${owner.id}/revoke`, coToken, revokeBody)).status, 409, 'Owner target rejected by Admin revoke')
  equal((await post(`/api/admin/administrators/${studentB.id}/revoke`, ownerToken, revokeBody)).payload.data.user.role, 'student', 'Owner revokes Admin')

  const concurrent = await Promise.all([
    post(promotePath, ownerToken, { email: studentC.email, currentPassword: password }),
    post(promotePath, coToken, { email: studentC.email, currentPassword: password }),
  ])
  equal(concurrent.filter((item) => item.status === 200).length, 1, 'one concurrent role-change winner')
  equal(concurrent.filter((item) => item.status === 409).length, 1, 'one concurrent role-change loser')
  equal((await User.findById(studentC.id)).role, 'admin', 'concurrent target state consistent')
  const audited = await User.find({ email: new RegExp(`^${prefix}`) }).select('+roleAudit').lean()
  const audit = audited.flatMap((item) => item.roleAudit || [])
  for (const action of ['admin_promoted', 'admin_access_revoked', 'co_owner_granted', 'co_owner_access_revoked']) {
    check(audit.some((item) => item.action === action), `${action} audit persisted`)
  }
  equal(audit.length, 7, 'only successful transitions audited')
  check(!/password|secret|token|authorization|header/i.test(JSON.stringify(audit)), 'audit contains no credentials')
  equal((await request('/api/admin/role-audit', { token: ownerToken })).status, 404, 'audit not publicly exposed as API')
  equal((await request('/api/setup/status')).payload.data.ownerSetupRequired, false, 'setup never reopens')
  const ownerDoc = await User.findById(owner.id).select('+ownerMarker')
  ownerDoc.accountStatus = 'suspended'
  await assert.rejects(ownerDoc.save(), /Owner|owner/i); checks++
  await assert.rejects(User.create({ name: 'Temporary Other Owner', email: `${prefix}-other-owner@example.invalid`, passwordHash: hash, role: 'owner', ownerMarker: 'permanent_owner', accountStatus: 'active' }), /duplicate key/i); checks++
  for (let i = 0; i < 65; i++) await post(promotePath, ownerToken, { email: studentA.email, role: 'owner' })
  equal((await post(promotePath, ownerToken, { email: studentA.email, role: 'owner' })).status, 429, 'role-change throttle')
  process.stdout.write(`Role-management validation passed: ${checks} assertions.\n`)
}

try { await main() } catch (error) {
  process.stderr.write(`Role-management validation failed${error.name === 'AssertionError' ? `: ${error.message}` : ''}.\n`)
  process.exitCode = 1
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState === 1 && mongoose.connection.name !== databaseName) throw new Error('Refusing cleanup outside the isolated role database.')
  await mongoose.disconnect()
  if (process.env.MONGODB_URI?.includes(databaseName)) {
    const cleanup = await mongoose.createConnection(process.env.MONGODB_URI, { autoIndex: false }).asPromise()
    try {
      if (cleanup.name !== databaseName) throw new Error('Refusing cleanup outside the role database.')
      await cleanup.dropDatabase()
      process.stdout.write('Isolated temporary role database removed.\n')
    } finally { await cleanup.close() }
  }
  process.env.MONGODB_URI = originalUri
}
