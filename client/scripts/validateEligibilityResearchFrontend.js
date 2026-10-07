import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildEligibilityResearchPayload } from '../src/utils/eligibilityResearch.js'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let checks = 0
const check = (value, message) => { checks += 1; assert.ok(value, message) }
const app = read('src/App.jsx')
const layout = read('src/layouts/AdminLayout.jsx')
const page = read('src/pages/admin/AdminEligibilityResearchPage.jsx')
const api = read('src/services/eligibilityResearchApi.js')
const relevant = [app, layout, page, api].join('\n')

check(app.includes('path="eligibility-research"'), 'administrator research route exists')
check(app.indexOf('<Route element={<AdminRouteGuard />}') < app.indexOf('path="eligibility-research"'), 'route remains under the content-manager guard')
check(layout.includes('/admin/eligibility-research'), 'administrator navigation exposes research tracker')
check((api.match(/requiresAuth: true/g) || []).length === 4, 'all research requests use authenticated API behavior')
for (const endpoint of ["'/admin/eligibility-research'", "'/admin/eligibility-research/options'", '`/admin/eligibility-research/${safeId(id)}`']) {
  check(api.includes(endpoint), `uses protected endpoint ${endpoint}`)
}

const payload = buildEligibilityResearchPayload({
  university: '0123456789abcdef01234567',
  program: '1123456789abcdef01234567',
  admissionCycle: '',
  researchStatus: 'researching',
  officialSourceUrl: ' https://example.invalid/source ',
  sourceTitle: ' Official source ',
  reviewedDate: '2026-09-30',
  evidenceNotes: ' Evidence only ',
  unresolvedItems: 'DAE CIT wording\nMinimum marks',
  createdBy: 'forbidden',
  reviewedBy: 'forbidden',
  role: 'owner',
  $set: { researchStatus: 'verified' },
})
for (const forbidden of ['createdBy', 'reviewedBy', 'role', '$set']) {
  check(!Object.hasOwn(payload, forbidden), `${forbidden} excluded from payload`)
}
check(payload.unresolvedItems.length === 2, 'unresolved items are explicit bounded values')
check(page.includes('never evaluates students or changes an eligibility rule'), 'page explains research-only meaning')
check(page.includes('No eligibility decision will be produced'), 'empty state makes no eligibility claim')
check(page.includes('target="_blank" rel="noopener noreferrer"'), 'official sources open safely')
check(page.includes('aria-label="Eligibility research pagination"'), 'pagination has an accessible label')
check(page.includes('role={messageKind === \'error\' ? \'alert\' : \'status\'}'), 'errors and success updates are announced')
check(!relevant.includes('dangerouslySetInnerHTML'), 'no raw HTML rendering')
check(!relevant.includes('localStorage') && !relevant.includes('sessionStorage'), 'research evidence is not stored in browser storage')
check(!relevant.includes('console.log'), 'no research data logging')
check(!relevant.includes('/eligibility-rules'), 'frontend cannot create eligibility rules')

console.log(`Validated ${checks} eligibility-research frontend safeguards.`)
