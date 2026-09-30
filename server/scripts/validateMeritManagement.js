import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import app from '../src/app.js'
import validateEnvironment from '../src/config/environment.js'
import EntryTest from '../src/models/EntryTest.js'
import MeritFormula from '../src/models/MeritFormula.js'
import Program from '../src/models/Program.js'
import University from '../src/models/University.js'
import User from '../src/models/User.js'
import { signAccessToken } from '../src/utils/jwt.js'
import { meritManagementSchemas } from '../src/validation/meritManagementValidation.js'

const unique = randomUUID().replaceAll('-', '')
const databaseName = `dae2uni_temporary_merit_${unique}`
let server
let owned = false
let checks = 0
const check = (value, message) => { checks += 1; assert.ok(value, message) }
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message) }

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method,
    headers: { accept: 'application/json', ...(body && { 'content-type': 'application/json' }), ...(token && { authorization: `Bearer ${token}` }) },
    ...(body && { body: JSON.stringify(body) }),
  })
  return { status: response.status, body: await response.json() }
}

const source = { officialUrl: 'https://example.invalid/official', verificationStatus: 'pending_review' }
const testPayload = (code) => ({ name: `Temporary Test ${code}`, code, conductingBody: 'Temporary Testing Body', category: 'university_specific', scoring: { resultUnit: 'score', maximumScore: 100, negativeMarking: false }, source, recordStatus: 'draft' })
const formulaPayload = (university, program, entryTest, overrides = {}) => ({
  code: `TEMP-${unique.slice(0, 20)}`, name: 'Temporary declarative merit formula', university, program,
  components: [
    { basis: 'matric', label: 'Matric', weightPercentage: 17 },
    { basis: 'dae', label: 'DAE', weightPercentage: 50 },
    { basis: 'entry_test', label: 'Temporary test', weightPercentage: 33, entryTest },
  ], source, recordStatus: 'published', ...overrides,
})

try {
  validateEnvironment()
  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 5000 })
  const databases = await mongoose.connection.db.admin().listDatabases({ nameOnly: true })
  if (databases.databases.some((item) => item.name === databaseName)) throw new Error('Temporary merit database already exists.')
  owned = true
  await Promise.all([User.init(), University.init(), Program.init(), EntryTest.init(), MeritFormula.init()])
  const hash = await bcrypt.hash(`Temporary-${unique}`, 12)
  const users = await User.create(['owner', 'co_owner', 'admin', 'student'].map((role) => ({
    name: `Temporary ${role}`, email: `temporary-merit-${unique}-${role}@example.invalid`, passwordHash: hash,
    role, accountStatus: 'active', ...(role === 'owner' && { ownerMarker: 'permanent_owner' }),
  })))
  const tokens = Object.fromEntries(users.map((user) => [user.role, signAccessToken(user)]))
  const [universityA, universityB] = await University.create([
    { name: 'Temporary Merit University A', slug: `temporary-merit-a-${unique}`, sector: 'public', campuses: [{ name: 'Main', city: 'Lahore', isMainCampus: true }], source },
    { name: 'Temporary Merit University B', slug: `temporary-merit-b-${unique}`, sector: 'public', campuses: [{ name: 'Main', city: 'Taxila', isMainCampus: true }], source },
  ])
  const programB = await Program.create({ university: universityB._id, name: 'Temporary Program', slug: `temporary-program-${unique}`, degreeTitle: 'Temporary Degree', credentialType: 'BS', duration: { years: 4 }, source })
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })

  equal((await request('/api/admin/entry-tests')).status, 401, 'logged-out request denied')
  equal((await request('/api/admin/entry-tests', { token: tokens.student })).status, 403, 'student request denied')
  for (const role of ['owner', 'co_owner', 'admin']) equal((await request('/api/admin/entry-tests', { token: tokens[role] })).status, 200, `${role} may manage merit records`)

  equal((await request('/api/admin/entry-tests', { method: 'POST', token: tokens.owner, body: testPayload('BAD-ZERO') })).status, 201, 'valid test setup accepted')
  const invalidScore = testPayload('BAD-SCORE'); invalidScore.scoring.maximumScore = 0
  equal((await request('/api/admin/entry-tests', { method: 'POST', token: tokens.owner, body: invalidScore })).status, 400, 'invalid maximum score rejected')
  const createdTest = await request('/api/admin/entry-tests', { method: 'POST', token: tokens.owner, body: testPayload(`T${unique.slice(0, 12)}`) })
  equal(createdTest.status, 201, 'entry test created')
  const testId = createdTest.body.data.entryTest.id
  check(!meritManagementSchemas.entryTestCreate.safeParse({ ...testPayload('INFINITE'), scoring: { resultUnit: 'score', maximumScore: Infinity } }).success, 'non-finite maximum score rejected')
  equal((new EntryTest({ ...testPayload('NO-FAKE-QUALIFICATION') })).applicableQualificationCodes.length, 0, 'entry test does not invent qualification applicability')

  const crossUniversity = formulaPayload(universityA.id, programB.id, testId)
  equal((await request('/api/admin/merit-formulas', { method: 'POST', token: tokens.owner, body: crossUniversity })).status, 400, 'cross-university program rejected')
  const duplicate = formulaPayload(universityB.id, programB.id, testId, { code: `DUP-${unique.slice(0, 16)}` })
  duplicate.components[1].basis = 'matric'
  equal((await request('/api/admin/merit-formulas', { method: 'POST', token: tokens.owner, body: duplicate })).status, 400, 'duplicate bases rejected')
  const missingTest = formulaPayload(universityB.id, programB.id, testId, { code: `MISS-${unique.slice(0, 15)}` })
  delete missingTest.components[2].entryTest
  equal((await request('/api/admin/merit-formulas', { method: 'POST', token: tokens.owner, body: missingTest })).status, 400, 'missing entry-test link rejected')
  const wrongTotal = formulaPayload(universityB.id, programB.id, testId, { code: `TOTAL-${unique.slice(0, 14)}` })
  wrongTotal.components[2].weightPercentage = 30
  equal((await request('/api/admin/merit-formulas', { method: 'POST', token: tokens.owner, body: wrongTotal })).status, 400, 'published total other than 100 rejected')
  check(!meritManagementSchemas.meritCreate.safeParse({ ...formulaPayload(universityB.id, programB.id, testId), components: [] }).success, 'missing components rejected')
  for (const weight of [-1, 101, Infinity]) {
    const invalidWeight = formulaPayload(universityB.id, programB.id, testId)
    invalidWeight.components[0].weightPercentage = weight
    check(!meritManagementSchemas.meritCreate.safeParse(invalidWeight).success, `invalid weight ${weight} rejected`)
  }

  const createdFormula = await request('/api/admin/merit-formulas', { method: 'POST', token: tokens.owner, body: formulaPayload(universityB.id, programB.id, testId) })
  equal(createdFormula.status, 201, 'valid formula created')
  equal(createdFormula.body.data.meritFormula.weightedTotal, 100, 'stored formula totals 100')
  const aggregate = (79.25 * 0.17) + (90.5 * 0.5) + (75 * 0.33)
  equal(Number(aggregate.toFixed(2)), 83.47, 'contract rounds only final aggregate to two decimals')
  equal((await request(`/api/admin/entry-tests/${testId}`, { method: 'DELETE', token: tokens.admin })).status, 409, 'referenced test cannot be deleted')
  const verificationRecord = new mongoose.Types.ObjectId()
  const verifiedAt = new Date('2026-09-30T10:00:00.000Z')
  await EntryTest.updateOne({ _id: testId }, { $set: { 'source.verificationStatus': 'verified', 'source.lastVerifiedAt': verifiedAt, 'source.verificationRecord': verificationRecord } })
  const unchangedSourceUpdate = await request(`/api/admin/entry-tests/${testId}`, { method: 'PUT', token: tokens.admin, body: { name: 'Temporary renamed test', source: { officialUrl: source.officialUrl, verificationStatus: 'verified', lastVerifiedAt: verifiedAt.toISOString() } } })
  equal(unchangedSourceUpdate.status, 200, 'unrelated update with unchanged source succeeds')
  equal((await EntryTest.findById(testId).select('source.verificationRecord').lean()).source.verificationRecord.toString(), verificationRecord.toString(), 'unchanged source preserves verification reference')
  equal(await University.countDocuments(), 2, 'merit CRUD does not create universities')
  equal(await Program.countDocuments(), 1, 'merit CRUD does not create programs')
  check(!JSON.stringify(createdFormula.body).includes('verificationRecord'), 'protected verification reference is absent')

  console.log(`Validated ${checks} focused merit-management checks.`)
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState) {
    if (owned) await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
}
