import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import app from '../src/app.js'
import User from '../src/models/User.js'
import validateEnvironment, { isInvalidTurnstileSecret } from '../src/config/environment.js'
import { verifyTurnstile } from '../src/services/turnstileService.js'

const databaseName = `dae2uni_turnstile_temp_${randomUUID().replaceAll('-', '')}`
const originalSecret = process.env.TURNSTILE_SECRET_KEY
const originalHostnames = process.env.TURNSTILE_ALLOWED_HOSTNAMES
const originalNodeEnv = process.env.NODE_ENV
const originalFetch = globalThis.fetch
const secret = '1x0000000000000000000000000000000AA' // Official Cloudflare test secret, never valid in production.
const token = 'XXXX.DUMMY.TOKEN.XXXX'
const password = 'TemporaryTest123!'
const email = `temporary-turnstile-${randomUUID()}@example.invalid`
let server
let checks = 0
let siteverifyMode = 'valid'
const check = (condition, label) => { assert.ok(condition, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }
const fakeResponse = (value) => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } })
const body = (suffix, overrides = {}) => ({ name: 'Temporary Turnstile Student', email: `${suffix}-${email}`, password, turnstileToken: token, ...overrides })

async function post(baseUrl, data) {
  const response = await originalFetch(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  })
  return { status: response.status, data: await response.json() }
}

try {
  validateEnvironment()
  check(isInvalidTurnstileSecret(undefined, true), 'production rejects missing secret')
  check(isInvalidTurnstileSecret('replace-with-cloudflare-turnstile-secret', true), 'production rejects placeholder')
  check(isInvalidTurnstileSecret(secret, true), 'production rejects official test secret')
  check(isInvalidTurnstileSecret('A'.repeat(40), true), 'production rejects low-variety secret')
  check(!isInvalidTurnstileSecret(secret, false), 'local testing accepts official test secret')
  process.env.NODE_ENV = 'production'
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = 'example.com'
  delete process.env.TURNSTILE_SECRET_KEY
  assert.throws(validateEnvironment, /TURNSTILE_SECRET_KEY/); checks += 1
  process.env.TURNSTILE_SECRET_KEY = secret
  assert.throws(validateEnvironment, /TURNSTILE_SECRET_KEY/); checks += 1
  process.env.TURNSTILE_SECRET_KEY = 'replace-with-cloudflare-turnstile-secret'
  assert.throws(validateEnvironment, /TURNSTILE_SECRET_KEY/); checks += 1
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv
  process.env.TURNSTILE_SECRET_KEY = secret
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = 'localhost'
  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 5000 })
  globalThis.fetch = async (url, options) => {
    if (String(url) !== 'https://challenges.cloudflare.com/turnstile/v0/siteverify') throw new Error('Unexpected outbound request')
    equal(options.method, 'POST', 'Siteverify uses POST')
    equal(options.body.get('secret'), secret, 'Siteverify receives configured test secret')
    equal(options.body.get('response'), token, 'Siteverify receives bounded token')
    if (siteverifyMode === 'network') throw new Error('Synthetic network failure')
    if (siteverifyMode === 'timeout') return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Synthetic abort')), { once: true }))
    if (siteverifyMode === 'malformed') return fakeResponse({ success: true })
    if (siteverifyMode === 'timestamp') return fakeResponse({ success: true, action: 'student_register', hostname: 'localhost' })
    if (siteverifyMode === 'action') return fakeResponse({ success: true, action: 'other_action', hostname: 'localhost', challenge_ts: new Date().toISOString() })
    if (siteverifyMode === 'hostname') return fakeResponse({ success: true, action: 'student_register', hostname: 'untrusted.invalid', challenge_ts: new Date().toISOString() })
    if (siteverifyMode === 'invalid' || siteverifyMode === 'expired') return fakeResponse({ success: false, 'error-codes': ['timeout-or-duplicate'] })
    return fakeResponse({ success: true, action: 'student_register', hostname: 'localhost', challenge_ts: new Date().toISOString() })
  }
  server = app.listen(0)
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })
  const baseUrl = `http://127.0.0.1:${server.address().port}`

  for (const [label, payload] of [
    ['missing token', body('missing', { turnstileToken: undefined })],
    ['empty token', body('empty', { turnstileToken: '' })],
    ['oversized token', body('oversized', { turnstileToken: 'x'.repeat(2049) })],
    ['unknown field', body('unknown', { role: 'owner' })],
    ['operator field', body('operator', { $set: { role: 'owner' } })],
    ['prototype field', JSON.parse(JSON.stringify(body('prototype')).replace(/}$/, ',"__proto__":{"role":"owner"}}'))],
  ]) {
    const result = await post(baseUrl, payload)
    equal(result.status, 400, `${label} rejected`)
  }
  equal(await User.countDocuments({}), 0, 'invalid registration bodies create no users')

  for (const mode of ['invalid', 'expired', 'network', 'malformed', 'timestamp', 'action', 'hostname']) {
    siteverifyMode = mode
    const result = await post(baseUrl, body(mode))
    equal(result.status, 400, `${mode} verification rejected`)
    equal(result.data.code, 'HUMAN_VERIFICATION_FAILED', `${mode} has stable error code`)
    check(!JSON.stringify(result.data).includes(secret) && !JSON.stringify(result.data).includes(token), `${mode} response hides secrets`)
    equal(await User.countDocuments({}), 0, `${mode} creates no user`)
  }
  siteverifyMode = 'timeout'
  await assert.rejects(verifyTurnstile(token, { timeoutMs: 10 }), (error) => error.code === 'HUMAN_VERIFICATION_FAILED')
  checks += 1
  equal(await User.countDocuments({}), 0, 'timeout creates no user')
  siteverifyMode = 'valid'
  const created = await post(baseUrl, body('valid'))
  equal(created.status, 201, 'valid verification permits registration')
  equal(created.data.data.user.role, 'student', 'public registration remains student-only')
  check(!JSON.stringify(created.data).includes('passwordHash') && !JSON.stringify(created.data).includes(password), 'password and hash absent from response')
  check(!JSON.stringify(created.data).includes(secret) && !JSON.stringify(created.data).includes(token), 'secret and token absent from response')
  const stored = await User.findOne({ email: `valid-${email}` }).select('+passwordHash')
  check(stored?.passwordHash?.startsWith('$2') && stored.passwordHash !== password, 'password stored only as bcrypt hash')
  equal(await User.countDocuments({}), 1, 'only one temporary student created')
  process.stdout.write(`Turnstile backend validation passed: ${checks} assertions.\n`)
} catch {
  process.stderr.write('Turnstile backend validation failed.\n')
  process.exitCode = 1
} finally {
  globalThis.fetch = originalFetch
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName) {
    await mongoose.connection.dropDatabase()
    process.stdout.write('Isolated Turnstile test database removed.\n')
  }
  await mongoose.disconnect()
  if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY
  else process.env.TURNSTILE_SECRET_KEY = originalSecret
  if (originalHostnames === undefined) delete process.env.TURNSTILE_ALLOWED_HOSTNAMES
  else process.env.TURNSTILE_ALLOWED_HOSTNAMES = originalHostnames
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv
}
