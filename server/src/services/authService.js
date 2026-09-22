import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import ApiError from '../utils/ApiError.js'
import { signAccessToken } from '../utils/jwt.js'
import toSafeUser from '../utils/safeUser.js'

const BCRYPT_ROUNDS = 12
const INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect.'
const dummyPasswordHash = bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_ROUNDS)

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

export async function registerStudent({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email)
  const existingUser = await User.exists({ email: normalizedEmail })

  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_IN_USE')
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'student',
    accountStatus: 'active',
  })

  return toSafeUser(user)
}

export async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email)
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash')
  const comparisonHash = user?.passwordHash || (await dummyPasswordHash)
  const passwordMatches = await bcrypt.compare(password, comparisonHash)

  if (!user || !passwordMatches) {
    throw new ApiError(401, INVALID_CREDENTIALS_MESSAGE, 'INVALID_CREDENTIALS')
  }
  if (user.accountStatus !== 'active') {
    throw new ApiError(403, 'This account is not active.', 'ACCOUNT_DISABLED')
  }

  user.lastLoginAt = new Date()
  await user.save({ validateModifiedOnly: true })

  return {
    token: signAccessToken(user),
    user: toSafeUser(user),
  }
}
