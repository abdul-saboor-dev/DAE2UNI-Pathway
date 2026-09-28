import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import app from '../src/app.js'
import PasswordResetToken from '../src/models/PasswordResetToken.js'
import StudentProfile from '../src/models/StudentProfile.js'
import User from '../src/models/User.js'
import { BCRYPT_ROUNDS } from '../src/services/authService.js'

const databaseName = `dae2uni_password_recovery_temp_${randomUUID().replaceAll('-', '').slice(0, 20)}`
const originalFetch = globalThis.fetch
const configKeys = ['BREVO_API_KEY', 'EMAIL_FROM_ADDRESS', 'EMAIL_FROM_NAME', 'CLIENT_BASE_URL', 'TURNSTILE_SECRET_KEY', 'TURNSTILE_ALLOWED_HOSTNAMES']
const originalConfig = Object.fromEntries(configKeys.map((key) => [key, process.env[key]]))
const oldPassword = 'TemporaryOld123!'
const newPassword = 'TemporaryNew456!'
const root = randomUUID()
let server
let checks = 0
let deliveryMode = 'accepted'
const deliveries = []
const check = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }
const email = (name) => `temporary-password-${name}-${root}@fixture.invalid`

async function request(path, body, token) {
  const response = await originalFetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  return { status: response.status, data: await response.json() }
}

function latestToken(targetEmail) {
  const message = deliveries.findLast((item) => item.email === targetEmail)
  return new URLSearchParams(new URL(message.link).hash.slice(1)).get('token')
}

try {
  Object.assign(process.env, {
    BREVO_API_KEY: 'synthetic-validation-key-1234567890ABCdef',
    EMAIL_FROM_ADDRESS: 'sender@fixture.invalid',
    EMAIL_FROM_NAME: 'DAE2UNI Pathway',
    CLIENT_BASE_URL: 'http://localhost:5173',
    TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
    TURNSTILE_ALLOWED_HOSTNAMES: 'localhost',
  })
  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 5000 })
  await Promise.all([User.init(), StudentProfile.init(), PasswordResetToken.init()])

  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/turnstile/v0/siteverify')) {
      const responseToken = options.body.get('response')
      const action = responseToken === 'wrong-action' ? 'student_register' : 'password_reset_request'
      const success = responseToken !== 'rejected'
      return new Response(JSON.stringify({ success, action, hostname: 'localhost', challenge_ts: new Date().toISOString() }), { status: 200 })
    }
    if (String(url).includes('/v3/smtp/email')) {
      const body = JSON.parse(options.body)
      const link = body.textContent.match(/https?:\/\/[^\s]+/)?.[0]
      check(body.subject.includes('Reset') && !body.htmlContent, 'recovery email is branded plain text')
      check(new URL(link).pathname === '/reset-password' && !new URL(link).search && new URL(link).hash.startsWith('#token='), 'reset token is fragment-only')
      if (deliveryMode === 'rejected') return new Response(JSON.stringify({ code: 'invalid_parameter' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      deliveries.push({ email: body.to[0].email, link })
      if (deliveryMode === 'uncertain') throw new TypeError('Synthetic acknowledgement loss')
      return new Response(JSON.stringify({ messageId: '<synthetic-message-id@fixture.invalid>' }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }
    throw new Error('Unexpected outbound request')
  }
  server = app.listen(0)
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })

  const passwordHash = await bcrypt.hash(oldPassword, BCRYPT_ROUNDS)
  const student = await User.create({ name: 'Temporary Student', email: email('student'), passwordHash, role: 'student', accountStatus: 'active', emailVerificationRequired: false, emailVerifiedAt: new Date() })
  const profile = await StudentProfile.create({ user: student._id, profileStatus: 'draft', dae: {}, domicile: {} })
  const admin = await User.create({ name: 'Temporary Admin', email: email('admin'), passwordHash, role: 'admin', accountStatus: 'active' })
  const coOwner = await User.create({ name: 'Temporary Co Owner', email: email('coowner'), passwordHash, role: 'co_owner', accountStatus: 'active' })
  const owner = await User.create({ name: 'Temporary Owner', email: email('owner'), passwordHash, role: 'owner', accountStatus: 'active', ownerMarker: 'permanent_owner' })
  const unverified = await User.create({ name: 'Temporary Unverified', email: email('unverified'), passwordHash, role: 'student', accountStatus: 'active', emailVerificationRequired: true })
  const inactive = await User.create({ name: 'Temporary Inactive', email: email('inactive'), passwordHash, role: 'student', accountStatus: 'suspended', emailVerificationRequired: false })

  for (const body of [
    { email: student.email },
    { email: student.email, turnstileToken: 'forgot-pass', role: 'owner' },
    { email: { $ne: null }, turnstileToken: 'forgot-pass' },
    JSON.parse(`{"email":"${student.email}","turnstileToken":"forgot-pass","__proto__":{"role":"owner"}}`),
  ]) equal((await request('/api/auth/forgot-password', body)).status, 400, 'strict forgot-password body rejected')
  equal(deliveries.length, 0, 'invalid forgot requests send no email')

  const unknown = await request('/api/auth/forgot-password', { email: email('missing'), turnstileToken: 'forgot-pass' })
  const unverifiedResult = await request('/api/auth/forgot-password', { email: unverified.email, turnstileToken: 'forgot-pass' })
  const inactiveResult = await request('/api/auth/forgot-password', { email: inactive.email, turnstileToken: 'forgot-pass' })
  equal(unknown.data.data.message, unverifiedResult.data.data.message, 'unknown and unverified responses match')
  equal(unknown.data.data.message, inactiveResult.data.data.message, 'unknown and inactive responses match')
  equal(deliveries.length, 0, 'ineligible accounts receive no recovery email')
  equal((await request('/api/auth/forgot-password', { email: student.email, turnstileToken: 'wrong-action' })).data.code, 'HUMAN_VERIFICATION_FAILED', 'distinct Turnstile action enforced')
  equal(deliveries.length, 0, 'Turnstile failure sends no email')

  const oldLogin = await request('/api/auth/login', { email: student.email, password: oldPassword })
  equal(oldLogin.status, 200, 'verified student can log in before reset')
  const forgot = await request('/api/auth/forgot-password', { email: student.email, turnstileToken: 'forgot-pass' })
  equal(forgot.status, 200, 'eligible recovery request succeeds generically')
  const rawToken = latestToken(student.email)
  check(Buffer.from(rawToken, 'base64url').length >= 32, 'reset token has at least 32 random bytes')
  const record = await PasswordResetToken.findOne({ user: student._id }).select('+tokenHash +emailHash')
  equal(record.tokenHash, createHash('sha256').update(rawToken).digest('hex'), 'only reset token hash is stored')
  check(!JSON.stringify(record.toObject()).includes(rawToken), 'raw reset token is absent from database document')
  check(!JSON.stringify(forgot.data).includes(rawToken) && !JSON.stringify(forgot.data).includes(process.env.BREVO_API_KEY), 'response leaks no token or provider secret')

  equal((await request('/api/auth/reset-password', { token: 'malformed', password: newPassword })).data.code, 'PASSWORD_RESET_INVALID', 'malformed token uses safe reset error')
  equal((await request('/api/auth/reset-password', { token: rawToken, password: 'weak' })).status, 400, 'weak password rejected')
  equal((await request('/api/auth/reset-password', { token: { $ne: null }, password: newPassword })).status, 400, 'reset operator rejected')
  equal((await request('/api/auth/reset-password', { token: rawToken, password: newPassword, role: 'owner' })).status, 400, 'reset unknown field rejected')

  await PasswordResetToken.updateOne({ _id: record._id }, { $set: { expiresAt: new Date(Date.now() - 1) } })
  equal((await request('/api/auth/reset-password', { token: rawToken, password: newPassword })).data.code, 'PASSWORD_RESET_INVALID', 'expired reset token rejected')
  await PasswordResetToken.updateOne({ _id: record._id }, { $set: { expiresAt: new Date(Date.now() + 60_000) } })
  const concurrent = await Promise.all([
    request('/api/auth/reset-password', { token: rawToken, password: newPassword }),
    request('/api/auth/reset-password', { token: rawToken, password: newPassword }),
  ])
  equal(concurrent.filter((item) => item.status === 200).length, 1, 'concurrent reset consumes token once')
  equal((await request('/api/auth/reset-password', { token: rawToken, password: newPassword })).data.code, 'PASSWORD_RESET_INVALID', 'used token is rejected')
  equal((await request('/api/auth/login', { email: student.email, password: oldPassword })).data.code, 'INVALID_CREDENTIALS', 'old password no longer works')
  equal((await request('/api/auth/login', { email: student.email, password: newPassword })).status, 200, 'new password works')
  const oldSession = await originalFetch(`http://127.0.0.1:${server.address().port}/api/auth/me`, { headers: { Authorization: `Bearer ${oldLogin.data.data.token}` } })
  equal(oldSession.status, 401, 'pre-reset JWT is revoked by database auth version')
  check(Boolean(await StudentProfile.exists({ _id: profile._id, user: student._id })), 'student profile survives reset')
  const preserved = await User.findById(student._id).select('+authVersion')
  check(preserved.role === 'student' && preserved.accountStatus === 'active' && preserved.emailVerificationRequired === false && preserved.authVersion === 1, 'identity and verification state preserved while auth version increments')

  for (const elevated of [admin, coOwner, owner]) {
    equal((await request('/api/auth/forgot-password', { email: elevated.email, turnstileToken: 'forgot-pass' })).status, 200, `${elevated.role} may request recovery`)
    check(Boolean(latestToken(elevated.email)), `${elevated.role} receives a reset token`)
  }
  equal((await request('/api/auth/reset-password', { token: latestToken(owner.email), password: newPassword })).status, 200, 'Owner password recovery succeeds')
  const recoveredOwner = await User.findById(owner._id).select('+ownerMarker +authVersion')
  check(recoveredOwner.role === 'owner' && recoveredOwner.accountStatus === 'active' && recoveredOwner.ownerMarker === 'permanent_owner' && recoveredOwner.authVersion === 1, 'Owner role, status, and protected marker survive recovery')

  const firstAdminToken = latestToken(admin.email)
  await PasswordResetToken.updateOne({ user: admin._id }, { $set: { lastAttemptAt: new Date(Date.now() - 61_000) } })
  await request('/api/auth/forgot-password', { email: admin.email, turnstileToken: 'forgot-pass' })
  check(latestToken(admin.email) !== firstAdminToken, 'new request rotates the active reset token')
  equal((await request('/api/auth/reset-password', { token: firstAdminToken, password: newPassword })).data.code, 'PASSWORD_RESET_INVALID', 'rotated reset token invalidates its predecessor')

  const cooldownEmail = admin.email
  const deliveryCount = deliveries.filter((item) => item.email === cooldownEmail).length
  equal((await request('/api/auth/forgot-password', { email: cooldownEmail, turnstileToken: 'forgot-pass' })).status, 200, 'cooldown remains generic')
  equal(deliveries.filter((item) => item.email === cooldownEmail).length, deliveryCount, 'one-minute database cooldown prevents another email')

  const rateUser = await User.create({ name: 'Temporary Rate Limit', email: email('rate'), passwordHash, role: 'student', accountStatus: 'active', emailVerificationRequired: false })
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) await PasswordResetToken.updateOne({ user: rateUser._id }, { $set: { lastAttemptAt: new Date(Date.now() - 61_000) } })
    await request('/api/auth/forgot-password', { email: rateUser.email, turnstileToken: 'forgot-pass' })
  }
  const rateDeliveries = deliveries.filter((item) => item.email === rateUser.email).length
  await PasswordResetToken.updateOne({ user: rateUser._id }, { $set: { lastAttemptAt: new Date(Date.now() - 61_000) } })
  equal((await request('/api/auth/forgot-password', { email: rateUser.email, turnstileToken: 'forgot-pass' })).status, 200, 'hourly throttle stays generic')
  equal(deliveries.filter((item) => item.email === rateUser.email).length, rateDeliveries, 'database window limits recovery email to five per hour')

  deliveryMode = 'rejected'
  const failureUser = await User.create({ name: 'Temporary Delivery Failure', email: email('delivery'), passwordHash, role: 'student', accountStatus: 'active', emailVerificationRequired: false })
  const providerFailure = await request('/api/auth/forgot-password', { email: failureUser.email, turnstileToken: 'forgot-pass' })
  equal(providerFailure.data.data.message, unknown.data.data.message, 'provider failure remains enumeration-resistant')
  const failedRecord = await PasswordResetToken.findOne({ user: failureUser._id }).select('+tokenHash')
  check(!failedRecord?.tokenHash && !failedRecord?.sentAt, 'provider failure leaves no usable token')
  deliveryMode = 'uncertain'
  const uncertainUser = await User.create({ name: 'Temporary Ambiguous Delivery', email: email('ambiguous'), passwordHash, role: 'student', accountStatus: 'active', emailVerificationRequired: false })
  const uncertainResponse = await request('/api/auth/forgot-password', { email: uncertainUser.email, turnstileToken: 'forgot-pass' })
  equal(uncertainResponse.data.data.message, unknown.data.data.message, 'ambiguous acknowledgement remains enumeration-resistant')
  const uncertainRecord = await PasswordResetToken.findOne({ user: uncertainUser._id }).select('+tokenHash')
  check(Boolean(uncertainRecord?.tokenHash && uncertainRecord?.sentAt), 'ambiguous post-acceptance acknowledgement retains usable token')
  const uncertainToken = latestToken(uncertainUser.email)
  equal((await request('/api/auth/reset-password', { token: uncertainToken, password: newPassword })).status, 200, 'possibly accepted delivery token remains usable')
  equal((await request('/api/auth/reset-password', { token: uncertainToken, password: oldPassword })).data.code, 'PASSWORD_RESET_INVALID', 'ambiguous delivery token remains single-use')
  deliveryMode = 'accepted'

  process.stdout.write(`Password recovery backend validation passed: ${checks} assertions.\n`)
} catch (error) {
  process.stderr.write(`Password recovery backend validation failed: ${error instanceof assert.AssertionError ? error.message : error.name}.\n`)
  process.stderr.write(`${String(error.stack || '').split('\n').slice(1, 5).join('\n')}\n`)
  process.exitCode = 1
} finally {
  globalThis.fetch = originalFetch
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName) {
    await mongoose.connection.dropDatabase()
    process.stdout.write('Isolated password-recovery test database removed.\n')
  }
  await mongoose.disconnect()
  for (const [key, value] of Object.entries(originalConfig)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}
