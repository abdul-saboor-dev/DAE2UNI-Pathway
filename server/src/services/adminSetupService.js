import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import AdminSetupState from '../models/AdminSetupState.js'
import User from '../models/User.js'
import { isWeakAdminSetupSecret } from '../config/environment.js'
import { BCRYPT_ROUNDS, normalizeEmail } from './authService.js'
import ApiError from '../utils/ApiError.js'
import toSafeUser from '../utils/safeUser.js'

const SETUP_ID = 'first-administrator'
const CLAIM_DURATION_MS = 2 * 60 * 1000

export async function isOwnerSetupRequired() {
  const [elevatedAccount, setup] = await Promise.all([
    User.findOne({ role: { $in: ['owner', 'co_owner', 'admin'] } }).select('_id role').lean(),
    AdminSetupState.findById(SETUP_ID).select('state').lean(),
  ])
  if (elevatedAccount && setup?.state !== 'completed') {
    try {
      await AdminSetupState.updateOne({ _id: SETUP_ID }, {
        $set: { state: 'completed', ...(elevatedAccount.role === 'owner' && { owner: elevatedAccount._id }) },
        $unset: { claimId: '', leaseUntil: '' },
      }, { upsert: true })
    } catch (error) {
      if (error.code !== 11000) throw error
      await AdminSetupState.updateOne({ _id: SETUP_ID }, {
        $set: { state: 'completed', ...(elevatedAccount.role === 'owner' && { owner: elevatedAccount._id }) },
        $unset: { claimId: '', leaseUntil: '' },
      })
    }
  }
  return !elevatedAccount && setup?.state !== 'completed'
}

function verifySetupSecret(submitted) {
  const configured = process.env.ADMIN_SETUP_SECRET
  if (!configured || isWeakAdminSetupSecret(configured) || configured === process.env.JWT_SECRET) {
    throw new ApiError(503, 'Administrator setup is not configured on the server.', 'SETUP_NOT_CONFIGURED')
  }
  const actualDigest = createHash('sha256').update(submitted, 'utf8').digest()
  const expectedDigest = createHash('sha256').update(configured, 'utf8').digest()
  if (!timingSafeEqual(actualDigest, expectedDigest)) {
    throw new ApiError(403, 'Administrator setup could not be authorized.', 'SETUP_UNAUTHORIZED')
  }
}

async function claimSetup(claimId) {
  const now = new Date()
  const leaseUntil = new Date(now.getTime() + CLAIM_DURATION_MS)
  try {
    await AdminSetupState.create({ _id: SETUP_ID, state: 'claimed', claimId, leaseUntil })
    return
  } catch (error) {
    if (error.code !== 11000) throw error
  }
  const claim = await AdminSetupState.findOneAndUpdate(
    { _id: SETUP_ID, state: 'claimed', leaseUntil: { $lte: now } },
    { $set: { claimId, leaseUntil } },
    { new: true },
  )
  if (!claim) throw new ApiError(409, 'Administrator setup is unavailable or already completed.', 'SETUP_UNAVAILABLE')
}

export async function createFirstOwner({ name, email, password, setupSecret }) {
  // Every replica performs the check; the singleton claim serializes contenders.
  if (!(await isOwnerSetupRequired())) {
    throw new ApiError(409, 'Owner setup has already been completed.', 'SETUP_COMPLETED')
  }
  verifySetupSecret(setupSecret)
  await User.init() // Ensure the unique bootstrap fence exists, even on a fresh database.
  const claimId = randomUUID()
  await claimSetup(claimId)
  let createdUser
  try {
    if (await User.exists({ role: { $in: ['owner', 'co_owner', 'admin'] } })) {
      await AdminSetupState.updateOne({ _id: SETUP_ID, claimId }, {
        $set: { state: 'completed' }, $unset: { claimId: '', leaseUntil: '' },
      })
      throw new ApiError(409, 'Owner setup has already been completed.', 'SETUP_COMPLETED')
    }
    const normalizedEmail = normalizeEmail(email)
    if (await User.exists({ email: normalizedEmail })) {
      throw new ApiError(409, 'Administrator setup could not be completed.', 'SETUP_CONFLICT')
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    // An expired claimant must not create after a newer claimant takes the lease.
    const ownClaim = await AdminSetupState.exists({ _id: SETUP_ID, state: 'claimed', claimId, leaseUntil: { $gt: new Date() } })
    if (!ownClaim) throw new ApiError(409, 'Administrator setup is unavailable. Please try again.', 'SETUP_UNAVAILABLE')
    createdUser = await User.create({ name, email: normalizedEmail, passwordHash,
      role: 'owner', accountStatus: 'active', ownerMarker: 'permanent_owner' })
    await AdminSetupState.updateOne({ _id: SETUP_ID, claimId }, {
      $set: { state: 'completed', owner: createdUser._id },
      $unset: { claimId: '', leaseUntil: '' },
    })
    return toSafeUser(createdUser)
  } catch (error) {
    if (!createdUser) {
      await AdminSetupState.deleteOne({ _id: SETUP_ID, state: 'claimed', claimId })
    }
    if (error.code === 11000) {
      throw new ApiError(409, 'Administrator setup could not be completed.', 'SETUP_CONFLICT')
    }
    throw error
  }
}
