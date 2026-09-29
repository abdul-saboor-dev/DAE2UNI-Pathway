import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import app from '../src/app.js'
import validateEnvironment from '../src/config/environment.js'
import User from '../src/models/User.js'
import University from '../src/models/University.js'
import Program from '../src/models/Program.js'
import SourceVerification from '../src/models/SourceVerification.js'
import CatalogueImportRun from '../src/models/CatalogueImportRun.js'
import EligibilityRule from '../src/models/EligibilityRule.js'
import MeritFormula from '../src/models/MeritFormula.js'
import EntryTest from '../src/models/EntryTest.js'
import AdmissionCycle from '../src/models/AdmissionCycle.js'
import { signAccessToken } from '../src/utils/jwt.js'

const unique = randomUUID().replaceAll('-', '')
const databaseName = `dae2uni_temporary_geographic_${unique}`
const slug = `temporary-geographic-${unique}`
let assertions = 0
let server
let temporaryDatabaseOwned = false

function equal(actual, expected, description) {
  assertions += 1
  assert.equal(actual, expected, description)
}

function check(actual, description) {
  assertions += 1
  assert.ok(actual, description)
}

function deepEqual(actual, expected, description) {
  assertions += 1
  assert.deepEqual(actual, expected, description)
}

async function request(path, { method = 'GET', token, body, rawBody } = {}) {
  const headers = { accept: 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  if (body !== undefined || rawBody !== undefined) headers['content-type'] = 'application/json'
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers, ...(body !== undefined && { body: JSON.stringify(body) }),
    ...(rawBody !== undefined && { body: rawBody }),
  })
  return { status: response.status, body: await response.json() }
}

function fixture(overrides = {}) {
  return { strategy: 'update_drafts', universities: [{
    slug, name: 'Temporary Geographic Fictional University', sector: 'private',
    institutionType: 'technology', provinceOrTerritory: 'Punjab', charterAuthority: 'provincial',
    campuses: [{ key: 'main', name: 'Temporary Fictional Main Campus', city: 'Lahore', province: 'Punjab', isMainCampus: true }],
    programs: [{ slug: 'temporary-cit', name: 'Temporary CIT Program', degreeTitle: 'Fictional Computing Degree',
      credentialType: 'BS', duration: { years: 4 }, campusKeys: ['main'],
      source: { officialUrl: 'https://example.invalid/program' } }],
    source: { officialUrl: 'https://example.invalid/university' },
  }], ...overrides }
}

function programsOnlyFixture(campusId, programs) {
  const body = fixture({ strategy: 'programs_only' })
  body.universities[0].name = 'This submitted university name must never replace the stored name'
  body.universities[0].source.officialUrl = 'https://example.invalid/ignored-university-source'
  body.universities[0].campuses[0] = { ...body.universities[0].campuses[0], id: campusId,
    name: 'This submitted campus name must never replace the stored campus name', isActive: false }
  body.universities[0].programs = programs || [
    { slug: 'temporary-cit', name: 'Existing program must not be replaced', degreeTitle: 'Existing program must not be replaced',
      credentialType: 'BS', duration: { years: 3 }, campusKeys: ['main'], source: { officialUrl: 'https://example.invalid/existing-replacement' } },
    { slug: 'temporary-programs-only', name: 'Temporary Programs Only', degreeTitle: 'Fictional Computing Degree',
      credentialType: 'BS', duration: { years: 4 }, campusKeys: ['main'], source: { officialUrl: 'https://example.invalid/programs-only' } },
    { slug: 'temporary-unresolved-campus', name: 'Temporary Unresolved Campus Program', degreeTitle: 'Fictional Unresolved Degree',
      credentialType: 'BS', duration: { years: 4 }, campusKeys: [], source: { officialUrl: 'https://example.invalid/unresolved' } },
  ]
  return body
}

async function main() {
  validateEnvironment()
  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 5000 })
  const databases = await mongoose.connection.db.admin().listDatabases({ nameOnly: true })
  if (databases.databases.some((item) => item.name === databaseName)) {
    throw new Error('Refusing to use an existing database as a temporary fixture.')
  }
  temporaryDatabaseOwned = true
  await Promise.all([User.init(), University.init(), Program.init()])
  const passwordHash = await bcrypt.hash(`Temporary-${unique}`, 12)
  const users = await User.create(['owner', 'co_owner', 'admin', 'student'].map((role) => ({
    name: `Temporary ${role}`, email: `${slug}-${role}@example.invalid`, passwordHash, role, accountStatus: 'active',
    ...(role === 'owner' && { ownerMarker: 'permanent_owner' }),
  })))
  const tokens = Object.fromEntries(users.map((user) => [user.role, signAccessToken(user)]))
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
  const previewPath = '/api/admin/catalogue-import/preview'
  const applyPath = '/api/admin/catalogue-import/apply'
  const queuePath = '/api/admin/verification-queue'

  equal((await request(previewPath, { method: 'POST', body: fixture() })).status, 401, 'Import requires login')
  equal((await request(previewPath, { method: 'POST', token: tokens.student, body: fixture() })).status, 403, 'Student cannot import')
  for (const role of ['owner', 'co_owner', 'admin']) {
    equal((await request(previewPath, { method: 'POST', token: tokens[role], body: fixture() })).status, 200, `${role} can preview`)
  }
  equal(await University.countDocuments(), 0, 'Preview creates no university')
  equal(await Program.countDocuments(), 0, 'Preview creates no program')
  equal(await CatalogueImportRun.countDocuments(), 0, 'Preview creates no import audit')
  equal((await request(previewPath, { method: 'POST', token: tokens.admin, body: { ...fixture(), arbitrary: true } })).status, 400, 'Unknown root field rejected')
  equal((await request(previewPath, { method: 'POST', token: tokens.admin, body: fixture({ universities: [{ ...fixture().universities[0], $set: { role: 'owner' } }] }) })).body.data.totals.invalid, 2, 'Operator in record rejected')
  const polluted = JSON.parse(JSON.stringify(fixture()).replace('"name":"Temporary Geographic Fictional University"', '"__proto__":{"polluted":true},"name":"Temporary Geographic Fictional University"'))
  equal((await request(previewPath, { method: 'POST', token: tokens.admin, body: polluted })).body.data.totals.invalid, 2, 'Prototype key rejected')
  check(Object.prototype.polluted === undefined, 'Prototype remains untouched')
  equal((await request(previewPath, { method: 'POST', token: tokens.admin, body: fixture({ universities: [fixture().universities[0], fixture().universities[0]] }) })).body.data.totals.invalid, 2, 'Duplicate university detected')
  const badCampus = fixture()
  badCampus.universities[0].programs[0].campusKeys = ['other-university-campus']
  equal((await request(previewPath, { method: 'POST', token: tokens.admin, body: badCampus })).body.data.totals.invalid, 2, 'Cross-university campus key rejected')
  const beyondScope = fixture()
  beyondScope.universities[0].campuses[0].province = 'Sindh'
  equal((await request(previewPath, { method: 'POST', token: tokens.admin, body: beyondScope })).body.data.totals.invalid, 2, 'Provincial record without Punjab campus rejected')
  equal((await request(applyPath, { method: 'POST', token: tokens.admin, body: fixture() })).status, 400, 'Apply needs confirmation')
  const oversized = await request(previewPath, { method: 'POST', token: tokens.admin, rawBody: JSON.stringify({ padding: 'a'.repeat(530000) }) })
  equal(oversized.status, 413, 'Payload limit enforced')
  const applied = await request(applyPath, { method: 'POST', token: tokens.admin, body: { ...fixture(), confirmed: true } })
  equal(applied.status, 200, 'Apply succeeds')
  equal(applied.body.data.totals.created, 2, 'University and program counted')
  let university = await University.findOne({ slug })
  let program = await Program.findOne({ university: university._id, slug: 'temporary-cit' })
  check(university && program, 'Nested import persisted')
  equal(university.recordStatus, 'draft', 'University remains draft')
  equal(program.source.verificationStatus, 'pending_review', 'Program awaits verification')
  equal(university.hecRecognitionStatus, 'unverified', 'HEC recognition is not invented')
  equal((await request(`/api/admin/universities/${university.id}`, { method: 'PUT', token: tokens.admin,
    body: { hecProfileUrl: 'https://user:pass@example.invalid/profile' } })).status, 400, 'Embedded URL credentials rejected')
  equal((await request(`/api/admin/universities/${university.id}`, { method: 'PUT', token: tokens.admin,
    body: { hecProfileUrl: 'https://example.invalid/profile' } })).status, 200, 'HEC profile URL can be added')
  equal((await request(`/api/admin/universities/${university.id}`, { method: 'PUT', token: tokens.admin,
    body: { hecProfileUrl: null } })).status, 200, 'HEC profile URL can be cleared')
  const geographicList = await request(`/api/admin/universities?provinceOrTerritory=Punjab&charterAuthority=provincial&hecRecognitionStatus=unverified`, { token: tokens.admin })
  equal(geographicList.body.data.pagination.totalRecords, 1, 'Administrative geography and HEC filters match')
  equal((await request('/api/admin/universities?provinceOrTerritory=Sindh', { token: tokens.admin })).body.data.pagination.totalRecords, 0, 'Other province filter excludes record')
  const campusId = university.campuses[0]._id.toString()
  const draftUpdate = fixture()
  draftUpdate.universities[0].name = 'Temporary Geographic Revised University'
  draftUpdate.universities[0].campuses[0].name = 'Temporary Revised Campus'
  const updated = await request(applyPath, { method: 'POST', token: tokens.admin, body: { ...draftUpdate, confirmed: true } })
  equal(updated.body.data.totals.updated, 2, 'Drafts update with explicit strategy')
  university = await University.findOne({ slug })
  equal(university.campuses[0]._id.toString(), campusId, 'Campus ID preserved')
  equal((await request(`/api/admin/universities/${university.id}`, { method: 'PUT', token: tokens.admin,
    body: { campuses: [{ id: campusId, name: 'Temporary Admin-Edited Campus', city: 'Lahore',
      province: 'Punjab', isMainCampus: true, isActive: true }] } })).status, 200, 'Ordinary campus edit succeeds')
  university = await University.findOne({ slug })
  equal(university.campuses[0].importKey, 'main', 'Ordinary edit preserves import key')
  equal((await request(applyPath, { method: 'POST', token: tokens.admin,
    body: { ...draftUpdate, confirmed: true } })).body.data.totals.updated, 2, 'Import still matches campus after ordinary edit')
  university = await University.findOne({ slug })
  equal(university.campuses[0]._id.toString(), campusId, 'Cross-workflow campus identity remains stable')
  const skipped = await request(previewPath, { method: 'POST', token: tokens.admin, body: { ...fixture(), strategy: 'skip' } })
  equal(skipped.body.data.totals.skipped, 2, 'Matching record can be skipped')

  const universitySnapshot = await University.collection.findOne({ _id: university._id })
  const existingProgramSnapshot = await Program.collection.findOne({ _id: program._id })
  const relatedBefore = await Promise.all([SourceVerification.countDocuments(), EligibilityRule.countDocuments(),
    MeritFormula.countDocuments(), EntryTest.countDocuments(), AdmissionCycle.countDocuments()])
  const programsOnly = programsOnlyFixture(campusId)
  for (const role of ['owner', 'co_owner', 'admin']) {
    equal((await request(previewPath, { method: 'POST', token: tokens[role], body: programsOnly })).status, 200,
      `${role} can preview programs-only imports`)
  }
  const programsPreview = await request(previewPath, { method: 'POST', token: tokens.admin, body: programsOnly })
  deepEqual(programsPreview.body.data.programSummary, { matchedUniversities: 1, programsToCreate: 2,
    existingProgramsSkipped: 1, missingUniversities: 0, campusConflicts: 0, invalidPrograms: 0 },
  'Programs-only preview reports precise program actions')
  equal(programsPreview.body.data.totals.created, 2, 'Preview counts only new programs as created')
  equal(programsPreview.body.data.totals.updated, 0, 'Preview updates no university or program')
  equal(await Program.countDocuments({ university: university._id }), 1, 'Programs-only preview writes no program')
  deepEqual(await University.collection.findOne({ _id: university._id }), universitySnapshot,
    'Dry run leaves the complete university document byte-equivalent')

  const programsApplied = await request(applyPath, { method: 'POST', token: tokens.admin,
    body: { ...programsOnly, confirmed: true } })
  equal(programsApplied.status, 200, 'Programs-only apply succeeds')
  deepEqual(programsApplied.body.data.programSummary, programsPreview.body.data.programSummary,
    'Programs-only apply action summary matches its preview')
  deepEqual(programsApplied.body.data.totals, programsPreview.body.data.totals,
    'Programs-only apply totals match its preview')
  deepEqual(await University.collection.findOne({ _id: university._id }), universitySnapshot,
    'Programs-only apply does not change any university or campus field, order, ID, status, or timestamp')
  deepEqual(await Program.collection.findOne({ _id: program._id }), existingProgramSnapshot,
    'Programs-only apply does not change an existing program')
  const createdProgram = await Program.findOne({ university: university._id, slug: 'temporary-programs-only' })
  const unresolvedProgram = await Program.findOne({ university: university._id, slug: 'temporary-unresolved-campus' })
  equal(createdProgram.recordStatus, 'draft', 'Programs-only record is forced to draft')
  equal(createdProgram.source.verificationStatus, 'pending_review', 'Programs-only source awaits review')
  equal(createdProgram.campusIds[0].toString(), campusId, 'Programs-only resolves the stored campus ID')
  equal(unresolvedProgram.campusIds.length, 0, 'Supported unresolved campus assignment remains empty')
  deepEqual(await Promise.all([SourceVerification.countDocuments(), EligibilityRule.countDocuments(),
    MeritFormula.countDocuments(), EntryTest.countDocuments(), AdmissionCycle.countDocuments()]), relatedBefore,
  'Programs-only import creates no verification, eligibility, merit, entry-test, or cycle records')
  check(await CatalogueImportRun.exists({ actor: users[2]._id, strategy: 'programs_only' }),
    'Programs-only apply retains actor audit attribution')

  const repeated = await request(applyPath, { method: 'POST', token: tokens.admin,
    body: { ...programsOnly, confirmed: true } })
  equal(repeated.body.data.programSummary.programsToCreate, 0, 'Repeated programs-only import creates nothing')
  equal(repeated.body.data.programSummary.existingProgramsSkipped, 3, 'Repeated programs-only import skips all matches')
  equal(await Program.countDocuments({ university: university._id }), 3, 'Repeated programs-only import is idempotent')
  deepEqual(await University.collection.findOne({ _id: university._id }), universitySnapshot,
    'Idempotent reapply still leaves university unchanged')

  const missing = programsOnlyFixture(campusId, [programsOnly.universities[0].programs[1]])
  missing.universities[0].slug = `${slug}-missing`
  const missingResult = await request(previewPath, { method: 'POST', token: tokens.admin, body: missing })
  equal(missingResult.body.data.programSummary.missingUniversities, 1, 'Missing university is reported')
  equal(missingResult.body.data.programSummary.programsToCreate, 0, 'Missing university plans no program')

  const badProgramsCampus = programsOnlyFixture(new mongoose.Types.ObjectId().toString(),
    [{ ...programsOnly.universities[0].programs[1], slug: 'temporary-bad-campus' }])
  const badProgramsCampusResult = await request(previewPath, { method: 'POST', token: tokens.admin, body: badProgramsCampus })
  equal(badProgramsCampusResult.body.data.programSummary.campusConflicts, 1, 'Nonexistent or foreign campus ID conflicts')
  equal(await Program.countDocuments({ slug: 'temporary-bad-campus' }), 0, 'Campus conflict writes no program')
  const nonexistentKeyBody = programsOnlyFixture(campusId,
    [{ ...programsOnly.universities[0].programs[1], slug: 'temporary-nonexistent-campus-key', campusKeys: ['missing-campus'] }])
  nonexistentKeyBody.universities[0].campuses[0].key = 'missing-campus'
  delete nonexistentKeyBody.universities[0].campuses[0].id
  const nonexistentKeyResult = await request(previewPath, { method: 'POST', token: tokens.admin, body: nonexistentKeyBody })
  equal(nonexistentKeyResult.body.data.programSummary.campusConflicts, 1, 'Nonexistent stored campus key conflicts')
  equal(await Program.countDocuments({ slug: 'temporary-nonexistent-campus-key' }), 0, 'Nonexistent campus key writes no program')

  const duplicateProgramInput = programsOnlyFixture(campusId,
    [programsOnly.universities[0].programs[1], programsOnly.universities[0].programs[1]])
  const duplicateProgramResult = await request(previewPath, { method: 'POST', token: tokens.admin, body: duplicateProgramInput })
  check(duplicateProgramResult.body.data.totals.invalid > 0, 'Duplicate program slugs in one group are rejected')
  const protectedStateInput = programsOnlyFixture(campusId,
    [{ ...programsOnly.universities[0].programs[1], slug: 'temporary-state-injection', recordStatus: 'published' }])
  const protectedStateResult = await request(previewPath, { method: 'POST', token: tokens.admin, body: protectedStateInput })
  check(protectedStateResult.body.data.totals.invalid > 0, 'Submitted publication or verification state is rejected')
  equal(protectedStateResult.body.data.programSummary.invalidPrograms, 1, 'Invalid program summary is precise')

  const concurrentProgram = { ...programsOnly.universities[0].programs[1], slug: 'temporary-concurrent-program' }
  const concurrentBody = programsOnlyFixture(campusId, [concurrentProgram])
  const concurrentResults = await Promise.all([1, 2].map(() => request(applyPath, { method: 'POST', token: tokens.admin,
    body: { ...concurrentBody, confirmed: true } })))
  equal(await Program.countDocuments({ university: university._id, slug: concurrentProgram.slug }), 1,
    'Concurrent programs-only applies cannot create duplicates')
  equal(concurrentResults.reduce((total, item) => total + item.body.data.totals.created, 0), 1,
    'Only one concurrent apply reports a created program')
  deepEqual(await University.collection.findOne({ _id: university._id }), universitySnapshot,
    'Concurrent applies leave university and campuses unchanged')

  const ambiguitySlug = `${slug}-ambiguous`
  const ambiguousA = await University.create({ name: 'Temporary Ambiguous A', slug: `${ambiguitySlug}-a`, sector: 'private',
    provinceOrTerritory: 'Punjab', charterAuthority: 'provincial', campuses: [{ importKey: 'main', name: 'A', city: 'Lahore', province: 'Punjab' }],
    source: { officialUrl: 'https://example.invalid/a', verificationStatus: 'pending_review' }, recordStatus: 'draft' })
  const ambiguousB = await University.create({ name: 'Temporary Ambiguous B', slug: `${ambiguitySlug}-b`, sector: 'private',
    provinceOrTerritory: 'Punjab', charterAuthority: 'provincial', campuses: [{ importKey: 'main', name: 'B', city: 'Lahore', province: 'Punjab' }],
    source: { officialUrl: 'https://example.invalid/b', verificationStatus: 'pending_review' }, recordStatus: 'draft' })
  const crossUniversityBody = programsOnlyFixture(ambiguousA.campuses[0]._id.toString(),
    [{ ...programsOnly.universities[0].programs[1], slug: 'temporary-cross-university-campus' }])
  const crossUniversityResult = await request(previewPath, { method: 'POST', token: tokens.admin, body: crossUniversityBody })
  equal(crossUniversityResult.body.data.programSummary.campusConflicts, 1, 'Another university campus ID conflicts')
  equal(await Program.countDocuments({ slug: 'temporary-cross-university-campus' }), 0, 'Cross-university campus writes no program')
  const legacyCampusUniversity = await University.create({ name: 'Legacy Campus Identity University', slug: `${slug}-legacy-campus`, sector: 'private',
    provinceOrTerritory: 'Punjab', charterAuthority: 'provincial', campuses: [{ name: 'Legacy Campus', city: 'Lahore', province: 'Punjab' }],
    source: { officialUrl: 'https://example.invalid/legacy', verificationStatus: 'pending_review' }, recordStatus: 'draft' })
  const legacySnapshot = await University.collection.findOne({ _id: legacyCampusUniversity._id })
  const legacyCampusBody = programsOnlyFixture(legacyCampusUniversity.campuses[0]._id.toString(),
    [{ ...programsOnly.universities[0].programs[1], slug: 'temporary-explicit-campus-id' }])
  legacyCampusBody.universities[0].slug = legacyCampusUniversity.slug
  legacyCampusBody.universities[0].campuses[0].key = 'request-local-campus-reference'
  legacyCampusBody.universities[0].programs[0].campusKeys = ['request-local-campus-reference']
  const legacyCampusResult = await request(applyPath, { method: 'POST', token: tokens.admin,
    body: { ...legacyCampusBody, confirmed: true } })
  equal(legacyCampusResult.body.data.programSummary.programsToCreate, 1,
    'Explicit stored campus ID supports an older campus without an import key')
  deepEqual(await University.collection.findOne({ _id: legacyCampusUniversity._id }), legacySnapshot,
    'Programs-only does not add an import key or otherwise change a legacy campus')
  await Program.deleteMany({ university: legacyCampusUniversity._id })
  await University.deleteOne({ _id: legacyCampusUniversity._id })
  await University.collection.dropIndex('slug_1')
  await University.collection.updateMany({ _id: { $in: [ambiguousA._id, ambiguousB._id] } }, { $set: { slug: ambiguitySlug } })
  const ambiguousBody = programsOnlyFixture(ambiguousA.campuses[0]._id.toString(),
    [{ ...programsOnly.universities[0].programs[1], slug: 'temporary-ambiguous-program' }])
  ambiguousBody.universities[0].slug = ambiguitySlug
  const ambiguousResult = await request(previewPath, { method: 'POST', token: tokens.admin, body: ambiguousBody })
  equal(ambiguousResult.body.data.entries[0].code, 'AMBIGUOUS_UNIVERSITY', 'Ambiguous university identity conflicts')
  equal(await Program.countDocuments({ slug: 'temporary-ambiguous-program' }), 0, 'Ambiguous identity writes no program')
  await University.deleteMany({ _id: { $in: [ambiguousA._id, ambiguousB._id] } })
  await University.collection.createIndex({ slug: 1 }, { unique: true })

  const queue = await request(`${queuePath}?entityType=university&verificationStatus=pending_review&search=Temporary&page=1&pageSize=1`, { token: tokens.admin })
  equal(queue.status, 200, 'Queue filtering works')
  equal(queue.body.data.pagination.totalRecords, 1, 'Queue filtered total is correct')
  equal(queue.body.data.records.length, 1, 'Queue page is bounded')
  equal((await request(`${queuePath}?pageSize=101`, { token: tokens.admin })).status, 400, 'Queue page size bounded')
  equal((await request(`${queuePath}?search[$ne]=x`, { token: tokens.admin })).status, 400, 'Queue operator query rejected')
  equal((await request(queuePath, { token: tokens.student })).status, 403, 'Student cannot view queue')
  const verifyPath = `${queuePath}/university/${university.id}/verify`
  equal((await request(verifyPath, { method: 'POST', token: tokens.admin, body: { officialUrl: 'javascript:alert(1)', sourceTitle: 'Example', sourceType: 'official_webpage', confirmed: true } })).status, 400, 'Unsafe source rejected')
  const verification = await request(verifyPath, { method: 'POST', token: tokens.admin, body: {
    officialUrl: university.source.officialUrl, sourceTitle: 'Temporary fictional source reviewed manually',
    sourceType: 'official_webpage', confirmed: true,
  } })
  equal(verification.status, 200, 'Manual verification succeeds')
  equal(await SourceVerification.countDocuments({ entity: university._id }), 1, 'Verification history saved')
  const history = await SourceVerification.findOne({ entity: university._id })
  equal(history.verifiedBy.toString(), users[2].id, 'Verifier identity recorded')
  equal((await request(applyPath, { method: 'POST', token: tokens.admin, body: { ...fixture(), confirmed: true } })).body.data.totals.conflicted, 2, 'Verified university protected from import')
  program.recordStatus = 'published'
  program.source.verificationStatus = 'verified'
  program.source.lastVerifiedAt = new Date()
  await program.save()
  const protectedGroup = fixture({ universities: [{ ...fixture().universities[0], slug: `${slug}-protected-program`,
    name: 'Temporary Program Protection University' }] })
  const newProtected = await request(applyPath, { method: 'POST', token: tokens.admin, body: { ...protectedGroup, confirmed: true } })
  equal(newProtected.body.data.totals.created, 2, 'Second draft group created')
  const protectedUniversity = await University.findOne({ slug: `${slug}-protected-program` })
  const protectedProgram = await Program.findOne({ university: protectedUniversity._id, slug: 'temporary-cit' })
  protectedProgram.source.verificationStatus = 'verified'
  protectedProgram.source.lastVerifiedAt = new Date()
  await protectedProgram.save()
  equal((await request(applyPath, { method: 'POST', token: tokens.admin, body: { ...protectedGroup, confirmed: true } })).body.data.totals.conflicted, 2, 'Verified program protects entire group')
  const publishedGroup = fixture({ universities: [{ ...fixture().universities[0], slug: `${slug}-published`,
    name: 'Temporary Published Protection University', programs: [] }] })
  equal((await request(applyPath, { method: 'POST', token: tokens.admin, body: { ...publishedGroup, confirmed: true } })).status, 200, 'Published-protection fixture created')
  const publishedUniversity = await University.findOne({ slug: `${slug}-published` })
  publishedUniversity.recordStatus = 'published'
  await publishedUniversity.save()
  equal((await request(applyPath, { method: 'POST', token: tokens.admin, body: { ...publishedGroup, confirmed: true } })).body.data.totals.conflicted, 1, 'Published record cannot be overwritten')
  const recognizedGroup = fixture({ universities: [{ ...fixture().universities[0], slug: `${slug}-recognized`,
    name: 'Temporary Recognized Protection University', programs: [] }] })
  equal((await request(applyPath, { method: 'POST', token: tokens.admin, body: { ...recognizedGroup, confirmed: true } })).status, 200, 'HEC-protection fixture created')
  const recognizedUniversity = await University.findOne({ slug: `${slug}-recognized` })
  recognizedUniversity.hecRecognitionStatus = 'recognized'
  await recognizedUniversity.save()
  equal((await request(applyPath, { method: 'POST', token: tokens.admin, body: { ...recognizedGroup, confirmed: true } })).body.data.totals.conflicted, 1, 'HEC-recognized record cannot be overwritten')
  const independent = fixture({ universities: [{ ...fixture().universities[0], slug: `${slug}-independent`,
    name: 'Temporary Independent Fictional University', programs: [] }, { ...fixture().universities[0],
    slug: `${slug}-invalid`, source: { officialUrl: 'data:text/plain,unsafe' } }] })
  const partial = await request(applyPath, { method: 'POST', token: tokens.admin, body: { ...independent, confirmed: true } })
  equal(partial.body.data.totals.created, 1, 'Valid group survives invalid group')
  equal(partial.body.data.totals.invalid, 2, 'Invalid group and nested program reported separately')
  equal(await University.countDocuments({ slug: `${slug}-invalid` }), 0, 'Invalid group not written')
  check((await CatalogueImportRun.findOne({ actor: users[2]._id })) !== null, 'Import actor audit saved')
}

try {
  await main()
  process.stdout.write(`Geographic catalogue: ${assertions} assertions passed.\n`)
} catch (error) {
  process.stderr.write(`Geographic catalogue validation failed: ${error.message}\n`)
  process.exitCode = 1
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (mongoose.connection.readyState === 1) {
    try {
      if (temporaryDatabaseOwned && mongoose.connection.db.databaseName === databaseName) await mongoose.connection.dropDatabase()
    } finally { await mongoose.disconnect() }
  }
}
