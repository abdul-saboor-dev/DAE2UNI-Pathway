import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import PasswordResetToken from '../models/PasswordResetToken.js'
import User from '../models/User.js'
import ApiError from '../utils/ApiError.js'
import { BCRYPT_ROUNDS, normalizeEmail } from './authService.js'
import { sendPasswordResetEmail } from './emailDeliveryService.js'

export const PASSWORD_RESET_GENERIC_MESSAGE = 'If an eligible account exists for this email, a reset message has been sent.'
export const PASSWORD_RESET_TOKEN_LIFETIME_MS = 30 * 60 * 1000
const COOLDOWN_MS = 60 * 1000
const WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 5
const PURGE_AFTER_MS = 48 * 60 * 60 * 1000
const INVALID_RESET_MESSAGE = 'This password reset link is invalid or has expired. Request a new link.'

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex')
}

function isRecoveryEligible(user) {
  return Boolean(user && user.accountStatus === 'active' &&
    (user.role !== 'student' || user.emailVerificationRequired !== true))
}

async function claimRequestWindow(emailHash, now) {
  const cooldownCutoff = new Date(now.getTime() - COOLDOWN_MS)
  const windowCutoff = new Date(now.getTime() - WINDOW_MS)
  try {
    return await PasswordResetToken.findOneAndUpdate({
      emailHash,
      $and: [
        { $or: [{ lastAttemptAt: { $lte: cooldownCutoff } }, { lastAttemptAt: { $exists: false } }] },
        { $or: [{ windowStartedAt: { $lte: windowCutoff } }, { requestCount: { $lt: MAX_REQUESTS_PER_WINDOW } }, { windowStartedAt: { $exists: false } }] },
      ],
    }, [{
      $set: {
        emailHash,
        lastAttemptAt: now,
        windowStartedAt: {
          $cond: [
            { $or: [{ $eq: [{ $type: '$windowStartedAt' }, 'missing'] }, { $lte: ['$windowStartedAt', windowCutoff] }] },
            now,
            '$windowStartedAt',
          ],
        },
        requestCount: {
          $cond: [
            { $or: [{ $eq: [{ $type: '$windowStartedAt' }, 'missing'] }, { $lte: ['$windowStartedAt', windowCutoff] }] },
            1,
            { $add: [{ $ifNull: ['$requestCount', 0] }, 1] },
          ],
        },
        purgeAt: new Date(now.getTime() + PURGE_AFTER_MS),
        user: '$$REMOVE',
        tokenHash: '$$REMOVE',
        expiresAt: '$$REMOVE',
        sentAt: '$$REMOVE',
        consumedAt: '$$REMOVE',
      },
    }], { new: true, upsert: true })
  } catch (error) {
    if (error?.code === 11000) return null
    throw error
  }
}

export async function requestPasswordReset(email, { sendEmail = sendPasswordResetEmail } = {}) {
  const normalizedEmail = normalizeEmail(email)
  const emailHash = hashValue(normalizedEmail)
  const now = new Date()
  const claim = await claimRequestWindow(emailHash, now)
  if (!claim) return PASSWORD_RESET_GENERIC_MESSAGE

  const user = await User.findOne({ email: normalizedEmail })
  if (!isRecoveryEligible(user)) {
    await PasswordResetToken.updateOne({ _id: claim._id }, {
      $unset: { user: 1, tokenHash: 1, expiresAt: 1, sentAt: 1, consumedAt: 1 },
    })
    return PASSWORD_RESET_GENERIC_MESSAGE
  }

  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = hashValue(rawToken)
  await PasswordResetToken.updateOne({ _id: claim._id, lastAttemptAt: now }, {
    $set: {
      user: user._id,
      tokenHash,
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_TOKEN_LIFETIME_MS),
      sentAt: now,
    },
    $unset: { consumedAt: 1 },
  })
  try {
    await sendEmail({ email: user.email, name: user.name, token: rawToken })
  } catch (error) {
    // Only a definite provider rejection or pre-send configuration failure
    // proves that the message was not accepted. Network/timeout failures are
    // ambiguous, so retaining the unknowable token is safer than invalidating
    // a link Brevo may already have delivered.
    if (error?.code !== 'PASSWORD_RESET_DELIVERY_UNCERTAIN') {
      await PasswordResetToken.updateOne({ _id: claim._id, tokenHash }, {
        $unset: { tokenHash: 1, expiresAt: 1, sentAt: 1 },
      })
    }
  }
  return PASSWORD_RESET_GENERIC_MESSAGE
}

export async function resetPassword(rawToken, password) {
  if (typeof rawToken !== 'string' || rawToken.length !== 43 || !/^[A-Za-z0-9_-]+$/.test(rawToken)) {
    throw new ApiError(400, INVALID_RESET_MESSAGE, 'PASSWORD_RESET_INVALID')
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const now = new Date()
  const record = await PasswordResetToken.findOneAndUpdate({
    tokenHash: hashValue(rawToken),
    sentAt: { $type: 'date' },
    consumedAt: { $exists: false },
    expiresAt: { $gt: now },
  }, { $set: { consumedAt: now, purgeAt: new Date(now.getTime() + PURGE_AFTER_MS) } }, { new: true })

  if (!record?.user) throw new ApiError(400, INVALID_RESET_MESSAGE, 'PASSWORD_RESET_INVALID')

  const result = await User.updateOne({
    _id: record.user,
    accountStatus: 'active',
    $or: [{ role: { $ne: 'student' } }, { emailVerificationRequired: { $ne: true } }],
  }, { $set: { passwordHash }, $inc: { authVersion: 1 } }, { runValidators: true })

  if (result.modifiedCount !== 1) {
    throw new ApiError(400, INVALID_RESET_MESSAGE, 'PASSWORD_RESET_INVALID')
  }
  await PasswordResetToken.updateMany({ user: record.user, _id: { $ne: record._id }, consumedAt: { $exists: false } }, {
    $set: { consumedAt: now, purgeAt: new Date(now.getTime() + PURGE_AFTER_MS) },
  })
  return 'Password reset complete. You can now sign in.'
}
