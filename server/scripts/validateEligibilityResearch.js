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
import Program from '../src/models/Program.js'
import SourceVerification from '../src/models/SourceVerification.js'
import University from '../src/models/University.js'
import User from '../src/models/User.js'
import { signAccessToken } from '../src/utils/jwt.js'

const unique = randomUUID().replaceAll('-', '')
const databaseName = `dae2uni_tmp_er_${unique.slice(0, 24)}`
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

const payload = (university, program, admissionCycle = null) => ({
  university,
  program,
  admissionCycle,
  researchStatus: 'researching',
  officialSourceUrl: 'https://example.invalid/admissions',
  sourceTitle: 'Temporary official admissions evidence',
  reviewedDate: '2026-09-30',
  evidenceNotes: 'Temporary evidence note for isolated validation only.',
  unresolvedItems: ['DAE CIT wording remains unresolved.'],
})

try {
  validateEnvironment()
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: databaseName,
    serverSelectionTimeoutMS: 5000,
  })
  const databases = await mongoose.connection.db.admin().listDatabases({ nameOnly: true })
  if (databases.databases.some((item) => item.name === databaseName)) {
    throw new Error('Temporary eligibility-research database already exists.')
  }
  ownsDatabase = true
  await Promise.all([
    User.init(),
    University.init(),
    Program.init(),
    AdmissionCycle.init(),
    EligibilityResearch.init(),
  ])

  const passwordHash = await bcrypt.hash(`Temporary-${unique}`, 12)
  const users = await User.create(['owner', 'co_owner', 'admin', 'student'].map((role) => ({
    name: `Temporary ${role}`,
    email: `temporary-eligibility-research-${unique}-${role}@example.invalid`,
    passwordHash,
    role,
    accountStatus: 'active',
    ...(role === 'owner' && { ownerMarker: 'permanent_owner' }),
  })))
  const tokens = Object.fromEntries(users.map((user) => [user.role, signAccessToken(user)]))
  const [universityA, universityB] = await University.create([
    { name: 'Temporary Research University A', slug: `temporary-research-a-${unique}`, sector: 'public', campuses: [{ name: 'Main', city: 'Lahore', isMainCampus: true }], source },
    { name: 'Temporary Research University B', slug: `temporary-research-b-${unique}`, sector: 'public', campuses: [{ name: 'Main', city: 'Taxila', isMainCampus: true }], source },
  ])
  const [programA, programB] = await Program.create([
    { university: universityA._id, name: 'Temporary Program A', slug: `temporary-program-a-${unique}`, degreeTitle: 'Temporary Degree A', credentialType: 'BS', duration: { years: 4 }, source },
    { university: universityB._id, name: 'Temporary Program B', slug: `temporary-program-b-${unique}`, degreeTitle: 'Temporary Degree B', credentialType: 'BS', duration: { years: 4 }, source },
  ])
  const cycleA = await AdmissionCycle.create({
    university: universityA._id,
    name: 'Temporary Fall Cycle',
    academicYear: '2026',
    intake: 'fall',
    programOfferings: [{ program: programA._id }],
    source,
  })
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })

  equal((await request('/api/admin/eligibility-research')).status, 401, 'logged-out request denied')
  equal((await request('/api/admin/eligibility-research', { token: tokens.student })).status, 403, 'student request denied')
  for (const role of ['owner', 'co_owner', 'admin']) {
    equal((await request('/api/admin/eligibility-research', { token: tokens[role] })).status, 200, `${role} may use the private research tracker`)
  }

  const valid = payload(universityA.id, programA.id, cycleA.id)
  equal((await request('/api/admin/eligibility-research', { method: 'POST', token: tokens.owner, body: { ...valid, role: 'owner' } })).status, 400, 'unknown protected field rejected')
  equal((await request('/api/admin/eligibility-research', { method: 'POST', token: tokens.owner, body: { ...valid, $set: { researchStatus: 'verified' } } })).status, 400, 'MongoDB operator rejected')
  equal((await request('/api/admin/eligibility-research', { method: 'POST', token: tokens.owner, body: { ...valid, officialSourceUrl: 'https://user:password@example.invalid' } })).status, 400, 'credential-containing URL rejected')
  equal((await request('/api/admin/eligibility-research', { method: 'POST', token: tokens.owner, body: payload(universityA.id, programB.id) })).status, 400, 'cross-university program rejected')
  equal((await request('/api/admin/eligibility-research', { method: 'POST', token: tokens.owner, body: payload(universityB.id, programB.id, cycleA.id) })).status, 400, 'cross-university admission cycle rejected')

  const created = await request('/api/admin/eligibility-research', {
    method: 'POST', token: tokens.owner, body: valid,
  })
  equal(created.status, 201, 'valid research record created')
  equal(created.body.data.record.createdBy.role, 'owner', 'creator attribution is server-derived')
  equal(created.body.data.record.reviewedBy.role, 'owner', 'reviewer attribution is server-derived')
  check(!JSON.stringify(created.body).includes('passwordHash'), 'protected user fields are not serialized')
  const researchId = created.body.data.record.id

  equal((await request('/api/admin/eligibility-research', { method: 'POST', token: tokens.admin, body: valid })).status, 409, 'duplicate program and cycle research rejected')
  const updated = await request(`/api/admin/eligibility-research/${researchId}`, {
    method: 'PUT',
    token: tokens.co_owner,
    body: { ...valid, researchStatus: 'verified', unresolvedItems: [] },
  })
  equal(updated.status, 200, 'research review can be marked verified')
  equal(updated.body.data.record.reviewedBy.role, 'co_owner', 'latest reviewer attribution is server-derived')
  equal(updated.body.data.record.createdBy.role, 'owner', 'creator attribution is preserved')
  equal(await EligibilityRule.countDocuments(), 0, 'verified research creates no eligibility rule')
  equal(await SourceVerification.countDocuments(), 0, 'verified research creates no source-verification record')
  equal(await University.countDocuments(), 2, 'research tracker does not modify university count')
  equal(await Program.countDocuments(), 2, 'research tracker does not modify program count')
  equal(await AdmissionCycle.countDocuments(), 1, 'research tracker does not modify cycle count')

  const options = await request(`/api/admin/eligibility-research/options?university=${universityA.id}&program=${programA.id}`, { token: tokens.admin })
  equal(options.status, 200, 'bounded relationship options load')
  equal(options.body.data.programs.length, 1, 'options include only selected university programs')
  equal(options.body.data.admissionCycles.length, 1, 'options include only cycles offering the program')

  console.log(`Validated ${checks} focused eligibility-research checks.`)
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState) {
    if (ownsDatabase) await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
}
