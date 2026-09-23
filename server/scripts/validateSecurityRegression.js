import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import app from '../src/app.js'
import validateEnvironment from '../src/config/environment.js'
import { StudentProfile, User } from '../src/models/index.js'
import { signAccessToken } from '../src/utils/jwt.js'

const prefix = `temporary-security-${randomUUID()}`
const password = `Aa1${randomBytes(24).toString('base64url')}`
let server
let checks = 0
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks += 1 }
function check(value, message) { assert.ok(value, message); checks += 1 }

async function request(baseUrl, path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Accept: 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...(body && { 'Content-Type': 'application/json' }) },
    ...(body && { body: JSON.stringify(body) }),
  })
  return { response, payload: await response.json() }
}

try {
  validateEnvironment()
  await mongoose.connect(process.env.MONGODB_URI)
  const passwordHash = await bcrypt.hash(password, 12)
  const [student, admin] = await User.create([
    { name: 'Temporary Security Student', email: `${prefix}-student@example.invalid`, passwordHash, role: 'student', accountStatus: 'active' },
    { name: 'Temporary Security Administrator', email: `${prefix}-admin@example.invalid`, passwordHash, role: 'admin', accountStatus: 'active' },
  ])
  server = app.listen(0)
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })
  const baseUrl = `http://127.0.0.1:${server.address().port}`

  equal((await request(baseUrl, '/api/auth/me')).response.status, 401, 'missing token')
  equal((await request(baseUrl, '/api/auth/me', { token: 'not-a-token' })).response.status, 401, 'invalid token')
  const expired = jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS256', issuer: 'dae2uni-api', audience: 'dae2uni-client', subject: student.id, expiresIn: -1 })
  equal((await request(baseUrl, '/api/auth/me', { token: expired })).payload.code, 'TOKEN_EXPIRED', 'expired token')
  const wrongAudience = jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS256', issuer: 'dae2uni-api', audience: 'wrong-audience', subject: student.id, expiresIn: '1h' })
  equal((await request(baseUrl, '/api/auth/me', { token: wrongAudience })).response.status, 401, 'audience validation')

  const studentToken = signAccessToken(student)
  const adminToken = signAccessToken(admin)
  const current = await request(baseUrl, '/api/auth/me', { token: studentToken })
  equal(current.response.status, 200, 'valid current-user token')
  equal(current.payload.data.user.role, 'student', 'current database role')
  check(!JSON.stringify(current.payload).includes('passwordHash'), 'hash omitted from current-user response')
  equal((await request(baseUrl, '/api/admin/universities')).response.status, 401, 'admin endpoint requires authentication')
  equal((await request(baseUrl, '/api/admin/universities', { token: studentToken })).response.status, 403, 'student denied admin endpoint')
  equal((await request(baseUrl, '/api/admin/universities', { token: adminToken })).response.status, 200, 'admin endpoint accepts current administrator')

  const forgedRole = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS256', issuer: 'dae2uni-api', audience: 'dae2uni-client', subject: student.id, expiresIn: '1h' })
  equal((await request(baseUrl, '/api/admin/universities', { token: forgedRole })).response.status, 403, 'JWT role claim not authoritative')
  const wrongPassword = await request(baseUrl, '/api/auth/login', { method: 'POST', body: { email: student.email, password: `${password}x` } })
  const missingEmail = await request(baseUrl, '/api/auth/login', { method: 'POST', body: { email: `${prefix}-missing@example.invalid`, password } })
  equal(wrongPassword.response.status, 401, 'wrong password rejected')
  equal(missingEmail.response.status, 401, 'unknown email rejected')
  equal(wrongPassword.payload.message, missingEmail.payload.message, 'login does not enumerate users')
  const loggedIn = await request(baseUrl, '/api/auth/login', { method: 'POST', body: { email: student.email.toUpperCase(), password } })
  equal(loggedIn.response.status, 200, 'normalized-email login')
  check(!JSON.stringify(loggedIn.payload).includes('passwordHash'), 'hash omitted from login response')

  const injectedRegistration = await request(baseUrl, '/api/auth/register', { method: 'POST', body: { name: 'Temporary Injection', email: `${prefix}-injection@example.invalid`, password, role: 'admin' } })
  equal(injectedRegistration.response.status, 400, 'public role injection rejected')
  equal((await request(baseUrl, '/api/student/profile', { token: adminToken })).response.status, 403, 'admin cannot use student profile route')
  equal((await request(baseUrl, '/api/student/profile', { token: studentToken })).response.status, 404, 'new student profile is absent')
  equal((await request(baseUrl, '/api/student/profile', { method: 'PUT', token: studentToken, body: { userId: admin.id } })).response.status, 400, 'profile owner injection rejected')
  equal((await request(baseUrl, '/api/student/profile', { method: 'PUT', token: studentToken, body: { $set: { profileStatus: 'complete' } } })).response.status, 400, 'MongoDB operator injection rejected')
  equal((await request(baseUrl, '/api/student/profile', { method: 'PUT', token: studentToken, body: { profileStatus: 'draft', dae: { boardName: 'Temporary board' } } })).response.status, 200, 'student can create own draft')
  equal((await request(baseUrl, '/api/student/profile', { token: studentToken })).response.status, 200, 'student can read own draft')
  admin.accountStatus = 'suspended'
  await admin.save()
  equal((await request(baseUrl, '/api/auth/me', { token: adminToken })).payload.code, 'ACCOUNT_DISABLED', 'disabled account token rejected')
  equal((await request(baseUrl, '/api/admin/universities', { token: adminToken })).response.status, 403, 'disabled admin denied catalogue')

  process.stdout.write(`Backend security regression passed: ${checks} assertions.\n`)
} catch (error) {
  process.stderr.write('Backend security regression failed. Review the assertion or database configuration locally.\n')
  process.exitCode = 1
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState === 1) {
    const users = await User.find({ email: new RegExp(`^${prefix}-`) }).select('_id').lean()
    const ids = users.map((user) => user._id)
    await StudentProfile.deleteMany({ user: { $in: ids } })
    await User.deleteMany({ _id: { $in: ids } })
    const remaining = await User.countDocuments({ _id: { $in: ids } })
    process.stdout.write(`Temporary security users and profiles removed; remaining users: ${remaining}.\n`)
  }
  await mongoose.disconnect()
}
