import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import app from '../src/app.js'
import User from '../src/models/User.js'
import EmailVerificationToken from '../src/models/EmailVerificationToken.js'
import { isValidClientBaseUrl, isValidEmailConfiguration } from '../src/config/environment.js'
import { BCRYPT_ROUNDS } from '../src/services/authService.js'
import { hashVerificationToken } from '../src/services/emailVerificationService.js'

const databaseName = `dae2uni_email_temp_${randomUUID().replaceAll('-', '').slice(0, 24)}`
const originalFetch = globalThis.fetch
const configKeys = ['BREVO_API_KEY', 'EMAIL_FROM_ADDRESS', 'EMAIL_FROM_NAME', 'CLIENT_BASE_URL', 'TURNSTILE_SECRET_KEY', 'TURNSTILE_ALLOWED_HOSTNAMES']
const originalConfig = Object.fromEntries(configKeys.map((key) => [key, process.env[key]]))
const password = 'TemporaryValidation123!'
const emailRoot = `temporary-email-verification-${randomUUID()}@fixture.invalid`
const turnstileSecret = '1x0000000000000000000000000000000AA'
let server
let checks = 0
let deliveryMode = 'success'
const sentLinks = []
const check = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

async function request(path, body) {
  const response = await originalFetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  return { status: response.status, data: await response.json() }
}
const address = (prefix) => `${prefix}-${emailRoot}`
const registration = (prefix, extras = {}) => ({ name: 'Temporary Student', email: address(prefix), password, turnstileToken: 'registration-pass', ...extras })
const verificationToken = () => new URLSearchParams(new URL(sentLinks.at(-1)).hash.slice(1)).get('token')

try {
  process.env.BREVO_API_KEY = 'synthetic-validation-key-1234567890ABCdef'
  process.env.EMAIL_FROM_ADDRESS = 'sender@fixture.invalid'
  process.env.EMAIL_FROM_NAME = 'DAE2UNI Pathway'
  process.env.CLIENT_BASE_URL = 'http://localhost:5173'
  process.env.TURNSTILE_SECRET_KEY = turnstileSecret
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = 'localhost'
  check(isValidEmailConfiguration(), 'local email configuration valid')
  check(!isValidClientBaseUrl('http://localhost:5173', true), 'production rejects HTTP client base')
  check(!isValidClientBaseUrl('https://example.com', true), 'production rejects placeholder client host')
  check(!isValidClientBaseUrl('https://user:pass@fixture.invalid', true), 'client URL rejects embedded credentials')
  check(!isValidClientBaseUrl('javascript:alert(1)', false), 'client URL rejects unsafe protocol')
  check(!isValidEmailConfiguration({ ...process.env, BREVO_API_KEY: 'replace-with-example' }, true), 'production rejects example key')
  check(!isValidEmailConfiguration({ ...process.env, EMAIL_FROM_ADDRESS: 'sender@dae2uni.org', CLIENT_BASE_URL: 'https://dae2uni.org' }, true), 'production rejects synthetic key')
  check(!isValidEmailConfiguration({ ...process.env, EMAIL_FROM_ADDRESS: 'sender@example.com', CLIENT_BASE_URL: 'https://dae2uni.example.org' }, true), 'production rejects placeholder sender')
  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 5000 })
  await Promise.all([User.init(), EmailVerificationToken.init()])

  globalThis.fetch = async (url, options) => {
    if (String(url) === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      const action = options.body.get('response') === 'resend-pass' ? 'email_verification_resend' : 'student_register'
      return new Response(JSON.stringify({ success: true, action, hostname: 'localhost', challenge_ts: new Date().toISOString() }), { status: 200 })
    }
    if (String(url) === 'https://api.brevo.com/v3/smtp/email') {
      equal(options.method, 'POST', 'Brevo receives POST')
      equal(options.headers['api-key'], process.env.BREVO_API_KEY, 'Brevo receives private key')
      const message = JSON.parse(options.body)
      check(message.textContent.includes('DAE2UNI Pathway') && !message.htmlContent, 'plain-text branded email avoids user HTML')
      const link = message.textContent.match(/https?:\/\/[^\s]+/)?.[0]
      check(Boolean(link), 'email contains verification link')
      const parsedLink = new URL(link)
      check(parsedLink.pathname === '/verify-email' && !parsedLink.search && parsedLink.hash.startsWith('#token='), 'email link keeps token in fragment only')
      if (deliveryMode === 'failure') return new Response('{}', { status: 503 })
      sentLinks.push(link)
      return new Response('{}', { status: 201 })
    }
    throw new Error('Unexpected outbound request')
  }
  server = app.listen(0)
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })

  for (const [label, body] of [
    ['missing Turnstile', registration('missing', { turnstileToken: undefined })],
    ['role injection', registration('role', { role: 'owner' })],
    ['unknown field', registration('unknown', { emailVerifiedAt: new Date().toISOString() })],
    ['operator injection', registration('operator', { $set: { role: 'owner' } })],
    ['prototype key', JSON.parse(JSON.stringify(registration('prototype')).replace(/}$/, ',"__proto__":{"role":"owner"}}'))],
  ]) equal((await request('/api/auth/register', body)).status, 400, `${label} rejected`)
  equal(await User.countDocuments({}), 0, 'invalid registration creates no user')

  const registered = await request('/api/auth/register', registration('normal'))
  equal(registered.status, 201, 'student registration succeeds')
  equal(registered.data.data.user.role, 'student', 'registration is student-only')
  check(!('token' in registered.data.data), 'registration never returns JWT')
  const rawToken = verificationToken()
  check(Buffer.from(rawToken, 'base64url').length >= 32, 'verification token has at least 32 random bytes')
  const student = await User.findOne({ email: address('normal') }).select('+passwordHash')
  check(student.emailVerificationRequired === true && !student.emailVerifiedAt, 'new student requires verification')
  check(student.passwordHash.startsWith('$2') && student.passwordHash !== password, 'password stored only as bcrypt hash')
  const tokenRecord = await EmailVerificationToken.findOne({ user: student._id }).select('+tokenHash')
  equal(tokenRecord.tokenHash, hashVerificationToken(rawToken), 'only SHA-256 token hash stored')
  check(!JSON.stringify(tokenRecord.toObject()).includes(rawToken), 'raw token absent from database document')
  check(!JSON.stringify(registered.data).includes(rawToken) && !JSON.stringify(registered.data).includes(password), 'response omits token and password')

  const unverifiedLogin = await request('/api/auth/login', { email: address('normal'), password })
  equal(unverifiedLogin.data.code, 'EMAIL_VERIFICATION_REQUIRED', 'correct password reveals verification requirement')
  check(!('token' in (unverifiedLogin.data.data || {})), 'unverified login issues no JWT')
  equal((await request('/api/auth/login', { email: address('normal'), password: 'wrong' })).data.code, 'INVALID_CREDENTIALS', 'wrong password stays generic')
  equal((await request('/api/auth/login', { email: address('absent'), password })).data.code, 'INVALID_CREDENTIALS', 'unknown email stays generic')
  equal((await request('/api/auth/verify-email', { token: 'X'.repeat(43) })).status, 400, 'invalid token rejected')
  equal((await request('/api/auth/verify-email', { token: rawToken, role: 'owner' })).status, 400, 'verify unknown field rejected')
  equal((await request('/api/auth/verify-email', { token: { $ne: null } })).status, 400, 'verify operator rejected')
  await EmailVerificationToken.updateOne({ user: student._id }, { $set: { expiresAt: new Date(Date.now() - 1) } })
  equal((await request('/api/auth/verify-email', { token: rawToken })).data.code, 'EMAIL_VERIFICATION_INVALID', 'expired token rejected')
  await EmailVerificationToken.updateOne({ user: student._id }, { $set: { expiresAt: new Date(Date.now() + 60_000) } })
  const concurrent = await Promise.all([request('/api/auth/verify-email', { token: rawToken }), request('/api/auth/verify-email', { token: rawToken })])
  equal(concurrent.filter((result) => result.status === 200).length, 1, 'concurrent token consumption allows exactly one success')
  equal((await request('/api/auth/verify-email', { token: rawToken })).data.code, 'EMAIL_VERIFICATION_INVALID', 'consumed token cannot be reused')
  const verified = await User.findById(student._id)
  check(verified.emailVerificationRequired === false && verified.emailVerifiedAt instanceof Date, 'verification persisted on user')
  equal((await request('/api/auth/login', { email: address('normal'), password })).status, 200, 'verified student logs in')

  const legacy = await User.create({ name: 'Temporary Legacy', email: address('legacy'), passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), role: 'student' })
  equal((await request('/api/auth/login', { email: legacy.email, password })).status, 200, 'legacy student remains usable')

  equal((await request('/api/auth/register', registration('resend'))).status, 201, 'resend fixture registered')
  const firstLink = verificationToken()
  const sentBeforeCooldown = sentLinks.length
  const resendBody = { email: address('resend'), turnstileToken: 'resend-pass' }
  const cooldown = await request('/api/auth/resend-verification', resendBody)
  equal(cooldown.status, 200, 'cooldown response stays successful and generic')
  equal(sentLinks.length, sentBeforeCooldown, 'database cooldown prevents immediate second email')
  await EmailVerificationToken.updateOne({ user: (await User.findOne({ email: address('resend') }))._id }, { $set: { lastAttemptAt: new Date(Date.now() - 61_000) } })
  equal((await request('/api/auth/resend-verification', resendBody)).status, 200, 'resend after cooldown accepted')
  const replacementToken = verificationToken()
  check(replacementToken !== firstLink, 'resend rotates token')
  equal((await request('/api/auth/verify-email', { token: firstLink })).status, 400, 'resend invalidates old token')
  equal((await request('/api/auth/verify-email', { token: replacementToken })).status, 200, 'replacement token verifies account')
  const unknownResend = await request('/api/auth/resend-verification', { email: address('absent'), turnstileToken: 'resend-pass' })
  const verifiedResend = await request('/api/auth/resend-verification', resendBody)
  equal(unknownResend.data.data.message, verifiedResend.data.data.message, 'resend resists account enumeration')
  equal((await request('/api/auth/resend-verification', { ...resendBody, role: 'admin' })).status, 400, 'resend unknown field rejected')
  equal((await request('/api/auth/resend-verification', { email: { $ne: null }, turnstileToken: 'resend-pass' })).status, 400, 'resend operator rejected')

  deliveryMode = 'failure'
  const failedDelivery = await request('/api/auth/register', registration('delivery-failure'))
  equal(failedDelivery.data.code, 'EMAIL_DELIVERY_UNAVAILABLE', 'delivery failure returns safe retryable code')
  const failedUser = await User.findOne({ email: address('delivery-failure') })
  check(failedUser?.emailVerificationRequired === true, 'delivery failure retains unverified account')
  equal((await request('/api/auth/register', registration('delivery-failure'))).status, 409, 'repeated registration cannot create duplicate user')
  deliveryMode = 'success'
  await EmailVerificationToken.updateOne({ user: failedUser._id }, { $set: { lastAttemptAt: new Date(Date.now() - 61_000) } })
  equal((await request('/api/auth/resend-verification', { email: failedUser.email, turnstileToken: 'resend-pass' })).status, 200, 'failed delivery can be retried through resend')
  equal((await request('/api/auth/verify-email', { token: verificationToken() })).status, 200, 'retried delivery token works')
  check(!JSON.stringify(failedDelivery.data).includes(process.env.BREVO_API_KEY), 'provider secret absent from error')
  process.stdout.write(`Email verification backend validation passed: ${checks} assertions.\n`)
} catch (error) {
  process.stderr.write(`Email verification backend validation failed: ${error instanceof assert.AssertionError ? error.message : error.name}.\n`)
  process.stderr.write(`${String(error.stack || '').split('\n').slice(1, 4).join('\n')}\n`)
  process.exitCode = 1
} finally {
  globalThis.fetch = originalFetch
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName) {
    await mongoose.connection.dropDatabase()
    process.stdout.write('Isolated email-verification test database removed.\n')
  }
  await mongoose.disconnect()
  for (const [key, value] of Object.entries(originalConfig)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}
