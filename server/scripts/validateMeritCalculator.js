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
import StudentProfile from '../src/models/StudentProfile.js'
import University from '../src/models/University.js'
import User from '../src/models/User.js'
import { meritCalculatorSchemas } from '../src/validation/meritCalculatorValidation.js'
import { signAccessToken } from '../src/utils/jwt.js'

const unique = randomUUID().replaceAll('-', '')
const databaseName = `dae2uni_tmp_merit_calc_${unique}`
const verifiedSource = { officialUrl: 'https://example.invalid/official', verificationStatus: 'verified', lastVerifiedAt: new Date('2026-09-30T00:00:00.000Z') }
let server
let owned = false
let checks = 0
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message) }
const check = (value, message) => { checks += 1; assert.ok(value, message) }

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method,
    headers: { accept: 'application/json', ...(token && { authorization: `Bearer ${token}` }), ...(body && { 'content-type': 'application/json' }) },
    ...(body && { body: JSON.stringify(body) }),
  })
  return { status: response.status, body: await response.json() }
}

try {
  validateEnvironment()
  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 5000 })
  const databases = await mongoose.connection.db.admin().listDatabases({ nameOnly: true })
  if (databases.databases.some((item) => item.name === databaseName)) throw new Error('Temporary calculator database already exists.')
  owned = true
  await Promise.all([User.init(), StudentProfile.init(), University.init(), Program.init(), EntryTest.init(), MeritFormula.init()])
  const passwordHash = await bcrypt.hash(`Temporary-${unique}`, 12)
  const [student, admin] = await User.create([
    { name: 'Temporary Merit Student', email: `temporary-merit-calculator-${unique}@example.invalid`, passwordHash, role: 'student', accountStatus: 'active' },
    { name: 'Temporary Merit Admin', email: `temporary-merit-calculator-admin-${unique}@example.invalid`, passwordHash, role: 'admin', accountStatus: 'active' },
  ])
  const studentToken = signAccessToken(student)
  const adminToken = signAccessToken(admin)
  await StudentProfile.create({ user: student._id, profileStatus: 'draft', dae: { year1: { obtainedMarks: 1, totalMarks: 2 }, year2: { obtainedMarks: 1, totalMarks: 2 } }, matric: { marks: { obtainedMarks: 1, totalMarks: 2 } } })
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })

  equal((await request('/api/student/merit-calculator/options')).status, 401, 'logged-out access denied')
  equal((await request('/api/student/merit-calculator/options', { token: adminToken })).status, 403, 'non-student access denied')
  const empty = await request('/api/student/merit-calculator/options', { token: studentToken })
  equal(empty.status, 200, 'student options request succeeds')
  equal(empty.body.data.formulas.length, 0, 'no verified formulas returns an empty option list')

  const university = await University.create({ name: 'Temporary Merit Calculator University', slug: `temporary-merit-calculator-${unique}`, sector: 'public', campuses: [{ name: 'Temporary Main Campus', city: 'Lahore', isMainCampus: true }], source: verifiedSource, recordStatus: 'published' })
  const program = await Program.create({ university: university._id, name: 'Temporary Computing Program', slug: `temporary-computing-${unique}`, degreeTitle: 'Temporary Computing Degree', credentialType: 'BS', duration: { years: 4 }, source: verifiedSource, recordStatus: 'published' })
  const entryTest = await EntryTest.create({ name: 'Temporary Admission Test', code: `T${unique.slice(0, 20)}`, conductingBody: 'Temporary University', category: 'university_specific', scoring: { resultUnit: 'score', maximumScore: 24 }, source: verifiedSource, recordStatus: 'published' })
  const formula = await MeritFormula.create({ code: `CALC-${unique.slice(0, 20)}`, name: 'Temporary Three Component Formula', university: university._id, program: program._id, components: [
    { key: 'matric', label: 'Matric', inputSource: 'matric_percentage', operation: 'weighted_percentage', weightPercentage: 17, explanation: 'Temporary Matric weight.' },
    { key: 'dae', label: 'DAE', inputSource: 'dae_percentage', operation: 'weighted_percentage', weightPercentage: 50, explanation: 'Temporary DAE weight.' },
    { key: 'entry_test', label: 'Temporary Test', inputSource: 'entry_test_percentage', entryTest: entryTest._id, operation: 'weighted_percentage', weightPercentage: 33, explanation: 'Temporary test weight.' },
  ], source: verifiedSource, recordStatus: 'published' })

  const options = await request('/api/student/merit-calculator/options', { token: studentToken })
  equal(options.status, 200, 'verified option list succeeds')
  equal(options.body.data.formulas.length, 1, 'one verified formula is available')
  check(!JSON.stringify(options.body).includes('verificationRecord') && !JSON.stringify(options.body).includes('lastVerifiedAt'), 'options expose no internal verification metadata')
  const formulaId = formula._id.toString()
  const entryTestId = entryTest._id.toString()
  const path = '/api/student/merit-calculator/calculate'
  const daeMarks = { year1: { obtainedMarks: 1, totalMarks: 2 }, year2: { obtainedMarks: 1, totalMarks: 2 } }
  const scores = [{ entryTestId, obtainedMarks: 1 }]
  check(!meritCalculatorSchemas.calculateBody.safeParse({ formulaId, entryTestScores: scores, daeMarks: { ...daeMarks, year3: { totalMarks: 2 } } }).success, 'partial Year 3 rejected')
  check(!meritCalculatorSchemas.calculateBody.safeParse({ formulaId, entryTestScores: scores, daeMarks: { ...daeMarks, year3: { obtainedMarks: 1 } } }).success, 'other partial Year 3 rejected')
  check(!meritCalculatorSchemas.calculateBody.safeParse({ formulaId, entryTestScores: scores, daeMarks: { ...daeMarks, year1: { obtainedMarks: 3, totalMarks: 2 } } }).success, 'obtained marks above total rejected')
  check(!meritCalculatorSchemas.calculateBody.safeParse({ formulaId, entryTestScores: scores, daeMarks: { ...daeMarks, year2: { obtainedMarks: 1, totalMarks: 0 } } }).success, 'nonpositive total rejected')
  check(!meritCalculatorSchemas.calculateBody.safeParse({ formulaId, entryTestScores: scores, daeMarks: { ...daeMarks, year2: { obtainedMarks: Infinity, totalMarks: 2 } } }).success, 'nonfinite year marks rejected')
  equal((await request(path, { method: 'POST', token: studentToken, body: { formulaId, entryTestScores: scores } })).status, 400, 'DAE formula requires temporary Year 1 and Year 2 marks')
  const matricOnly = await MeritFormula.create({ code: `MATRIC-${unique.slice(0, 20)}`, name: 'Temporary Matric Only Formula', university: university._id, program: program._id, components: [
    { key: 'matric', label: 'Matric', inputSource: 'matric_percentage', operation: 'weighted_percentage', weightPercentage: 100, explanation: 'Temporary Matric weight.' },
  ], source: verifiedSource, recordStatus: 'published' })
  const withoutDae = await request(path, { method: 'POST', token: studentToken, body: { formulaId: matricOnly._id.toString(), entryTestScores: [] } })
  equal(withoutDae.status, 200, 'non-DAE formula needs no temporary DAE marks')
  equal(withoutDae.body.data.result.daeResultStatus, null, 'non-DAE formula has no DAE result status')
  equal((await request(path, { method: 'POST', token: studentToken, body: { formulaId, entryTestScores: [] } })).status, 400, 'missing test score rejected')
  equal((await request(path, { method: 'POST', token: studentToken, body: { formulaId, entryTestScores: [{ entryTestId, obtainedMarks: -1 }] } })).status, 400, 'negative score rejected')
  equal((await request(path, { method: 'POST', token: studentToken, body: { formulaId, entryTestScores: [{ entryTestId, obtainedMarks: 25 }] } })).status, 400, 'above-maximum score rejected')
  equal((await request(path, { method: 'POST', token: studentToken, body: { formulaId, entryTestScores: [{ entryTestId, obtainedMarks: 1 }, { entryTestId, obtainedMarks: 1 }] } })).status, 400, 'duplicate score rejected')
  check(!meritCalculatorSchemas.calculateBody.safeParse({ formulaId, entryTestScores: [{ entryTestId, obtainedMarks: Infinity }] }).success, 'non-finite score rejected')
  equal((await request(path, { method: 'POST', token: studentToken, body: { formulaId, entryTestScores: [{ entryTestId, obtainedMarks: 1 }], daePercentage: 100, weights: [100], finalAggregate: 100 } })).status, 400, 'client overrides and unknown fields rejected')

  const before = { users: await User.countDocuments(), profiles: await StudentProfile.countDocuments(), universities: await University.countDocuments(), programs: await Program.countDocuments(), tests: await EntryTest.countDocuments(), formulas: await MeritFormula.countDocuments() }
  const profileBefore = await StudentProfile.findOne({ user: student._id }).lean()
  const userBefore = await User.findById(student._id).select('updatedAt').lean()
  const calculated = await request(path, { method: 'POST', token: studentToken, body: { formulaId, entryTestScores: scores, daeMarks } })
  equal(calculated.status, 200, 'valid calculation succeeds')
  equal(calculated.body.data.result.finalAggregate, 34.88, 'aggregate uses unrounded intermediate values')
  equal(calculated.body.data.result.daeResultStatus, 'provisional', 'missing Year 3 is provisional')
  equal(calculated.body.data.result.breakdown.length, 3, 'transparent three-component breakdown returned')
  const final = await request(path, { method: 'POST', token: studentToken, body: { formulaId, entryTestScores: scores, daeMarks: { ...daeMarks, year3: { obtainedMarks: 0, totalMarks: 2 } } } })
  equal(final.status, 200, 'complete Year 3 calculation succeeds')
  equal(final.body.data.result.finalAggregate, 26.54, 'Year 3 changes only the temporary DAE calculation')
  equal(final.body.data.result.daeResultStatus, 'final', 'all three years produce final status')
  equal(calculated.body.data.result.disclaimer, 'This is a merit calculation, not an eligibility or admission decision.', 'safe merit-only disclaimer returned')
  const after = { users: await User.countDocuments(), profiles: await StudentProfile.countDocuments(), universities: await University.countDocuments(), programs: await Program.countDocuments(), tests: await EntryTest.countDocuments(), formulas: await MeritFormula.countDocuments() }
  assert.deepEqual(after, before, 'calculation must not change collection counts'); checks += 1
  const profileAfter = await StudentProfile.findOne({ user: student._id }).lean()
  equal(profileAfter.updatedAt.getTime(), profileBefore.updatedAt.getTime(), 'calculation does not update the profile')
  assert.deepEqual(profileAfter.dae, profileBefore.dae, 'temporary year marks do not alter saved DAE data'); checks += 1
  equal(profileAfter.profileStatus, profileBefore.profileStatus, 'calculation does not change profile completion')
  const userAfter = await User.findById(student._id).select('updatedAt').lean()
  equal(userAfter.updatedAt.getTime(), userBefore.updatedAt.getTime(), 'calculation does not update the user')
  await formula.validate()
  await (await StudentProfile.findOne({ user: student._id })).validate()
  checks += 2

  console.log(`Validated ${checks} focused student merit-calculator checks.`)
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState) {
    if (owned) await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
}
