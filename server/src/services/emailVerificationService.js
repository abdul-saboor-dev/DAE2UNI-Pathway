import { createHash, randomBytes } from 'node:crypto'
import EmailVerificationToken from '../models/EmailVerificationToken.js'
import User from '../models/User.js'
import ApiError from '../utils/ApiError.js'
import { isValidEmailConfiguration } from '../config/environment.js'
import { sendVerificationEmail } from './emailDeliveryService.js'

export const VERIFICATION_LIFETIME_MS = 30 * 60 * 1000
export const RESEND_COOLDOWN_MS = 60 * 1000
export const RESEND_WINDOW_MS = 60 * 60 * 1000
export const MAX_SENDS_PER_WINDOW = 5
const PURGE_AFTER_MS = 48 * 60 * 60 * 1000
const GENERIC_RESEND_MESSAGE = 'If an unverified account exists for this email, a verification message has been sent.'

export function hashVerificationToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function createVerificationToken() {
  return randomBytes(32).toString('base64url')
}

export function ensureDeliveryConfigured() {
  if (!isValidEmailConfiguration()) {
    throw new ApiError(503, 'Email verification is temporarily unavailable.', 'EMAIL_VERIFICATION_UNAVAILABLE')
  }
}

export async function sendInitialVerification(user) {
  ensureDeliveryConfigured()
  const rawToken = createVerificationToken()
  const now = new Date()
  const record = await EmailVerificationToken.create({
    user: user._id, tokenHash: hashVerificationToken(rawToken),
    expiresAt: new Date(now.getTime() + VERIFICATION_LIFETIME_MS),
    lastAttemptAt: now, windowStartedAt: now, sendCount: 1,
    purgeAt: new Date(now.getTime() + PURGE_AFTER_MS),
  })
  await sendVerificationEmail({ email: user.email, token: rawToken })
  await EmailVerificationToken.updateOne({ _id: record._id, tokenHash: hashVerificationToken(rawToken) }, { $set: { sentAt: new Date() } })
}

export async function verifyStudentEmail(rawToken) {
  const now = new Date()
  const record = await EmailVerificationToken.findOneAndUpdate(
    { tokenHash: hashVerificationToken(rawToken), consumedAt: null, sentAt: { $ne: null }, expiresAt: { $gt: now } },
    { $set: { consumedAt: now } }, { new: true },
  )
  if (!record) throw new ApiError(400, 'Verification link is invalid or expired. Request a new one.', 'EMAIL_VERIFICATION_INVALID')
  const result = await User.updateOne(
    { _id: record.user, role: 'student', emailVerificationRequired: true },
    { $set: { emailVerificationRequired: false, emailVerifiedAt: now } },
  )
  if (!result.modifiedCount) throw new ApiError(400, 'Verification link is invalid or expired. Request a new one.', 'EMAIL_VERIFICATION_INVALID')
  await EmailVerificationToken.updateMany({ user: record.user, consumedAt: null }, { $set: { consumedAt: now } })
}

export async function resendStudentVerification(email) {
  ensureDeliveryConfigured()
  const user = await User.findOne({ email })
  if (!user || user.role !== 'student' || user.accountStatus !== 'active' || user.emailVerificationRequired !== true) {
    return GENERIC_RESEND_MESSAGE
  }
  const previous = await EmailVerificationToken.findOne({ user: user._id }).select('+tokenHash')
  const now = new Date()
  if (previous && (now - previous.lastAttemptAt < RESEND_COOLDOWN_MS ||
    (now - previous.windowStartedAt < RESEND_WINDOW_MS && previous.sendCount >= MAX_SENDS_PER_WINDOW))) {
    return GENERIC_RESEND_MESSAGE
  }
  const rawToken = createVerificationToken()
  const tokenHash = hashVerificationToken(rawToken)
  const freshWindow = !previous || now - previous.windowStartedAt >= RESEND_WINDOW_MS
  try {
    if (previous) {
      const replaced = await EmailVerificationToken.findOneAndUpdate(
        { _id: previous._id, tokenHash: previous.tokenHash },
        { $set: { tokenHash, expiresAt: new Date(now.getTime() + VERIFICATION_LIFETIME_MS),
          sentAt: null, consumedAt: null, lastAttemptAt: now, windowStartedAt: freshWindow ? now : previous.windowStartedAt,
          sendCount: freshWindow ? 1 : previous.sendCount + 1, purgeAt: new Date(now.getTime() + PURGE_AFTER_MS) } },
        { new: true, runValidators: true },
      )
      if (!replaced) return GENERIC_RESEND_MESSAGE
    } else {
      await EmailVerificationToken.create({ user: user._id, tokenHash,
        expiresAt: new Date(now.getTime() + VERIFICATION_LIFETIME_MS),
        lastAttemptAt: now, windowStartedAt: now, sendCount: 1,
        purgeAt: new Date(now.getTime() + PURGE_AFTER_MS) })
    }
  } catch (error) {
    if (error.code === 11000) return GENERIC_RESEND_MESSAGE
    throw error
  }
  // A concurrent verification may have completed after the optimistic claim.
  if (await User.exists({ _id: user._id, emailVerificationRequired: true, accountStatus: 'active' })) {
    try {
      await sendVerificationEmail({ email: user.email, token: rawToken })
      await EmailVerificationToken.updateOne({ user: user._id, tokenHash }, { $set: { sentAt: new Date() } })
    } catch {
      // Do not expose provider status or account existence through public resend.
    }
  }
  return GENERIC_RESEND_MESSAGE
}
