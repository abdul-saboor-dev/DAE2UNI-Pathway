import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  catalogueApiParams,
  cataloguePageHref,
  parseCatalogueQuery,
  programQueryDefinition,
  setCatalogueQueryValue,
  universityQueryDefinition,
} from '../src/utils/catalogueQuery.js'
import { getSafeExternalUrl } from '../src/utils/externalLinks.js'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let checks = 0
function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}

const app = read('src/App.jsx')
const layout = read('src/layouts/MainLayout.jsx')
const apiService = read('src/services/catalogueApi.js')
const pagination = read('src/components/Pagination.jsx')
const states = read('src/components/CatalogueStates.jsx')
const sourceAttribution = read('src/components/SourceAttribution.jsx')
const universityCard = read('src/components/UniversityCard.jsx')
const programCard = read('src/components/ProgramCard.jsx')
const universityDetail = read('src/pages/UniversityDetailPage.jsx')
const programDetail = read('src/pages/ProgramDetailPage.jsx')
const sourceFiles = [
  app, layout, apiService, pagination, states, sourceAttribution,
  universityCard, programCard, universityDetail, programDetail,
  read('src/pages/UniversitiesPage.jsx'),
  read('src/pages/ProgramsPage.jsx'),
  read('src/hooks/useCatalogueList.js'),
]
const universitiesPage = read('src/pages/UniversitiesPage.jsx')
const programsPage = read('src/pages/ProgramsPage.jsx')

for (const route of [
  'path="universities"', 'path="universities/:universityIdentifier"',
  'path="programs"', 'path="programs/:programId"',
]) {
  check(app.includes(route), `public route ${route}`)
}
check(app.indexOf('path="universities"') < app.indexOf('<Route element={<PublicOnlyRoute'), 'catalogue routes remain outside public-only guard')
check(layout.includes('to="/universities"') && layout.includes('to="/programs"'), 'main navigation catalogue links')

for (const endpoint of ["api.get('/universities'", "api.get('/programs'", '`/universities/${safeIdentifier}`', '`/programs/${safeIdentifier}`']) {
  check(apiService.includes(endpoint), `catalogue endpoint ${endpoint}`)
}
check(!apiService.includes('requiresAuth'), 'public catalogue requests do not request authorization')
check((apiService.match(/encodeURIComponent/g) || []).length >= 2, 'detail identifiers encoded')

const parsedUniversity = parseCatalogueQuery(
  new URLSearchParams('search=  CIT  &city=Lahore&institutionType=technology&sort=-name&page=2&unknown=value'),
  universityQueryDefinition,
)
check(parsedUniversity.values.search === 'CIT', 'search normalization')
check(parsedUniversity.values.page === 2, 'valid page preserved')
check(!parsedUniversity.normalized.has('unknown'), 'query allowlist removes unknown fields')
check(parseCatalogueQuery(new URLSearchParams('institutionType=invalid&page=0'), universityQueryDefinition).normalized.toString() === '', 'invalid university query removed')
check(parseCatalogueQuery(new URLSearchParams('university=javascript:alert(1)'), programQueryDefinition).values.university === '', 'invalid university identifier removed')
check(parseCatalogueQuery(new URLSearchParams('sort=name&page=1'), universityQueryDefinition).normalized.toString() === '', 'default query values omitted')

const filterChanged = setCatalogueQueryValue(new URLSearchParams('page=4&sort=-name'), universityQueryDefinition, 'city', 'Lahore')
check(!filterChanged.has('page') && filterChanged.get('city') === 'Lahore', 'filter change resets page')
const sortChanged = setCatalogueQueryValue(new URLSearchParams('page=4&city=Lahore'), universityQueryDefinition, 'sort', '-name', false)
check(sortChanged.get('page') === '4' && sortChanged.get('city') === 'Lahore', 'sorting preserves filters and valid page')
check(cataloguePageHref(new URLSearchParams('city=Lahore'), universityQueryDefinition, 3) === '?city=Lahore&page=3', 'pagination URL serialization')

const apiParams = catalogueApiParams(parsedUniversity.values, universityQueryDefinition, 9)
check(apiParams.pageSize === 9 && apiParams.unknown === undefined, 'API params bounded to allowlist')
check(getSafeExternalUrl('https://example.invalid/source')?.startsWith('https://'), 'safe HTTPS external URL')
check(getSafeExternalUrl('javascript:alert(1)') === null, 'unsafe external protocol rejected')
check(getSafeExternalUrl('https://user:password@example.invalid') === null, 'embedded credentials rejected')

check(pagination.includes('aria-current="page"'), 'pagination current page semantics')
check(pagination.includes('aria-label="Catalogue pagination"'), 'pagination navigation label')
check(pagination.includes('Previous') && pagination.includes('Next'), 'pagination boundary controls')
check(pagination.includes('focusTargetId') && pagination.includes('.focus()'), 'pagination restores focus to the results region')
for (const state of ['CatalogueLoading', 'CatalogueEmpty', 'CatalogueError', 'CatalogueNotFound']) {
  check(states.includes(state), `${state} exists`)
}
check(states.includes('role="alert"') && states.includes('role="status"'), 'error and loading announcements')
check(states.includes('onClick={onRetry}'), 'catalogue error state exposes a retry action')
check(universitiesPage.includes('aria-describedby="university-search-description"'), 'university search description is programmatically connected')
check(programsPage.includes('aria-describedby="program-search-description"'), 'program search description is programmatically connected')
check(universitiesPage.includes('tabIndex="-1"') && programsPage.includes('tabIndex="-1"'), 'catalogue result regions accept managed pagination focus')

for (const externalSource of [sourceAttribution, universityCard, universityDetail]) {
  check(externalSource.includes('target="_blank"') && externalSource.includes('rel="noopener noreferrer"'), 'safe external link attributes')
}
check(sourceFiles.every((content) => !content.includes('dangerouslySetInnerHTML')), 'no raw HTML rendering')

const publicRendering = [universityCard, programCard, universityDetail, programDetail].join('\n')
for (const protectedField of ['passwordHash', 'recordStatus', 'verificationRecord', 'campusIds']) {
  check(!publicRendering.includes(protectedField), `protected field ${protectedField} not rendered`)
}
check(!publicRendering.includes('Eligible') && !publicRendering.includes('Not eligible'), 'no false eligibility result')
check(!publicRendering.includes('ranking') && !publicRendering.includes('tuitionFee'), 'no invented ranking or fee data')
check(!sourceFiles.join('\n').includes('Synthetic Browser University'), 'no synthetic institutional records are hard-coded')
check(universityDetail.includes('getProgramsForUniversity(identifier'), 'related programs use documented university filter')
check(programDetail.includes('Eligibility is not evaluated here'), 'intentional eligibility limitation is explicit')

console.log(`Validated ${checks} public catalogue frontend safeguards.`)
