import 'dotenv/config'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import app from '../src/app.js'
import validateEnvironment from '../src/config/environment.js'
import {
  AdmissionCycle,
  Program,
  SourceVerification,
  StudentProfile,
  University,
  User,
} from '../src/models/index.js'
import { signAccessToken } from '../src/utils/jwt.js'

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const slugPrefix = `temporary-catalogue-${runId}`
const adminEmail = `${slugPrefix}-admin@example.invalid`
const studentEmail = `${slugPrefix}-student@example.invalid`
const universitySlugs = [`${slugPrefix}-university`, `${slugPrefix}-draft-university`]
const programSlugs = [`${slugPrefix}-program`, `${slugPrefix}-draft-program`]
const createdUniversityIds = []
const createdProgramIds = []
const createdAdmissionCycleIds = []
const createdUserIds = []
let server
let assertions = 0
let identifiersReserved = false

function check(value, message) {
  assertions += 1
  assert.ok(value, message)
}

function equal(actual, expected, message) {
  assertions += 1
  assert.equal(actual, expected, message)
}

async function request(baseUrl, path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const payload = await response.json()
  return { response, payload }
}

async function expectStatus(baseUrl, path, expectedStatus, options) {
  const result = await request(baseUrl, path, options)
  equal(result.response.status, expectedStatus, `${options?.method || 'GET'} ${path}`)
  return result.payload
}

function source(path, verificationStatus = 'verified') {
  return {
    officialUrl: `https://example.invalid/${slugPrefix}/${path}`,
    verificationStatus,
    ...(verificationStatus === 'verified' && { lastVerifiedAt: new Date().toISOString() }),
  }
}

function universityBody({ draft = false } = {}) {
  return {
    name: draft ? `Synthetic Draft University ${runId}` : `Synthetic Catalogue University ${runId}`,
    slug: draft ? universitySlugs[1] : universitySlugs[0],
    abbreviation: draft ? 'SDU' : 'SCU',
    sector: draft ? 'private' : 'public',
    institutionType: draft ? 'general' : 'technology',
    establishedYear: 2001,
    recognitionBodies: ['Synthetic validation body'],
    campuses: [{
      name: 'Synthetic Main Campus',
      city: draft ? 'Faisalabad' : 'Lahore',
      province: 'Punjab',
      isMainCampus: true,
      isActive: true,
    }, ...(!draft ? [{
      name: 'Synthetic Secondary Campus',
      city: 'Rawalpindi',
      province: 'Punjab',
      isMainCampus: false,
      isActive: true,
    }, {
      name: 'Synthetic Inactive Campus',
      city: 'Multan',
      province: 'Punjab',
      isMainCampus: false,
      isActive: false,
    }] : [])],
    contact: { websiteUrl: `https://example.invalid/${slugPrefix}` },
    source: source(draft ? 'draft-university' : 'university', draft ? 'unverified' : 'verified'),
    recordStatus: draft ? 'draft' : 'published',
  }
}

function programBody(universityId, campusId, { draft = false } = {}) {
  return {
    university: universityId,
    name: draft ? `Synthetic Draft Program ${runId}` : `Synthetic CIT Program ${runId}`,
    slug: draft ? programSlugs[1] : programSlugs[0],
    degreeTitle: draft ? 'Synthetic Bachelor of Science' : 'Synthetic Bachelor of Technology',
    credentialType: draft ? 'BS' : 'BTech',
    degreeLevel: 'undergraduate',
    department: 'Synthetic Computing Department',
    disciplineCode: draft ? 'SYN-DRAFT' : 'SYN-CIT',
    duration: { years: 4, semesters: 8 },
    campusIds: [campusId],
    studyMode: draft ? 'evening' : 'morning',
    source: source(draft ? 'draft-program' : 'program', draft ? 'unverified' : 'verified'),
    recordStatus: draft ? 'draft' : 'published',
  }
}

async function cleanup() {
  const universityObjectIds = createdUniversityIds
    .filter((id) => mongoose.isObjectIdOrHexString(id))
    .map((id) => new mongoose.Types.ObjectId(id))
  const programObjectIds = createdProgramIds
    .filter((id) => mongoose.isObjectIdOrHexString(id))
    .map((id) => new mongoose.Types.ObjectId(id))
  const userObjectIds = createdUserIds
    .filter((id) => mongoose.isObjectIdOrHexString(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  await AdmissionCycle.deleteMany({
    $or: [
      { _id: { $in: createdAdmissionCycleIds } },
      { university: { $in: universityObjectIds } },
    ],
  })

  await SourceVerification.deleteMany({
    $or: [
      { entityModel: 'University', entity: { $in: universityObjectIds } },
      { entityModel: 'Program', entity: { $in: programObjectIds } },
    ],
  })
  await Program.deleteMany({
    $or: [
      { _id: { $in: programObjectIds } },
      { university: { $in: universityObjectIds } },
      ...(identifiersReserved ? [{ slug: { $in: programSlugs } }] : []),
    ],
  })
  await University.deleteMany({
    $or: [
      { _id: { $in: universityObjectIds } },
      ...(identifiersReserved ? [{ slug: { $in: universitySlugs } }] : []),
    ],
  })
  await StudentProfile.deleteMany({ user: { $in: userObjectIds } })
  await User.deleteMany({
    $or: [
      { _id: { $in: userObjectIds } },
      ...(identifiersReserved ? [{ email: { $in: [adminEmail, studentEmail] } }] : []),
    ],
  })
}

async function main() {
  validateEnvironment()
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  await Promise.all([User.init(), University.init(), Program.init()])

  const preexistingFixtureRecords = await Promise.all([
    User.countDocuments({ email: { $in: [adminEmail, studentEmail] } }),
    University.countDocuments({ slug: { $in: universitySlugs } }),
    Program.countDocuments({ slug: { $in: programSlugs } }),
  ])
  assert.deepEqual(
    preexistingFixtureRecords,
    [0, 0, 0],
    'Temporary catalogue identifiers unexpectedly collide with existing data.',
  )
  identifiersReserved = true

  const passwordHash = await bcrypt.hash(`Temporary-${runId}`, 12)
  const [admin, student] = await User.create([
    {
      name: 'Temporary Catalogue Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      accountStatus: 'active',
    },
    {
      name: 'Temporary Catalogue Student',
      email: studentEmail,
      passwordHash,
      role: 'student',
      accountStatus: 'active',
    },
  ])
  createdUserIds.push(admin._id.toString(), student._id.toString())
  const adminToken = signAccessToken(admin)
  const studentToken = signAccessToken(student)

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`

  await expectStatus(baseUrl, '/api/admin/universities', 401)
  await expectStatus(baseUrl, '/api/admin/universities', 403, { token: studentToken })
  const emptyList = await expectStatus(baseUrl, '/api/admin/universities?page=1&pageSize=5', 200, { token: adminToken })
  check(Array.isArray(emptyList.data.universities), 'Administrator university access should succeed.')

  const unknownUniversity = await expectStatus(baseUrl, '/api/admin/universities', 400, {
    method: 'POST',
    token: adminToken,
    body: { ...universityBody(), role: 'admin' },
  })
  equal(unknownUniversity.code, 'REQUEST_VALIDATION_ERROR', 'Unknown university fields should be rejected.')
  await expectStatus(baseUrl, '/api/admin/universities/not-an-object-id', 400, { token: adminToken })
  await expectStatus(baseUrl, '/api/admin/universities', 400, {
    method: 'POST',
    token: adminToken,
    body: { $set: { recordStatus: 'published' } },
  })
  await expectStatus(baseUrl, '/api/admin/universities?search%5B%24gt%5D=x', 400, { token: adminToken })
  const prototypeBody = {
    ...universityBody(),
    ...JSON.parse('{"__proto__":{"cataloguePolluted":true}}'),
  }
  await expectStatus(baseUrl, '/api/admin/universities', 400, {
    method: 'POST', token: adminToken, body: prototypeBody,
  })
  check(Object.prototype.cataloguePolluted === undefined, 'Prototype-pollution input must have no effect.')
  await expectStatus(baseUrl, '/api/admin/universities', 400, {
    method: 'POST',
    token: adminToken,
    body: { ...universityBody(), constructor: { prototype: { cataloguePolluted: true } } },
  })
  await expectStatus(baseUrl, '/api/admin/universities', 400, {
    method: 'POST',
    token: adminToken,
    body: { ...universityBody(), slug: 'a'.repeat(24) },
  })
  await expectStatus(baseUrl, '/api/admin/universities', 400, {
    method: 'POST',
    token: adminToken,
    body: {
      ...universityBody(),
      source: { officialUrl: 'https://user:password@example.invalid/source' },
    },
  })

  const universityCreated = await expectStatus(baseUrl, '/api/admin/universities', 201, {
    method: 'POST', token: adminToken, body: universityBody(),
  })
  const university = universityCreated.data.university
  createdUniversityIds.push(university.id)
  equal(university.slug, universitySlugs[0], 'University slug should be normalized and returned.')
  check(university.campuses[0].id, 'Administrator response should expose campus identifiers.')

  await expectStatus(baseUrl, '/api/admin/universities', 409, {
    method: 'POST', token: adminToken, body: universityBody(),
  })

  const draftUniversityCreated = await expectStatus(baseUrl, '/api/admin/universities', 201, {
    method: 'POST', token: adminToken, body: universityBody({ draft: true }),
  })
  const draftUniversity = draftUniversityCreated.data.university
  createdUniversityIds.push(draftUniversity.id)

  const universityList = await expectStatus(
    baseUrl,
    `/api/admin/universities?search=${encodeURIComponent(runId)}&page=1&pageSize=1&sort=-createdAt`,
    200,
    { token: adminToken },
  )
  equal(universityList.data.pagination.pageSize, 1, 'University page size should be applied.')
  equal(universityList.data.pagination.totalRecords, 2, 'University search should find both temporary records.')
  equal(universityList.data.pagination.totalPages, 2, 'University pagination should report total pages.')
  const defaultPagination = await expectStatus(
    baseUrl,
    `/api/admin/universities?search=${encodeURIComponent(runId)}`,
    200,
    { token: adminToken },
  )
  equal(defaultPagination.data.pagination.pageSize, 20, 'Default page size should be 20.')
  await expectStatus(baseUrl, '/api/admin/universities?pageSize=101', 400, { token: adminToken })
  await expectStatus(baseUrl, '/api/admin/universities?search=', 400, { token: adminToken })
  const literalSearchResult = await expectStatus(
    baseUrl,
    '/api/admin/universities?search=%2E%2A',
    200,
    { token: adminToken },
  )
  equal(literalSearchResult.data.pagination.totalRecords, 0, 'Search metacharacters should be treated literally.')

  const filteredUniversities = await expectStatus(
    baseUrl,
    '/api/admin/universities?city=Lahore&sector=public&institutionType=technology&recordStatus=published&verificationStatus=verified',
    200,
    { token: adminToken },
  )
  check(filteredUniversities.data.universities.some((item) => item.id === university.id), 'University filters should match the published record.')

  const universityDetail = await expectStatus(baseUrl, `/api/admin/universities/${university.id}`, 200, { token: adminToken })
  equal(universityDetail.data.university.id, university.id, 'University detail should return the requested record.')

  const universityUpdated = await expectStatus(baseUrl, `/api/admin/universities/${university.id}`, 200, {
    method: 'PUT', token: adminToken, body: { name: `Synthetic Updated University ${runId}` },
  })
  check(universityUpdated.data.university.name.startsWith('Synthetic Updated'), 'University update should persist.')
  const universityContactUpdated = await expectStatus(baseUrl, `/api/admin/universities/${university.id}`, 200, {
    method: 'PUT', token: adminToken, body: { contact: { phone: '+92 00 0000000' } },
  })
  equal(universityContactUpdated.data.university.contact.phone, '+92 00 0000000', 'Nested university updates should persist.')
  equal(
    universityContactUpdated.data.university.contact.websiteUrl,
    university.contact.websiteUrl,
    'Nested university updates should preserve omitted fields.',
  )

  const nonexistentUniversityId = new mongoose.Types.ObjectId().toString()
  await expectStatus(baseUrl, '/api/admin/programs', 404, {
    method: 'POST',
    token: adminToken,
    body: programBody(nonexistentUniversityId, university.campuses[0].id),
  })
  await expectStatus(baseUrl, '/api/admin/programs/not-an-object-id', 400, { token: adminToken })
  await expectStatus(baseUrl, '/api/admin/programs', 400, {
    method: 'POST',
    token: adminToken,
    body: {
      ...programBody(university.id, university.campuses[0].id),
      campusIds: [university.campuses[0].id, university.campuses[0].id.toUpperCase()],
    },
  })
  await expectStatus(baseUrl, '/api/admin/programs', 400, {
    method: 'POST',
    token: adminToken,
    body: programBody(university.id, draftUniversity.campuses[0].id),
  })

  const programCreated = await expectStatus(baseUrl, '/api/admin/programs', 201, {
    method: 'POST',
    token: adminToken,
    body: programBody(university.id, university.campuses[0].id),
  })
  const program = programCreated.data.program
  createdProgramIds.push(program.id)
  equal(program.university.id, university.id, 'Program response should populate its university.')

  await expectStatus(baseUrl, `/api/admin/universities/${university.id}`, 409, {
    method: 'PUT',
    token: adminToken,
    body: {
      campuses: university.campuses.slice(1).map((campus, index) => ({
        id: campus.id,
        name: campus.name,
        city: campus.city,
        province: campus.province,
        isMainCampus: index === 0,
        isActive: campus.isActive,
      })),
    },
  })

  await expectStatus(baseUrl, '/api/admin/programs', 409, {
    method: 'POST',
    token: adminToken,
    body: programBody(university.id, university.campuses[0].id),
  })

  const draftProgramCreated = await expectStatus(baseUrl, '/api/admin/programs', 201, {
    method: 'POST',
    token: adminToken,
    body: programBody(draftUniversity.id, draftUniversity.campuses[0].id, { draft: true }),
  })
  const draftProgram = draftProgramCreated.data.program
  createdProgramIds.push(draftProgram.id)

  await expectStatus(baseUrl, '/api/admin/programs', 400, {
    method: 'POST', token: adminToken, body: { $where: 'return true' },
  })
  await expectStatus(baseUrl, `/api/admin/programs/${program.id}`, 400, {
    method: 'PUT', token: adminToken, body: { $set: { recordStatus: 'archived' } },
  })
  await expectStatus(baseUrl, '/api/admin/programs?sort=unsafe', 400, { token: adminToken })

  const programList = await expectStatus(
    baseUrl,
    `/api/admin/programs?search=${encodeURIComponent(runId)}&sort=-name&page=1&pageSize=1`,
    200,
    { token: adminToken },
  )
  equal(programList.data.pagination.totalRecords, 2, 'Program search should find both temporary records.')
  equal(programList.data.pagination.totalPages, 2, 'Program pagination should report total pages.')

  const filteredPrograms = await expectStatus(
    baseUrl,
    `/api/admin/programs?university=${universitySlugs[0]}&city=Lahore&institutionType=technology&credentialType=BTech&degreeLevel=undergraduate&studyMode=morning&recordStatus=published&verificationStatus=verified&sort=degreeTitle`,
    200,
    { token: adminToken },
  )
  equal(filteredPrograms.data.programs.length, 1, 'Combined program filters should match one record.')
  equal(filteredPrograms.data.programs[0].id, program.id, 'Program filters should return the expected record.')

  const otherCampusPrograms = await expectStatus(
    baseUrl,
    `/api/admin/programs?university=${university.id}&city=Rawalpindi`,
    200,
    { token: adminToken },
  )
  equal(otherCampusPrograms.data.programs.length, 0, 'A city filter should respect a program-specific campus assignment.')

  const programDetail = await expectStatus(baseUrl, `/api/admin/programs/${program.id}`, 200, { token: adminToken })
  equal(programDetail.data.program.id, program.id, 'Program detail should return the requested record.')

  const programUpdated = await expectStatus(baseUrl, `/api/admin/programs/${program.id}`, 200, {
    method: 'PUT',
    token: adminToken,
    body: { department: 'Updated Synthetic Department', duration: { years: 5 } },
  })
  equal(programUpdated.data.program.department, 'Updated Synthetic Department', 'Program update should persist.')
  equal(programUpdated.data.program.duration.years, 5, 'Nested program updates should persist.')
  equal(programUpdated.data.program.duration.semesters, 8, 'Nested program updates should preserve omitted fields.')

  const publicUniversities = await expectStatus(
    baseUrl,
    `/api/universities?search=${encodeURIComponent(runId)}&city=Lahore&sector=public&institutionType=technology&page=1&pageSize=10&sort=name`,
    200,
  )
  equal(publicUniversities.data.universities.length, 1, 'Public universities should exclude draft/unverified records.')
  const publicUniversity = publicUniversities.data.universities[0]
  equal(publicUniversity.id, university.id, 'Public university list should include the verified record.')
  check(!Object.hasOwn(publicUniversity, 'recordStatus'), 'Public university should omit record status.')
  check(!Object.hasOwn(publicUniversity.source, 'verificationRecord'), 'Public university should omit verification history references.')
  check(!Object.hasOwn(publicUniversity.campuses[0], 'id'), 'Public university should omit internal campus identifiers.')
  check(publicUniversity.campuses.every((campus) => campus.isActive), 'Public university should omit inactive campuses.')
  check(!publicUniversity.campuses.some((campus) => campus.city === 'Multan'), 'Inactive campuses should not be serialized publicly.')

  const publicUniversityDetail = await expectStatus(baseUrl, `/api/universities/${universitySlugs[0]}`, 200)
  equal(publicUniversityDetail.data.university.id, university.id, 'Public university detail should support slug lookup.')
  await expectStatus(baseUrl, `/api/universities/${universitySlugs[1]}`, 404)

  const publicPrograms = await expectStatus(
    baseUrl,
    `/api/programs?search=${encodeURIComponent(runId)}&university=${universitySlugs[0]}&city=Lahore&institutionType=technology&credentialType=BTech&degreeLevel=undergraduate&studyMode=morning&page=1&pageSize=10&sort=-degreeTitle`,
    200,
  )
  equal(publicPrograms.data.programs.length, 1, 'Public programs should exclude draft/unverified records.')
  const publicProgram = publicPrograms.data.programs[0]
  equal(publicProgram.id, program.id, 'Public program list should include the verified record.')
  check(!Object.hasOwn(publicProgram, 'recordStatus'), 'Public program should omit record status.')
  check(!Object.hasOwn(publicProgram, 'campusIds'), 'Public program should omit internal campus identifiers.')
  check(!Object.hasOwn(publicProgram.campuses[0], 'id'), 'Public program campuses should omit internal identifiers.')
  check(!Object.hasOwn(publicProgram.source, 'verificationRecord'), 'Public program should omit verification history references.')

  const publicProgramDetail = await expectStatus(baseUrl, `/api/programs/${program.id}`, 200)
  equal(publicProgramDetail.data.program.id, program.id, 'Public program detail should return the requested record.')
  await expectStatus(baseUrl, `/api/programs/${draftProgram.id}`, 404)

  await expectStatus(baseUrl, `/api/admin/programs/${draftProgram.id}`, 400, {
    method: 'PUT',
    token: adminToken,
    body: { source: { verificationStatus: 'verified' } },
  })
  const verificationRecord = await SourceVerification.create({
    entityModel: 'Program',
    entity: draftProgram.id,
    sourceUrl: `https://example.invalid/${slugPrefix}/verification-record`,
    sourceTitle: 'Synthetic catalogue verification fixture',
    sourceType: 'official_webpage',
    status: 'pending_review',
  })
  await Program.updateOne(
    { _id: draftProgram.id },
    { $set: { 'source.verificationRecord': verificationRecord._id } },
  )
  const verificationUpdated = await expectStatus(baseUrl, `/api/admin/programs/${draftProgram.id}`, 200, {
    method: 'PUT',
    token: adminToken,
    body: {
      source: {
        verificationStatus: 'verified',
        lastVerifiedAt: new Date().toISOString(),
      },
    },
  })
  check(
    !Object.hasOwn(verificationUpdated.data.program.source, 'verificationRecord'),
    'Changing verification metadata should clear a stale verification reference.',
  )

  const sourceReset = await expectStatus(baseUrl, `/api/admin/programs/${draftProgram.id}`, 200, {
    method: 'PUT',
    token: adminToken,
    body: { source: { officialUrl: `https://example.invalid/${slugPrefix}/replacement` } },
  })
  equal(sourceReset.data.program.source.verificationStatus, 'pending_review', 'Changing a source URL should invalidate the prior verification state.')
  check(!Object.hasOwn(sourceReset.data.program.source, 'lastVerifiedAt'), 'Changing a source URL should clear the old verification date.')

  await expectStatus(baseUrl, `/api/admin/universities/${university.id}`, 200, {
    method: 'PUT', token: adminToken, body: { source: { verificationStatus: 'needs_update' } },
  })
  await expectStatus(baseUrl, `/api/universities/${university.id}`, 404)
  await expectStatus(baseUrl, `/api/programs/${program.id}`, 404)
  await expectStatus(baseUrl, `/api/admin/universities/${university.id}`, 200, {
    method: 'PUT',
    token: adminToken,
    body: {
      source: {
        verificationStatus: 'verified',
        lastVerifiedAt: new Date().toISOString(),
      },
    },
  })

  const blockedDeletion = await expectStatus(baseUrl, `/api/admin/universities/${university.id}`, 409, {
    method: 'DELETE', token: adminToken,
  })
  equal(blockedDeletion.code, 'UNIVERSITY_HAS_DEPENDENCIES', 'University deletion should explain dependency conflicts.')

  const admissionCycle = await AdmissionCycle.create({
    university: university.id,
    name: `Temporary Catalogue Cycle ${runId}`,
    academicYear: '2099',
    intake: 'annual',
    programOfferings: [{ program: program.id, status: 'announced' }],
    source: source('admission-cycle', 'unverified'),
    cycleStatus: 'draft',
  })
  createdAdmissionCycleIds.push(admissionCycle._id)
  const blockedUniversityChange = await expectStatus(baseUrl, `/api/admin/programs/${program.id}`, 409, {
    method: 'PUT',
    token: adminToken,
    body: {
      university: draftUniversity.id,
      campusIds: [draftUniversity.campuses[0].id],
    },
  })
  equal(
    blockedUniversityChange.code,
    'PROGRAM_UNIVERSITY_CHANGE_CONFLICT',
    'Program reassignment should protect dependent institutional records.',
  )
  const blockedProgramDeletion = await expectStatus(baseUrl, `/api/admin/programs/${program.id}`, 409, {
    method: 'DELETE', token: adminToken,
  })
  equal(blockedProgramDeletion.code, 'PROGRAM_HAS_DEPENDENCIES', 'Program deletion should protect admission-cycle references.')
  await admissionCycle.deleteOne()

  await expectStatus(baseUrl, `/api/admin/programs/${program.id}`, 200, { method: 'DELETE', token: adminToken })
  await expectStatus(baseUrl, `/api/admin/universities/${university.id}`, 200, { method: 'DELETE', token: adminToken })

  const verificationBlockedDeletion = await expectStatus(baseUrl, `/api/admin/programs/${draftProgram.id}`, 409, {
    method: 'DELETE', token: adminToken,
  })
  equal(
    verificationBlockedDeletion.code,
    'PROGRAM_HAS_DEPENDENCIES',
    'Program deletion should protect source-verification history.',
  )
  await verificationRecord.deleteOne()
  await expectStatus(baseUrl, `/api/admin/programs/${draftProgram.id}`, 200, { method: 'DELETE', token: adminToken })
  await expectStatus(baseUrl, `/api/admin/universities/${draftUniversity.id}`, 200, { method: 'DELETE', token: adminToken })

  console.log(`Catalogue API validation passed: ${assertions} assertions.`)
}

try {
  await main()
} finally {
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    }
  } finally {
    if (mongoose.connection.readyState !== 0) {
      try {
        await cleanup()
        const remainingRecords = await Promise.all([
          User.countDocuments({ email: { $in: [adminEmail, studentEmail] } }),
          StudentProfile.countDocuments({ user: { $in: createdUserIds } }),
          University.countDocuments({ slug: { $in: universitySlugs } }),
          Program.countDocuments({ slug: { $in: programSlugs } }),
          AdmissionCycle.countDocuments({
            $or: [
              { _id: { $in: createdAdmissionCycleIds } },
              { university: { $in: createdUniversityIds } },
            ],
          }),
          SourceVerification.countDocuments({
            $or: [
              { entityModel: 'University', entity: { $in: createdUniversityIds } },
              { entityModel: 'Program', entity: { $in: createdProgramIds } },
            ],
          }),
        ])
        assert.deepEqual(remainingRecords, [0, 0, 0, 0, 0, 0], 'Temporary catalogue data was not fully removed.')
        console.log('Temporary catalogue users and records removed.')
      } finally {
        await mongoose.disconnect()
      }
    }
  }
}
