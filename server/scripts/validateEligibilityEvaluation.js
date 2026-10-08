import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import app from '../src/app.js'
import validateEnvironment from '../src/config/environment.js'
import EligibilityRule from '../src/models/EligibilityRule.js'
import Program from '../src/models/Program.js'
import StudentProfile from '../src/models/StudentProfile.js'
import University from '../src/models/University.js'
import User from '../src/models/User.js'
import { signAccessToken } from '../src/utils/jwt.js'

const unique = randomUUID().replaceAll('-', '')
const databaseName = `dae2uni_tmp_eval_${unique.slice(0, 22)}`
let server
let ownsDatabase = false
let checks = 0
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message) }
const check = (value, message) => { checks += 1; assert.ok(value, message) }

async function request(path, { token } = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    headers: { accept: 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
  })
  return { status: response.status, body: await response.json() }
}

const verifiedSource = {
  officialUrl: 'https://example.invalid/official-admissions',
  verificationStatus: 'verified',
  lastVerifiedAt: new Date('2026-10-01'),
}
const pendingSource = {
  officialUrl: 'https://example.invalid/pending-admissions',
  verificationStatus: 'pending_review',
}

function ruleValues({ code, university, program, source = verifiedSource, recordStatus = 'published', effectiveFrom, effectiveUntil }) {
  return {
    code,
    name: `Temporary eligibility ${code}`,
    university,
    program,
    scope: 'program',
    applicantCategory: 'DAE-CIT',
    qualificationMatchLogic: 'any',
    qualificationCriteria: [{
      qualificationType: 'DAE', technologyCodes: ['CIT'], minimumPercentage: 60,
      equivalenceRequired: false, explanation: 'Temporary isolated evaluator criterion.',
    }],
    domicile: { allowedProvinces: ['Punjab'], required: false },
    source,
    recordStatus,
    ...(effectiveFrom && { effectiveFrom }),
    ...(effectiveUntil && { effectiveUntil }),
  }
}

try {
  validateEnvironment()
  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 5000 })
  const databases = await mongoose.connection.db.admin().listDatabases({ nameOnly: true })
  if (databases.databases.some((database) => database.name === databaseName)) {
    throw new Error('Temporary eligibility-evaluation database already exists.')
  }
  ownsDatabase = true
  await Promise.all([User.init(), StudentProfile.init(), University.init(), Program.init(), EligibilityRule.init()])

  const passwordHash = await bcrypt.hash(`Temporary-${unique}`, 12)
  const [student, admin] = await User.create([
    {
      name: 'Temporary evaluator student', email: `temporary-evaluator-${unique}@example.invalid`,
      passwordHash, role: 'student', accountStatus: 'active',
    },
    {
      name: 'Temporary evaluator admin', email: `temporary-evaluator-admin-${unique}@example.invalid`,
      passwordHash, role: 'admin', accountStatus: 'active',
    },
  ])
  const studentToken = signAccessToken(student)
  const adminToken = signAccessToken(admin)
  const university = await University.create({
    name: 'Temporary Visible University', slug: `temporary-visible-${unique}`, sector: 'public',
    campuses: [{ name: 'Main Campus', city: 'Lahore', isMainCampus: true }],
    source: verifiedSource, recordStatus: 'published',
  })
  const [program, filteredProgram] = await Program.create([
    {
      university: university._id, name: 'Temporary Visible Computing', slug: `temporary-visible-program-${unique}`,
      degreeTitle: 'Temporary BS Computing', credentialType: 'BS', duration: { years: 4 },
      source: verifiedSource, recordStatus: 'published',
    },
    {
      university: university._id, name: 'Temporary Filtered Computing', slug: `temporary-filtered-program-${unique}`,
      degreeTitle: 'Temporary BS Filtered', credentialType: 'BS', duration: { years: 4 },
      source: verifiedSource, recordStatus: 'published',
    },
  ])
  const hiddenProgram = await Program.create({
    university: university._id, name: 'Temporary Hidden Computing', slug: `temporary-hidden-program-${unique}`,
    degreeTitle: 'Temporary Hidden Degree', credentialType: 'BS', duration: { years: 4 },
    source: pendingSource, recordStatus: 'draft',
  })
  await StudentProfile.create({
    user: student._id,
    dae: {
      technologyCode: 'CIT', boardName: 'Punjab Board of Technical Education', passingYear: 2026,
      marks: { totalMarks: 1000, obtainedMarks: 700, status: 'final' },
    },
    domicile: { province: 'Punjab', district: 'Lahore' },
  })
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })

  equal((await request('/api/student/eligibility')).status, 401, 'logged-out request denied')
  equal((await request('/api/student/eligibility', { token: adminToken })).status, 403, 'administrator request denied')
  equal((await request('/api/student/eligibility?programId=invalid', { token: studentToken })).status, 400, 'malformed program identifier rejected')
  equal((await request('/api/student/eligibility?unknown=value', { token: studentToken })).status, 400, 'unknown query field rejected')
  equal((await request('/api/student/eligibility?%24where=value', { token: studentToken })).status, 400, 'operator-shaped query field rejected')
  equal((await request(`/api/student/eligibility?programId=${hiddenProgram.id}`, { token: studentToken })).status, 404, 'non-public program rejected')

  const unavailable = await request(`/api/student/eligibility?programId=${program.id}`, { token: studentToken })
  equal(unavailable.status, 200, 'student may evaluate their saved profile')
  equal(unavailable.body.data.results[0].state, 'unavailable', 'no verified rule produces unavailable')
  equal(unavailable.body.data.results[0].message, 'No verified eligibility rule is available yet.', 'unavailable message is truthful')

  const activeRule = await EligibilityRule.create(ruleValues({
    code: `ACTIVE-${unique.slice(0, 8)}`, university: university._id, program: program._id,
  }))
  const eligible = await request(`/api/student/eligibility?programId=${program.id}`, { token: studentToken })
  equal(eligible.body.data.results[0].state, 'eligible', 'matching DAE CIT and minimum percentage produces eligible')
  check(eligible.body.data.results[0].reasons.some((item) => item.code === 'DAE_PERCENTAGE_MEETS_MINIMUM'), 'eligible response has a machine-readable reason')

  await EligibilityRule.updateOne({ _id: activeRule._id }, { $set: { 'qualificationCriteria.0.minimumPercentage': 80 } })
  equal((await request(`/api/student/eligibility?programId=${program.id}`, { token: studentToken })).body.data.results[0].state, 'not_eligible', 'failed minimum percentage produces not eligible')

  await EligibilityRule.updateOne({ _id: activeRule._id }, {
    $set: { 'qualificationCriteria.0.minimumPercentage': 60, 'qualificationCriteria.0.technologyCodes': ['MECHANICAL'] },
  })
  const technologyFailure = await request(`/api/student/eligibility?programId=${program.id}`, { token: studentToken })
  equal(technologyFailure.body.data.results[0].state, 'not_eligible', 'failed technology criterion produces not eligible')
  check(technologyFailure.body.data.results[0].reasons.some((item) => item.code === 'DAE_TECHNOLOGY_NOT_ACCEPTED'), 'technology failure is explainable')

  await EligibilityRule.updateOne({ _id: activeRule._id }, { $set: { 'qualificationCriteria.0.technologyCodes': ['CIT'] } })
  await StudentProfile.updateOne({ user: student._id }, { $unset: { 'dae.marks': 1 } })
  equal((await request(`/api/student/eligibility?programId=${program.id}`, { token: studentToken })).body.data.results[0].state, 'needs_information', 'missing saved marks produces needs information')
  await StudentProfile.updateOne({ user: student._id }, {
    $set: { 'dae.marks': { totalMarks: 1000, obtainedMarks: 700, percentage: 70, status: 'final' } },
  })

  await EligibilityRule.updateOne({ _id: activeRule._id }, {
    $set: { conditionGroups: [{ logic: 'all', conditions: [{ field: 'unsupported_field', operator: 'equals', value: true, explanation: 'Temporary unsupported condition.' }] }] },
  })
  equal((await request(`/api/student/eligibility?programId=${program.id}`, { token: studentToken })).body.data.results[0].state, 'needs_manual_review', 'unsupported condition produces manual review')
  await EligibilityRule.updateOne({ _id: activeRule._id }, { $unset: { conditionGroups: 1 } })

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await EligibilityRule.create([
    ruleValues({ code: `DRAFT-${unique.slice(0, 8)}`, university: university._id, program: filteredProgram._id, recordStatus: 'draft' }),
    ruleValues({ code: `PENDING-${unique.slice(0, 8)}`, university: university._id, program: filteredProgram._id, source: pendingSource }),
    ruleValues({ code: `EXPIRED-${unique.slice(0, 8)}`, university: university._id, program: filteredProgram._id, effectiveUntil: yesterday }),
    ruleValues({ code: `FUTURE-${unique.slice(0, 8)}`, university: university._id, program: filteredProgram._id, effectiveFrom: tomorrow }),
  ])
  equal((await request(`/api/student/eligibility?programId=${filteredProgram.id}`, { token: studentToken })).body.data.results[0].state, 'unavailable', 'draft, pending, expired, and future rules are ignored')

  const before = JSON.stringify({
    profile: await StudentProfile.findOne({ user: student._id }).lean(),
    rules: await EligibilityRule.find({}).sort({ _id: 1 }).lean(),
    programs: await Program.find({}).sort({ _id: 1 }).lean(),
    university: await University.findById(university._id).lean(),
  })
  const finalEvaluation = await request('/api/student/eligibility', { token: studentToken })
  equal(finalEvaluation.status, 200, 'unfiltered evaluation succeeds')
  check(finalEvaluation.body.data.results.some((result) => result.program?.id === program.id && result.state === 'eligible'), 'unfiltered evaluation includes visible programs supported by active rules')
  const serialized = JSON.stringify(finalEvaluation.body)
  for (const internal of ['eligibilityResearch', 'verificationRecord', 'recordStatus', 'priority', 'createdAt', 'updatedAt']) {
    check(!serialized.includes(internal), `${internal} is not exposed`)
  }
  const after = JSON.stringify({
    profile: await StudentProfile.findOne({ user: student._id }).lean(),
    rules: await EligibilityRule.find({}).sort({ _id: 1 }).lean(),
    programs: await Program.find({}).sort({ _id: 1 }).lean(),
    university: await University.findById(university._id).lean(),
  })
  equal(after, before, 'evaluation performs zero database writes')
  equal((await request('/api/eligibility', { token: studentToken })).status, 404, 'no public eligibility endpoint exists')

  console.log(`Validated ${checks} focused eligibility-evaluation checks.`)
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState) {
    if (ownsDatabase) await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
}
