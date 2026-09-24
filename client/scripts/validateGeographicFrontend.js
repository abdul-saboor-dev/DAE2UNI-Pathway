import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { nextVerificationParams, parseVerificationQuery, verificationParams } from '../src/utils/verificationQueueQuery.js'
import { adminUniversityQueryDefinition, buildUniversityPayload } from '../src/utils/adminCatalogue.js'
import { parseCatalogueQuery } from '../src/utils/catalogueQuery.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let assertions = 0
function check(value, message) { assertions += 1; assert.ok(value, message) }
function equal(actual, expected, message) { assertions += 1; assert.equal(actual, expected, message) }

const app = read('src/App.jsx')
const layout = read('src/layouts/AdminLayout.jsx')
const importPage = read('src/pages/admin/AdminImportPage.jsx')
const queuePage = read('src/pages/admin/AdminVerificationQueuePage.jsx')
const verifyDialog = read('src/components/VerifySourceDialog.jsx')
const importApi = read('src/services/adminImportApi.js')
const verificationApi = read('src/services/adminVerificationApi.js')
const example = JSON.parse(read('public/catalogue-import-example.json'))
for (const route of ['import/*', 'verification-queue']) check(app.includes(`path="${route}"`), `${route} is routed`)
check(app.includes('<Route element={<AdminRouteGuard />}>') && app.indexOf('path="import/*"') > app.indexOf('<Route element={<AdminRouteGuard />}>'), 'New pages remain under administrator guard')
check(layout.includes('/admin/import') && layout.includes('/admin/verification-queue'), 'Administrator navigation includes both workflows')
check(importApi.includes('/admin/catalogue-import/preview') && importApi.includes('/admin/catalogue-import/apply'), 'Import uses exact protected endpoints')
check(verificationApi.includes('/admin/verification-queue'), 'Verification uses protected endpoint')
check(importApi.includes('requiresAuth: true') && verificationApi.includes('requiresAuth: true'), 'Protected requests opt into authentication')
check(importPage.includes('type="file"') && importPage.includes('JSON.parse(text)'), 'File and paste JSON both supported')
check(importPage.includes('Dry-run preview') && importPage.includes('confirmed'), 'Preview and confirmation precede writes')
check(importPage.includes('role="alert"') && importPage.includes('disabled={busy'), 'Import error and busy states are accessible')
check(queuePage.includes('Pagination') && queuePage.includes('AdminState') && queuePage.includes('retry'), 'Queue has pagination and recoverable states')
check(queuePage.includes('getSafeExternalUrl') && queuePage.includes('rel="noopener noreferrer"'), 'Queue external links are guarded')
check(verifyDialog.includes('showModal()') && verifyDialog.includes('onCancel=') && verifyDialog.includes('previous.focus()'), 'Manual verification dialog manages keyboard focus')
check(verifyDialog.includes('personally checked') && verifyDialog.includes('confirmed'), 'Verification requires deliberate review')
for (const content of [importPage, queuePage, verifyDialog]) check(!content.includes('dangerouslySetInnerHTML'), 'Imported content is never trusted HTML')
equal(example.universities[0].name.includes('Fictional'), true, 'Template is overtly fictional')
check(!JSON.stringify(example).includes('recordStatus') && !JSON.stringify(example).includes('verificationStatus'), 'Template cannot claim publication or verification')

const parsed = parseVerificationQuery(new URLSearchParams('entityType=program&verificationStatus=verified&sort=role&page=-2&unknown=x'))
equal(parsed.entityType, 'program', 'Supported queue type retained')
equal(parsed.verificationStatus, '', 'Unsupported queue status normalized')
equal(parsed.sort, '-updatedAt', 'Unsafe queue sort normalized')
equal(parsed.page, 1, 'Invalid queue page normalized')
equal(verificationParams(parsed).toString(), 'entityType=program', 'Defaults and unknown fields omitted')
equal(verificationParams({ ...parsed, search: 'CIT', page: 2 }).toString(), 'entityType=program&search=CIT&page=2', 'Queue search and page serialize safely')
let rapidQuery = ''
rapidQuery = nextVerificationParams(`?${rapidQuery}`, 'entityType', 'program').toString()
rapidQuery = nextVerificationParams(`?${rapidQuery}`, 'verificationStatus', 'pending_review').toString()
rapidQuery = nextVerificationParams(`?${rapidQuery}`, 'sort', 'name').toString()
rapidQuery = nextVerificationParams(`?${rapidQuery}`, 'search', 'Fictional').toString()
equal(rapidQuery, 'entityType=program&verificationStatus=pending_review&search=Fictional&sort=name', 'Rapid queue changes preserve prior URL filters')
const universityQuery = parseCatalogueQuery(new URLSearchParams('provinceOrTerritory=Sindh&charterAuthority=federal&hecRecognitionStatus=recognized&bad=1'), adminUniversityQueryDefinition)
equal(universityQuery.values.provinceOrTerritory, 'Sindh', 'Geographic admin filter supported')
equal(universityQuery.values.charterAuthority, 'federal', 'Charter filter supported')
equal(universityQuery.values.hecRecognitionStatus, 'recognized', 'HEC filter supported')
check(!Object.hasOwn(universityQuery.values, 'bad'), 'Unsupported admin query removed')
const universityPayload = buildUniversityPayload({ name: 'Fictional', slug: 'fictional', sector: 'public', institutionType: 'general',
  provinceOrTerritory: 'Sindh', charterAuthority: 'federal', hecRecognitionStatus: 'unverified', hecProfileUrl: '',
  campuses: [{ name: 'Campus', city: 'Karachi', province: 'Sindh', isMainCampus: true, isActive: true }],
  source: { officialUrl: 'https://example.invalid', verificationStatus: 'unverified' }, recordStatus: 'draft',
  establishedYear: '', recognitionBodies: '', contact: {}, role: 'owner', passwordHash: 'should-not-send' }, null, true)
equal(universityPayload.campuses[0].province, 'Sindh', 'Campus province is not hard-coded')
check(!Object.hasOwn(universityPayload, 'role') && !Object.hasOwn(universityPayload, 'passwordHash'), 'Payload allowlist excludes protected fields')
check(!Object.hasOwn(universityPayload, 'hecProfileUrl'), 'Empty optional URL omitted')
const clearedProfile = buildUniversityPayload({ name: 'Fictional', slug: 'fictional', sector: 'public', institutionType: 'general',
  provinceOrTerritory: 'Punjab', charterAuthority: 'provincial', hecRecognitionStatus: 'unverified', hecProfileUrl: '',
  campuses: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Campus', city: 'Lahore', province: 'Punjab', isMainCampus: true, isActive: true }],
  source: { officialUrl: 'https://example.invalid', verificationStatus: 'unverified' }, recordStatus: 'draft',
  establishedYear: '', recognitionBodies: '', contact: {} },
{ hecProfileUrl: 'https://example.invalid/old', recognitionBodies: [], source: { officialUrl: 'https://example.invalid', verificationStatus: 'unverified' } }, false)
equal(clearedProfile.hecProfileUrl, null, 'Existing HEC profile URL can be explicitly removed')
process.stdout.write(`Geographic frontend: ${assertions} assertions passed.\n`)
