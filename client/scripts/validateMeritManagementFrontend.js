import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildEntryTestPayload, buildMeritFormulaPayload } from '../src/utils/meritManagement.js'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let checks = 0
const check = (value, message) => { checks += 1; assert.ok(value, message) }
const app = read('src/App.jsx')
const layout = read('src/layouts/AdminLayout.jsx')
const api = read('src/services/meritManagementApi.js')
const list = read('src/pages/admin/AdminMeritRecordsPage.jsx')
const testForm = read('src/pages/admin/AdminEntryTestFormPage.jsx')
const formulaForm = read('src/pages/admin/AdminMeritFormulaFormPage.jsx')
const relevant = [app, layout, api, list, testForm, formulaForm].join('\n')

for (const route of ['entry-tests', 'entry-tests/new', 'entry-tests/:entryTestId/edit', 'merit-formulas', 'merit-formulas/new', 'merit-formulas/:meritFormulaId/edit']) check(app.includes(`path="${route}"`), `route ${route}`)
check(app.indexOf('<Route element={<AdminRouteGuard />}') < app.indexOf('path="entry-tests"'), 'routes remain under content-manager guard')
check(layout.includes('/admin/entry-tests') && layout.includes('/admin/merit-formulas'), 'admin navigation links')
for (const endpoint of ["'/admin/entry-tests'", "'/admin/merit-formulas'", '`/admin/entry-tests/${safeId(id)}`', '`/admin/merit-formulas/${safeId(id)}`']) check(api.includes(endpoint), `endpoint ${endpoint}`)
check((api.match(/requiresAuth: true/g) || []).length >= 10, 'all requests use authenticated API behavior')

const malicious = { name: 'Test', code: 'T', conductingBody: 'Body', category: 'general', resultUnit: 'score', maximumScore: '100', defaultPassingScore: '', negativeMarking: false, applicableQualificationCodes: '', recordStatus: 'draft', source: { officialUrl: 'https://example.invalid', verificationStatus: 'pending_review', lastVerifiedAt: '' }, role: 'owner', $set: { role: 'owner' } }
const payload = buildEntryTestPayload(malicious)
check(!Object.hasOwn(payload, 'role') && !Object.hasOwn(payload, '$set'), 'entry-test payload allowlist')
const formula = buildMeritFormulaPayload({ code: 'F', name: 'Formula', university: '0123456789abcdef01234567', program: '', admissionCycle: '', components: [{ basis: 'matric', label: 'Matric', weightPercentage: '100', injected: true }], recordStatus: 'draft', source: malicious.source, passwordHash: 'forbidden' })
check(!Object.hasOwn(formula, 'passwordHash') && !Object.hasOwn(formula.components[0], 'injected'), 'formula payload and component allowlists')
check(formulaForm.includes("Math.abs(total - 100)") && formulaForm.includes('Human-readable preview'), 'live total validation and preview')
check(formulaForm.includes("basis === 'entry_test'") && formulaForm.includes('Linked entry test'), 'conditional entry-test selector')
check(formulaForm.includes('selected university') && formulaForm.includes('listAdminPrograms'), 'program options depend on university')
check(formulaForm.includes('Add component') && formulaForm.includes('Remove'), 'component editor')
check(testForm.includes('positive finite number') && testForm.includes('SourceVerificationFields'), 'test score validation and secure source fields')
check(testForm.includes('getApiFieldErrors') && formulaForm.includes('formula-components-error') && formulaForm.includes('aria-describedby'), 'field errors are associated and API validation is preserved')
check(list.includes('ConfirmDialog') && list.includes('AdminState') && list.includes('aria-label'), 'accessible list states and deletion confirmation')
check(!relevant.includes('eval(') && !relevant.includes('Function('), 'no executable formula strings')
check(!relevant.includes('dangerouslySetInnerHTML') && !relevant.includes('console.log'), 'no raw HTML or sensitive logging')

console.log(`Validated ${checks} merit-management frontend safeguards.`)
