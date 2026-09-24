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
