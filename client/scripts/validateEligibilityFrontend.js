import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeEligibilityResults } from '../src/utils/eligibilityResults.js'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let checks = 0
const check = (value, message) => { checks += 1; assert.ok(value, message) }
const app = read('src/App.jsx')
const page = read('src/pages/EligibilityPage.jsx')
const api = read('src/services/eligibilityApi.js')
const relevant = `${page}\n${api}`

check(app.includes('path="eligibility" element={<EligibilityPage />}'), 'eligibility page route exists')
check(app.indexOf("<Route element={<ProtectedRoute allowedRoles={['student']} />}") < app.indexOf('path="eligibility"'), 'route remains under the Student-only guard')
check(api.includes("api.get('/student/eligibility', { requiresAuth: true, signal })"), 'page uses the authenticated eligibility endpoint without a payload or query')
for (const forbidden of ['userId', 'profileId', 'marks:', 'ruleId', 'role:', 'params:']) {
  check(!api.includes(forbidden), `${forbidden} is not submitted by the API service`)
}

const normalized = normalizeEligibilityResults([{
  state: 'eligible', message: 'Safe explanation',
  university: { id: '0123456789abcdef01234567', name: 'Example University', hidden: 'forbidden' },
  program: { id: '1123456789abcdef01234567', name: 'Example Program', slug: 'example-program' },
  rule: { code: 'RULE', name: 'Example Rule', priority: 100 },
  source: { officialUrl: 'https://example.invalid/source', verificationRecord: 'forbidden' },
  reasons: [{ code: 'MATCHED', outcome: 'matched', message: 'Matched safely', internal: 'forbidden' }],
  eligibilityResearch: 'forbidden', recordStatus: 'published',
}])[0]
check(!Object.hasOwn(normalized, 'eligibilityResearch') && !Object.hasOwn(normalized, 'recordStatus'), 'unknown result fields are discarded')
check(!Object.hasOwn(normalized.rule, 'priority') && !Object.hasOwn(normalized.source, 'verificationRecord'), 'internal nested fields are discarded')

for (const state of ['eligible', 'not_eligible', 'needs_information', 'needs_manual_review', 'unavailable']) {
  check(page.includes(`${state}: {`), `${state} has explicit UI presentation`)
}
check(page.includes('does not guarantee admission'), 'eligible guidance avoids an admission guarantee')
check(page.includes('This is not a rejection.'), 'unavailable state is not presented as rejection')
check(page.includes('to="/profile"') && page.includes("result.state === 'needs_information'"), 'missing-information state links to the profile')
check(page.includes('target="_blank" rel="noopener noreferrer"') && page.includes('getSafeExternalUrl'), 'official sources use safe external-link handling')
check(page.includes("useState('loading')") && page.includes("state === 'error'") && page.includes('Try again'), 'loading, error, and retry states exist')
check(page.includes('results.length === 0') && page.includes('No eligibility results are available.'), 'empty response has a truthful state')
check(!relevant.includes('dangerouslySetInnerHTML'), 'no raw HTML rendering')
check(!page.includes('getStudentProfile') && !page.includes('percentage'), 'client does not infer eligibility from profile values')

console.log(`Validated ${checks} eligibility-results frontend safeguards.`)
