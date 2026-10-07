import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildEligibilityRulePayload } from '../src/utils/eligibilityRules.js'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let checks = 0
const check = (value, message) => { checks += 1; assert.ok(value, message) }
const app = read('src/App.jsx')
const layout = read('src/layouts/AdminLayout.jsx')
const listPage = read('src/pages/admin/AdminEligibilityRulesPage.jsx')
const formPage = read('src/pages/admin/AdminEligibilityRuleFormPage.jsx')
const api = read('src/services/eligibilityRuleApi.js')
const relevant = [app, layout, listPage, formPage, api].join('\n')

for (const route of ['eligibility-rules', 'eligibility-rules/new', 'eligibility-rules/:ruleId/edit']) {
  check(app.includes(`path="${route}"`), `administrator route ${route} exists`)
  check(app.indexOf('<Route element={<AdminRouteGuard />}') < app.indexOf(`path="${route}"`), `${route} remains under the content-manager guard`)
}
check(layout.includes('/admin/eligibility-rules'), 'administrator navigation exposes eligibility rules near research')
check((api.match(/requiresAuth: true/g) || []).length === 6, 'every eligibility-rule request uses authenticated API behavior')
check(api.includes("'/admin/eligibility-rules/options'"), 'relationship options use the protected admin endpoint')

const payload = buildEligibilityRulePayload({
  code: ' DAE-CIT-TEMP ', name: ' Temporary rule ', university: '0123456789abcdef01234567',
  program: '1123456789abcdef01234567', admissionCycle: '', eligibilityResearch: '', scope: 'program',
  qualificationMatchLogic: 'any',
  qualificationCriteria: [{ qualificationType: 'DAE', technologyCodes: 'cit', minimumPercentage: '60', minimumPassingYear: '', acceptedBoards: '', requiredSubjects: '', equivalenceRequired: false, explanation: ' Official wording ' }],
  domicile: { allowedProvinces: 'Punjab', allowedDistricts: '', required: false, explanation: '' },
  entryTestRequirements: [], effectiveFrom: '', effectiveUntil: '', priority: '0',
  officialSourceUrl: ' https://example.invalid/source ',
  recordStatus: 'published', verificationRecord: 'forbidden', role: 'owner', $set: { recordStatus: 'published' },
})
for (const forbidden of ['recordStatus', 'verificationRecord', 'role', '$set', 'applicantCategory']) {
  check(!Object.hasOwn(payload, forbidden), `${forbidden} excluded from payload`)
}
check(payload.qualificationCriteria[0].qualificationType === 'DAE', 'criteria remain declarative and DAE-specific')
check(payload.qualificationCriteria[0].technologyCodes[0] === 'CIT', 'technology codes are normalized explicitly')
check(!JSON.stringify(payload).includes('function') && !JSON.stringify(payload).includes('eval'), 'payload contains no executable formula or rule logic')
check(listPage.includes('aria-label="Eligibility-rule pagination"'), 'list pagination has an accessible label')
check(formPage.includes('Draft rules are internal review records, not student eligibility decisions.'), 'form communicates the decision boundary')
check(listPage.includes('Draft rules are internal review records, not student eligibility decisions.'), 'list communicates the decision boundary')
check(formPage.includes('Linking research does not convert, verify, or change it.'), 'research link is explicitly traceability-only')
check(formPage.includes('New and edited rules remain draft and pending review.'), 'edit verification consequence is explained')
check(formPage.includes('value={form.') && formPage.includes('catch (caught)'), 'controlled form values survive API errors')
check(!relevant.includes('dangerouslySetInnerHTML'), 'no raw HTML rendering')
check(!relevant.includes('localStorage') && !relevant.includes('sessionStorage'), 'rule drafts are not stored in browser storage')
check(!relevant.includes('console.log'), 'rule or source data is not logged')
check(!relevant.includes('/api/eligibility'), 'no public or student eligibility endpoint is added')
check(!formPage.includes('Publish rule') && !formPage.includes('Verify rule'), 'authoring UI has no publish or verify action')

console.log(`Validated ${checks} eligibility-rule frontend safeguards.`)
