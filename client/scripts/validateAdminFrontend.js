import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseCatalogueQuery, setCatalogueQueryValue } from '../src/utils/catalogueQuery.js'
import { adminProgramQueryDefinition, adminUniversityQueryDefinition, buildProgramPayload, buildSourcePayload, buildUniversityPayload } from '../src/utils/adminCatalogue.js'
import { sourceDateToIso, toLocalDateTime } from '../src/utils/adminDates.js'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let checks = 0
function check(value, message) { assert.ok(value, message); checks += 1 }
const app = read('src/App.jsx')
const guard = read('src/components/RouteGuards.jsx')
const auth = read('src/context/AuthProvider.jsx')
const layout = read('src/layouts/AdminLayout.jsx')
const mainLayout = read('src/layouts/MainLayout.jsx')
const api = read('src/services/adminCatalogueApi.js')
const publicApi = read('src/services/catalogueApi.js')
const universityForm = read('src/pages/admin/AdminUniversityFormPage.jsx')
const programForm = read('src/pages/admin/AdminProgramFormPage.jsx')
const list = read('src/pages/admin/AdminRecordList.jsx')
const dashboard = read('src/pages/admin/AdminDashboardPage.jsx')
const source = read('src/components/SourceVerificationFields.jsx')
const dialog = read('src/components/AdminUi.jsx')
const relevant = [app, guard, auth, layout, api, universityForm, programForm, list, dashboard, source, dialog].join('\n')

for (const path of ['admin', 'universities', 'universities/new', 'universities/:universityId/edit', 'programs', 'programs/new', 'programs/:programId/edit']) check(app.includes(`path="${path}"`), `administrator route ${path}`)
check(app.indexOf('<Route element={<AdminRouteGuard />}') < app.indexOf('path="admin"'), 'admin routes use guard')
check(guard.includes("allowedRoles={['admin']}"), 'admin-only role restriction')
check(guard.includes("to=\"/login\"") && guard.includes('state={{ from }}'), 'unauthenticated safe login redirect')
check(guard.includes('to="/unauthorized"'), 'student rejected')
check(auth.includes('getCurrentUser(controller.signal)'), 'role restored from current-user endpoint')
check(!relevant.includes('jwtDecode') && !relevant.includes('atob('), 'JWT claims not decoded as role authority')
check(mainLayout.includes("user?.role === 'admin'"), 'admin navigation only shown to administrators')
for (const endpoint of ["'/admin/universities'", "'/admin/programs'", '`/admin/universities/${safeId(id)}`', '`/admin/programs/${safeId(id)}`']) check(api.includes(endpoint), `administrator endpoint ${endpoint}`)
check((api.match(/requiresAuth: true/g) || []).length >= 10, 'every admin request opts into Bearer authorization')
check(!publicApi.includes('requiresAuth'), 'public catalogue remains token-free')
check(api.includes('encodeURIComponent(value)'), 'detail identifiers encoded after validation')

const query = parseCatalogueQuery(new URLSearchParams('sort=-updatedAt&recordStatus=draft&evil=1&page=3'), adminUniversityQueryDefinition)
check(query.values.recordStatus === 'draft' && !query.normalized.has('evil'), 'query allowlist')
check(parseCatalogueQuery(new URLSearchParams('recordStatus=admin&verificationStatus=anything&page=0'), adminProgramQueryDefinition).normalized.toString() === '', 'invalid filters normalized')
check(!parseCatalogueQuery(new URLSearchParams('sort=name&page=1'), adminUniversityQueryDefinition).normalized.toString(), 'query defaults omitted')
check(!setCatalogueQueryValue(new URLSearchParams('page=4&recordStatus=draft'), adminUniversityQueryDefinition, 'city', 'Lahore').has('page'), 'filter resets page')

const university = { name: 'Temporary Unit', slug: 'temporary-unit', sector: 'public', institutionType: 'general', establishedYear: '', recognitionBodies: '', campuses: [{ id: '0123456789abcdef01234567', clientKey: 'client-only', name: 'Test campus', city: 'Lahore', district: '', address: '', isMainCampus: true, isActive: true }], contact: {}, source: { officialUrl: 'https://example.invalid/official', verificationStatus: 'verified', lastVerifiedAt: toLocalDateTime('2026-01-02T12:00:00.000Z') }, recordStatus: 'draft', role: 'admin', passwordHash: 'forbidden', $set: { role: 'admin' } }
const original = { source: { officialUrl: 'https://example.invalid/official', verificationStatus: 'verified', lastVerifiedAt: '2026-01-02T12:00:00.000Z' } }
const universityPayload = buildUniversityPayload(university, original, false)
check(universityPayload.campuses[0].id === university.campuses[0].id, 'existing campus ID preserved')
check(!Object.hasOwn(universityPayload.campuses[0], 'clientKey'), 'client-only campus key omitted')
check(!Object.hasOwn(universityPayload, 'role') && !Object.hasOwn(universityPayload, 'passwordHash') && !Object.hasOwn(universityPayload, '$set'), 'protected and operator fields omitted')
check(!Object.hasOwn(universityPayload, 'source'), 'unchanged source omitted to preserve verification reference')
check(buildUniversityPayload(university, { ...original, recognitionBodies: ['Temporary body'] }, false).recognitionBodies.length === 0, 'recognition bodies can be explicitly cleared')
check(sourceDateToIso(toLocalDateTime(original.source.lastVerifiedAt), original.source.lastVerifiedAt) === original.source.lastVerifiedAt, 'verification instant round trips unchanged')
const sourceChanged = buildUniversityPayload({ ...university, source: { ...university.source, officialUrl: 'https://example.invalid/new' } }, original, false)
check(sourceChanged.source.verificationStatus === 'pending_review' && !sourceChanged.source.lastVerifiedAt, 'source URL change invalidates stale verification')
check(buildSourcePayload({ ...university.source, officialUrl: 'https://example.invalid/new', verificationStatus: 'unverified' }, original.source, false).verificationStatus === 'pending_review', 'source URL change always enters review queue')
const program = { university: '0123456789abcdef01234567', name: 'Test', slug: 'test', degreeTitle: 'BS Test', credentialType: 'BS', years: '4', semesters: '8', campusIds: ['0123456789abcdef01234567', '0123456789abcdef01234567'], studyMode: 'morning', source: university.source, recordStatus: 'draft', userId: 'forbidden', $where: 'forbidden' }
const programPayload = buildProgramPayload(program, original, false)
check(programPayload.campusIds.length === 1, 'duplicate campus selections removed')
check(!Object.hasOwn(programPayload, 'userId') && !Object.hasOwn(programPayload, '$where'), 'program payload allowlist')
check(universityForm.includes('campus.id') && universityForm.includes('Remove campus') && universityForm.includes('Add campus'), 'campus editor and stable IDs')
check(programForm.includes('getAdminUniversity') && programForm.includes('selected university') && programForm.includes('new Set'), 'university-dependent campus options and uniqueness')
check(source.includes('official source URL changed') || source.includes('official source URL changed'.replace('official', 'official')), 'source-change warning')
check(list.includes('<ConfirmDialog') && list.includes('getApiErrorMessage'), 'delete confirmation and dependency conflict message')
check(list.includes('isPublicRecord(parentRecords[record.university?.id])'), 'program public action also checks parent visibility')
check(dashboard.includes('AdminState') && dashboard.includes('Data readiness'), 'dashboard loading/error/readiness states')
check(dialog.includes('showModal()') && dialog.includes('focusAfterCloseId') && dialog.includes('returnFocusRef.current'), 'native modal and focus restoration')
check(list.includes("focusAfterCloseId={deleted ? 'admin-results' : undefined}"), 'successful deletion focuses surviving results')
check(layout.includes('aria-label="Administrator navigation"') && layout.includes('<details'), 'accessible mobile navigation')
check(list.includes('<Pagination') && list.includes('list.retry()'), 'pagination and retry behavior')
check(!relevant.includes('dangerouslySetInnerHTML'), 'no raw HTML rendering')
check(!relevant.includes('console.log') && !relevant.includes('console.error'), 'no token or password logging')
check(!relevant.includes('Synthetic Browser University') && !relevant.includes('example.edu'), 'no hard-coded institutional records')

console.log(`Validated ${checks} administrator frontend safeguards.`)
