import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import app from '../src/app.js'
import validateEnvironment from '../src/config/environment.js'
import AdmissionCycle from '../src/models/AdmissionCycle.js'
import EligibilityResearch from '../src/models/EligibilityResearch.js'
import EligibilityRule from '../src/models/EligibilityRule.js'
import EntryTest from '../src/models/EntryTest.js'
import MeritFormula from '../src/models/MeritFormula.js'
import Program from '../src/models/Program.js'
import SourceVerification from '../src/models/SourceVerification.js'
import University from '../src/models/University.js'
import User from '../src/models/User.js'
import { signAccessToken } from '../src/utils/jwt.js'

const unique = randomUUID().replaceAll('-', '')
const databaseName = `dae2uni_tmp_rule_${unique.slice(0, 22)}`
let server
let ownsDatabase = false
let checks = 0
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message) }
const check = (value, message) => { checks += 1; assert.ok(value, message) }

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body && { 'content-type': 'application/json' }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  })
  return { status: response.status, body: await response.json() }
}

const source = {
  officialUrl: 'https://example.invalid/official',
  verificationStatus: 'pending_review',
}

const payload = ({ university, program, cycle, research, entryTest }) => ({
  code: `TEMP-RULE-${unique.slice(0, 10)}`,
  name: 'Temporary DAE CIT eligibility draft',
  university,
  program,
  admissionCycle: cycle,
  eligibilityResearch: research,
  scope: 'program',
  qualificationMatchLogic: 'any',
  qualificationCriteria: [{
    qualificationType: 'DAE',
    technologyCodes: ['CIT'],
    minimumPercentage: 60,
    minimumPassingYear: null,
    acceptedBoards: [],
    requiredSubjects: [],
    equivalenceRequired: false,
    explanation: 'Temporary criterion used only in an isolated validation database.',
  }],
  domicile: {
    allowedProvinces: ['Punjab'],
    allowedDistricts: [],
    required: false,
    explanation: '',
  },
  entryTestRequirements: [{
    entryTest,
    required: true,
    minimumScore: 50,
    minimumPercentage: null,
    explanation: 'Temporary entry-test requirement.',
  }],
  effectiveFrom: null,
  effectiveUntil: null,
  priority: 0,
  officialSourceUrl: 'https://example.invalid/admissions',
})

try {
  validateEnvironment()
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: databaseName,
    serverSelectionTimeoutMS: 5000,
  })
  const databases = await mongoose.connection.db.admin().listDatabases({ nameOnly: true })
  if (databases.databases.some((item) => item.name === databaseName)) {
    throw new Error('Temporary eligibility-rule database already exists.')
  }
  ownsDatabase = true
  await Promise.all([
    User.init(), University.init(), Program.init(), AdmissionCycle.init(),
    EligibilityResearch.init(), EligibilityRule.init(), EntryTest.init(),
  ])

  const passwordHash = await bcrypt.hash(`Temporary-${unique}`, 12)
  const users = await User.create(['owner', 'co_owner', 'admin', 'student'].map((role) => ({
    name: `Temporary ${role}`,
    email: `temporary-eligibility-rule-${unique}-${role}@example.invalid`,
    passwordHash,
    role,
    accountStatus: 'active',
    ...(role === 'owner' && { ownerMarker: 'permanent_owner' }),
  })))
  const tokens = Object.fromEntries(users.map((user) => [user.role, signAccessToken(user)]))
  const [universityA, universityB] = await University.create([
    { name: 'Temporary Rule University A', slug: `temporary-rule-a-${unique}`, sector: 'public', campuses: [{ name: 'Main', city: 'Lahore', isMainCampus: true }], source },
    { name: 'Temporary Rule University B', slug: `temporary-rule-b-${unique}`, sector: 'public', campuses: [{ name: 'Main', city: 'Taxila', isMainCampus: true }], source },
  ])
  const [programA, programB] = await Program.create([
    { university: universityA._id, name: 'Temporary Program A', slug: `temporary-rule-program-a-${unique}`, degreeTitle: 'Temporary Degree A', credentialType: 'BS', duration: { years: 4 }, source },
    { university: universityB._id, name: 'Temporary Program B', slug: `temporary-rule-program-b-${unique}`, degreeTitle: 'Temporary Degree B', credentialType: 'BS', duration: { years: 4 }, source },
  ])
  const cycleA = await AdmissionCycle.create({
    university: universityA._id,
    name: 'Temporary Rule Fall Cycle',
    academicYear: '2026',
    intake: 'fall',
    programOfferings: [{ program: programA._id }],
    source,
  })
  const entryTest = await EntryTest.create({
    name: 'Temporary Rule Test', code: `TRT${unique.slice(0, 6)}`,
    conductingBody: 'Temporary body', category: 'university_specific',
    scoring: { resultUnit: 'score', maximumScore: 100 }, source,
  })
  const [verifiedResearch, unverifiedResearch, unrelatedResearch] = await EligibilityResearch.create([
    {
      university: universityA._id, program: programA._id, admissionCycle: cycleA._id,
      researchStatus: 'verified', officialSourceUrl: 'https://example.invalid/research-a',
      sourceTitle: 'Temporary verified research', reviewedDate: new Date('2026-09-30'),
      evidenceNotes: 'Temporary verified evidence.', unresolvedItems: [],
      createdBy: users[0]._id, reviewedBy: users[0]._id,
    },
    {
      university: universityA._id, program: programA._id,
      researchStatus: 'researching', officialSourceUrl: 'https://example.invalid/research-unverified',
      sourceTitle: 'Temporary unverified research', reviewedDate: new Date('2026-09-29'),
      evidenceNotes: 'Temporary unresolved evidence.', unresolvedItems: ['Pending review.'],
      createdBy: users[0]._id, reviewedBy: users[0]._id,
    },
    {
      university: universityB._id, program: programB._id,
      researchStatus: 'verified', officialSourceUrl: 'https://example.invalid/research-b',
      sourceTitle: 'Temporary unrelated research', reviewedDate: new Date('2026-09-28'),
      evidenceNotes: 'Temporary unrelated evidence.', unresolvedItems: [],
      createdBy: users[0]._id, reviewedBy: users[0]._id,
    },
  ])
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })

  equal((await request('/api/admin/eligibility-rules')).status, 401, 'logged-out request denied')
  equal((await request('/api/admin/eligibility-rules', { token: tokens.student })).status, 403, 'student request denied')
  for (const role of ['owner', 'co_owner', 'admin']) {
    equal((await request('/api/admin/eligibility-rules', { token: tokens[role] })).status, 200, `${role} may manage draft eligibility rules`)
  }

  const valid = payload({ university: universityA.id, program: programA.id, cycle: cycleA.id, research: verifiedResearch.id, entryTest: entryTest.id })
  equal((await request('/api/admin/eligibility-rules/not-an-id', { token: tokens.admin })).status, 400, 'malformed identifier rejected before database access')
  equal((await request('/api/admin/eligibility-rules', { method: 'POST', token: tokens.owner, body: { ...valid, role: 'owner' } })).status, 400, 'unknown protected field rejected')
  equal((await request('/api/admin/eligibility-rules', { method: 'POST', token: tokens.owner, body: { ...valid, $set: { recordStatus: 'published' } } })).status, 400, 'MongoDB operator rejected')
  equal((await request('/api/admin/eligibility-rules', { method: 'POST', token: tokens.owner, body: { ...valid, recordStatus: 'published' } })).status, 400, 'client-selected publication state rejected')
  equal((await request('/api/admin/eligibility-rules', { method: 'POST', token: tokens.owner, body: { ...valid, officialSourceUrl: 'https://user:password@example.invalid' } })).status, 400, 'unsafe source URL rejected')
  equal((await request('/api/admin/eligibility-rules', { method: 'POST', token: tokens.owner, body: { ...valid, program: programB.id } })).status, 400, 'cross-university program rejected')
  equal((await request('/api/admin/eligibility-rules', { method: 'POST', token: tokens.owner, body: { ...valid, university: universityB.id } })).status, 400, 'cycle/program relationship mismatch rejected')
  equal((await request('/api/admin/eligibility-rules', { method: 'POST', token: tokens.owner, body: { ...valid, eligibilityResearch: unverifiedResearch.id, admissionCycle: null } })).status, 400, 'unverified research rejected')
  equal((await request('/api/admin/eligibility-rules', { method: 'POST', token: tokens.owner, body: { ...valid, eligibilityResearch: unrelatedResearch.id, admissionCycle: null } })).status, 400, 'unrelated research rejected')

  const researchBefore = JSON.stringify(await EligibilityResearch.findById(verifiedResearch._id).lean())
  const created = await request('/api/admin/eligibility-rules', { method: 'POST', token: tokens.co_owner, body: valid })
  equal(created.status, 201, 'valid draft eligibility rule created')
  equal(created.body.data.rule.recordStatus, 'draft', 'new rule forced to draft')
  equal(created.body.data.rule.source.verificationStatus, 'pending_review', 'new source forced to pending review')
  equal(created.body.data.rule.applicantCategory, 'DAE-CIT', 'applicant category is server-controlled')
  check(!JSON.stringify(created.body).includes('verificationRecord'), 'internal verification reference is not serialized')
  equal(JSON.stringify(await EligibilityResearch.findById(verifiedResearch._id).lean()), researchBefore, 'linked research remains byte-for-byte unchanged')
  equal(await SourceVerification.countDocuments(), 0, 'no source-verification record created')
  equal(await MeritFormula.countDocuments(), 0, 'no merit formula created or changed')
  equal(await University.countDocuments(), 2, 'no university created or changed')
  equal(await Program.countDocuments(), 2, 'no program created or changed')
  equal(await EntryTest.countDocuments(), 1, 'no entry test created or changed')
  equal(await AdmissionCycle.countDocuments(), 1, 'no admission cycle created or changed')

  await EligibilityRule.updateOne(
    { _id: created.body.data.rule.id },
    { $set: { 'source.verificationStatus': 'verified', 'source.lastVerifiedAt': new Date('2026-09-30') } },
  )
  const updated = await request(`/api/admin/eligibility-rules/${created.body.data.rule.id}`, {
    method: 'PUT',
    token: tokens.admin,
    body: { ...valid, name: 'Updated temporary draft rule' },
  })
  equal(updated.status, 200, 'draft rule can be edited')
  equal(updated.body.data.rule.recordStatus, 'draft', 'edited rule remains draft')
  equal(updated.body.data.rule.source.verificationStatus, 'pending_review', 'every edit returns source verification to pending review')
  equal(updated.body.data.rule.source.lastVerifiedAt, null, 'editing clears stale review date')
  equal(JSON.stringify(await EligibilityResearch.findById(verifiedResearch._id).lean()), researchBefore, 'editing a rule does not mutate linked research')

  const options = await request(`/api/admin/eligibility-rules/options?university=${universityA.id}&program=${programA.id}`, { token: tokens.admin })
  equal(options.status, 200, 'relationship options load')
  equal(options.body.data.programs.length, 1, 'program options are constrained to the university')
  equal(options.body.data.admissionCycles.length, 1, 'cycle options are constrained to the program')
  equal(options.body.data.research.length, 1, 'only matching verified research is offered')

  equal((await request('/api/eligibility-rules')).status, 404, 'no public eligibility-rule endpoint exists')
  equal((await request('/api/student/eligibility-rules', { token: tokens.student })).status, 404, 'no student eligibility-rule result endpoint exists')
  equal((await request(`/api/admin/eligibility-rules/${created.body.data.rule.id}`, { method: 'DELETE', token: tokens.owner })).status, 200, 'draft rule can be deleted')
  equal(await EligibilityRule.countDocuments(), 0, 'draft deletion removes only the rule')
  equal(JSON.stringify(await EligibilityResearch.findById(verifiedResearch._id).lean()), researchBefore, 'deleting a rule does not mutate linked research')

  console.log(`Validated ${checks} focused eligibility-rule authoring checks.`)
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState) {
    if (ownsDatabase) await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
}
