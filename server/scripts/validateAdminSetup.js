import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import app from '../src/app.js'
import validateEnvironment from '../src/config/environment.js'
import AdminSetupState from '../src/models/AdminSetupState.js'
import User from '../src/models/User.js'

const databaseName = `dae2uni_setup_test_${randomUUID().replaceAll('-', '')}`
const prefix = `temporary-setup-${randomUUID()}`
const password = `Aa1${randomBytes(20).toString('base64url')}`
const secret = randomBytes(48).toString('base64url')
const originalUri = process.env.MONGODB_URI
const originalSecret = process.env.ADMIN_SETUP_SECRET
let server
let checks = 0
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks++ }
function check(value, label) { assert.ok(value, label); checks++ }

async function request(path, body, method = body ? 'POST' : 'GET', token) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers: { Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
    ...(body && { body: JSON.stringify(body) }),
  })
  return { status: response.status, payload: await response.json(), headers: response.headers }
}

async function main() {
  if (!originalUri) throw new Error('Local MongoDB test configuration is required.')
  const uri = new URL(originalUri)
  if (!['127.0.0.1', 'localhost'].includes(uri.hostname) || uri.protocol !== 'mongodb:') {
    throw new Error('Setup validation only runs against local MongoDB.')
  }
  uri.pathname = `/${databaseName}`
  process.env.MONGODB_URI = uri.toString()
  process.env.ADMIN_SETUP_SECRET = secret
  validateEnvironment()
  await mongoose.connect(process.env.MONGODB_URI)
  equal(mongoose.connection.name, databaseName, 'isolated test database selected')
  server = app.listen(0)
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })

  let response = await request('/api/setup/status')
  equal(response.status, 200, 'initial status')
  equal(response.payload.data.ownerSetupRequired, true, 'first Owner setup required')
  equal(Object.keys(response.payload.data).length, 1, 'status returns one field')
  check(response.headers.get('cache-control')?.includes('no-store'), 'status not cached')
  const earlyCli = spawnSync(process.execPath, ['scripts/provisionAdmin.js', 'Temporary Early Owner', `${prefix}-early@example.invalid`], {
    cwd: process.cwd(), env: { ...process.env, DAE2UNI_ADMIN_PASSWORD: password }, encoding: 'utf8', timeout: 15000,
  })
  check(earlyCli.status === 1, `CLI requires explicit Owner recovery intent (${earlyCli.error?.code || earlyCli.status})`)
  const body = { name: 'Temporary Setup Owner', email: `${prefix}@example.invalid`, password,
    passwordConfirmation: password, setupSecret: secret }
  delete process.env.ADMIN_SETUP_SECRET
  equal((await request('/api/setup/admin', body)).status, 503, 'missing server secret')
  process.env.ADMIN_SETUP_SECRET = 'replace-with-a-secret-that-is-not-strong-enough'
  assert.throws(validateEnvironment, /ADMIN_SETUP_SECRET/); checks++
  process.env.ADMIN_SETUP_SECRET = 'Aaa111example-placeholder-secret-value-xyz'
  assert.throws(validateEnvironment, /ADMIN_SETUP_SECRET/); checks++
  process.env.ADMIN_SETUP_SECRET = process.env.JWT_SECRET
  assert.throws(validateEnvironment, /ADMIN_SETUP_SECRET/); checks++
  process.env.ADMIN_SETUP_SECRET = secret
  equal((await request('/api/setup/admin', { ...body, setupSecret: 'incorrect' })).status, 403, 'invalid secret')
  equal((await request('/api/setup/admin', { ...body, setupSecret: 'x'.repeat(secret.length) })).status, 403, 'same-length invalid secret')
  equal((await request('/api/setup/admin', { ...body, role: 'admin' })).status, 400, 'role injection')
  equal((await request('/api/setup/admin', { ...body, $set: { role: 'admin' } })).status, 400, 'operator injection')
  const pollution = JSON.parse(JSON.stringify(body).replace(/}$/, ',"__proto__":{"role":"admin"}}'))
  equal((await request('/api/setup/admin', pollution)).status, 400, 'prototype key rejected')
  equal((await request('/api/setup/admin', { ...body, email: 'not-email' })).status, 400, 'invalid email')
  equal((await request('/api/setup/admin', { ...body, password: 'weak', passwordConfirmation: 'weak' })).status, 400, 'weak password')
  const tooLong = `Aa1${'é'.repeat(36)}`
  equal((await request('/api/setup/admin', { ...body, password: tooLong, passwordConfirmation: tooLong })).status, 400, 'bcrypt byte limit')
  equal((await request('/api/setup/admin', { ...body, passwordConfirmation: 'different' })).status, 400, 'password mismatch')
  const studentHash = await bcrypt.hash(password, 12)
  const student = await User.create({ name: 'Temporary Setup Student', email: `${prefix}-student@example.invalid`, passwordHash: studentHash, role: 'student', accountStatus: 'active' })
  equal((await request('/api/setup/admin', { ...body, email: student.email })).status, 409, 'existing-email failure')
  equal((await request('/api/setup/status')).payload.data.ownerSetupRequired, true, 'failed setup releases claim')
  const concurrent = await Promise.all([request('/api/setup/admin', body), request('/api/setup/admin', body)])
  equal(concurrent.filter((item) => item.status === 201).length, 1, 'one concurrent winner')
  equal(concurrent.filter((item) => item.status === 409).length, 1, 'one concurrent loser')
  response = concurrent.find((item) => item.status === 201)
  equal(response.payload.data.user.role, 'owner', 'role forced Owner')
  equal(response.payload.data.user.accountStatus, 'active', 'status forced active')
  check(!/password|secret|token|ownerMarker|roleAudit/i.test(JSON.stringify(response.payload)), 'safe response fields')
  const owner = await User.findOne({ email: body.email }).select('+passwordHash +ownerMarker')
  check(owner.passwordHash !== password && /^\$2[ab]\$12\$/.test(owner.passwordHash), 'bcrypt cost-12 hash stored')
  equal(await bcrypt.compare(password, owner.passwordHash), true, 'password verifies')
  equal(owner.ownerMarker, 'permanent_owner', 'unique protected Owner marker')
  equal(await User.countDocuments({ role: 'owner' }), 1, 'exactly one Owner exists')
  await assert.rejects(User.create({ name: 'Temporary Second Owner', email: `${prefix}-second-owner@example.invalid`, passwordHash: studentHash, role: 'owner', accountStatus: 'active', ownerMarker: 'permanent_owner' }), /duplicate key/i); checks++
  owner.role = 'admin'
  await assert.rejects(owner.save(), /owner marker|permanent Owner/i); checks++
  owner.role = 'owner'
  equal((await request('/api/setup/status')).payload.data.ownerSetupRequired, false, 'completed status')
  equal((await request('/api/setup/admin', body)).status, 409, 'second setup rejected')
  delete process.env.ADMIN_SETUP_SECRET
  equal((await request('/api/setup/status')).payload.data.ownerSetupRequired, false, 'secret removal does not reopen')
  process.env.ADMIN_SETUP_SECRET = secret
  const login = await request('/api/auth/login', { email: body.email.toUpperCase(), password })
  equal(login.status, 200, 'normal admin login')
  const token = login.payload.data.token
  equal((await request('/api/auth/me', undefined, 'GET', token)).payload.data.user.role, 'owner', 'database-backed Owner restoration')
  equal((await request('/api/admin/ping', undefined, 'GET', token)).status, 200, 'Owner content access')
  const studentLogin = await request('/api/auth/login', { email: student.email, password })
  equal((await request('/api/admin/ping', undefined, 'GET', studentLogin.payload.data.token)).status, 403, 'student denied')
  equal((await request('/api/setup/admin', { ...body, email: student.email })).status, 409, 'student cannot use completed setup')
  await new Promise((resolve) => server.close(resolve)); server = null
  server = app.listen(0)
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })
  equal((await request('/api/setup/status')).payload.data.ownerSetupRequired, false, 'process restart remains locked')
  await User.collection.updateOne({ _id: owner._id }, { $set: { accountStatus: 'suspended' } })
  equal((await request('/api/admin/ping', undefined, 'GET', token)).status, 403, 'suspended Owner token rejected')
  const recoveryPassword = `Aa1${randomBytes(20).toString('base64url')}`
  const recovery = spawnSync(process.execPath, ['scripts/provisionAdmin.js', '--recover-owner', body.email], {
    cwd: process.cwd(), env: { ...process.env, DAE2UNI_OWNER_PASSWORD: recoveryPassword }, encoding: 'utf8', timeout: 15000,
  })
  equal(recovery.status, 0, 'CLI reactivates exact existing Owner and resets password')
  equal((await request('/api/auth/login', { email: body.email, password: recoveryPassword })).status, 200, 'recovered Owner logs in')
  equal(await User.countDocuments({ role: 'owner' }), 1, 'recovery creates no second Owner')
  await User.deleteOne({ _id: owner._id })
  equal((await request('/api/setup/status')).payload.data.ownerSetupRequired, false, 'persistent lock survives Owner removal')
  const deletedOwnerRecovery = spawnSync(process.execPath, ['scripts/provisionAdmin.js', '--recover-owner', body.email], {
    cwd: process.cwd(), env: { ...process.env, DAE2UNI_OWNER_PASSWORD: recoveryPassword }, encoding: 'utf8', timeout: 15000,
  })
  equal(deletedOwnerRecovery.status, 1, 'CLI cannot create replacement Owner')
  await AdminSetupState.deleteOne({ _id: 'first-administrator' })
  await User.create({ name: 'Temporary Legacy Administrator', email: `${prefix}-legacy@example.invalid`, passwordHash: studentHash, role: 'admin', accountStatus: 'active' })
  equal((await request('/api/setup/status')).payload.data.ownerSetupRequired, false, 'legacy Admin locks setup')
  equal((await AdminSetupState.findById('first-administrator')).state, 'completed', 'legacy lock persisted')
  const migration = spawnSync(process.execPath, ['scripts/provisionAdmin.js', '--migrate-legacy-admin', `${prefix}-legacy@example.invalid`, '--confirm-legacy-migration'], {
    cwd: process.cwd(), env: process.env, encoding: 'utf8', timeout: 15000,
  })
  equal(migration.status, 0, 'explicit exact legacy Admin migration')
  equal((await User.findOne({ email: `${prefix}-legacy@example.invalid` }))?.role, 'owner', 'selected Admin becomes Owner')
  const repeatedMigration = spawnSync(process.execPath, ['scripts/provisionAdmin.js', '--migrate-legacy-admin', `${prefix}-legacy@example.invalid`, '--confirm-legacy-migration'], {
    cwd: process.cwd(), env: process.env, encoding: 'utf8', timeout: 15000,
  })
  equal(repeatedMigration.status, 1, 'second legacy migration rejected')
  for (let i = 0; i < 22; i++) response = await request('/api/setup/admin', body)
  equal(response.status, 429, 'focused setup rate limit')
  process.stdout.write(`Owner setup validation passed: ${checks} assertions.\n`)
}

try { await main() } catch (error) {
  process.stderr.write(`Owner setup validation failed${error.name === 'AssertionError' ? `: ${error.message}` : ''}.\n`)
  process.exitCode = 1
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState === 1) {
    if (mongoose.connection.name !== databaseName || !databaseName.startsWith('dae2uni_setup_test_')) {
      throw new Error('Refusing cleanup outside the isolated setup test database.')
    }
  }
  await mongoose.disconnect()
  if (process.env.MONGODB_URI?.includes(databaseName)) {
    // Close the model connection before dropping: background auto-index work
    // on that connection could otherwise recreate an empty test database.
    const cleanup = await mongoose.createConnection(process.env.MONGODB_URI, { autoIndex: false }).asPromise()
    try {
      if (cleanup.name !== databaseName) throw new Error('Refusing cleanup outside the setup test database.')
      await cleanup.dropDatabase()
      process.stdout.write('Isolated temporary setup database removed.\n')
    } finally {
      await cleanup.close()
    }
  }
  if (originalSecret === undefined) delete process.env.ADMIN_SETUP_SECRET
  else process.env.ADMIN_SETUP_SECRET = originalSecret
  process.env.MONGODB_URI = originalUri
}
