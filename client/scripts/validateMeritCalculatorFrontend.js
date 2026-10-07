import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildMeritCalculationPayload, profileDaeToTemporaryMarks, validateTemporaryDaeMarks } from '../src/utils/meritCalculator.js'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let checks = 0
const check = (value, message) => { checks += 1; assert.ok(value, message) }
const app = read('src/App.jsx')
const layout = read('src/layouts/MainLayout.jsx')
const page = read('src/pages/MeritCalculatorPage.jsx')
const api = read('src/services/meritCalculatorApi.js')
const relevant = [app, layout, page, api].join('\n')

check(app.includes('path="merit-calculator"') && app.indexOf("allowedRoles={['student']}") < app.indexOf('path="merit-calculator"'), 'student-protected route exists')
check(layout.includes('user?.role === \'student\'') && layout.includes('to="/merit-calculator"'), 'student navigation link exists')
check(api.includes("'/student/merit-calculator/options'") && api.includes("'/student/merit-calculator/calculate'"), 'student endpoints are used')
check((api.match(/requiresAuth: true/g) || []).length === 2, 'both calculator requests require authentication')
const payload = buildMeritCalculationPayload('0123456789abcdef01234567', { fedcba987654321001234567: '75' })
assert.deepEqual(Object.keys(payload).sort(), ['entryTestScores', 'formulaId']); checks += 1
assert.deepEqual(Object.keys(payload.entryTestScores[0]).sort(), ['entryTestId', 'obtainedMarks']); checks += 1
check(page.includes('getStudentProfile') && page.includes('Complete your profile') && page.includes('to="/profile"'), 'missing profile guidance exists')
const saved = profileDaeToTemporaryMarks({ dae: { year1: { totalMarks: 100, obtainedMarks: 80 }, year2: { totalMarks: 100, obtainedMarks: 70 } } })
check(saved.year1ObtainedMarks === '80' && saved.year3TotalMarks === '', 'saved marks prefill without invented Year 3')
check(Object.keys(validateTemporaryDaeMarks(saved)).length === 0, 'Years 1 and 2 alone are valid')
check(Boolean(validateTemporaryDaeMarks({ ...saved, year3TotalMarks: '100' }).year3ObtainedMarks), 'partial Year 3 is rejected')
check(Boolean(validateTemporaryDaeMarks({ ...saved, year2TotalMarks: '0' }).year2TotalMarks), 'nonpositive total is rejected')
check(Boolean(validateTemporaryDaeMarks({ ...saved, year1ObtainedMarks: 'Infinity' }).year1ObtainedMarks), 'nonfinite marks are rejected')
const temporary = buildMeritCalculationPayload('0123456789abcdef01234567', {}, saved, true)
check(temporary.daeMarks.year1.obtainedMarks === 80 && !('year3' in temporary.daeMarks), 'temporary DAE payload omits missing Year 3')
check(!('daeMarks' in payload), 'non-DAE formula payload omits DAE marks')
check(page.includes('Temporary DAE year marks') && page.includes('daeResultStatus'), 'temporary inputs and server status are shown')
check(page.includes('No verified merit formula is available yet.'), 'exact no-formula state exists')
check(page.includes('Official maximum:') && page.includes('type="number"'), 'dynamic obtained-score inputs show official maximum')
check(page.includes('This is a merit calculation, not an eligibility or admission decision.'), 'required disclaimer exists')
check(page.includes('aria-invalid') && page.includes('aria-describedby') && page.includes('LoadingScreen') && page.includes('FormAlert'), 'accessible validation and states exist')
check(!relevant.includes('localStorage') && !relevant.includes('sessionStorage'), 'calculator stores no result or marks in browser storage')
check(!relevant.includes('updateStudentProfile'), 'calculator does not save profile data')
check(!relevant.includes('dangerouslySetInnerHTML') && !relevant.includes('eval(') && !relevant.includes('console.'), 'no raw HTML, executable formula, or logging')
check(!page.includes('admission chance') && !page.includes('closing merit') && !page.includes('recommendation'), 'no unsupported admission claims')

console.log(`Validated ${checks} student merit-calculator frontend safeguards.`)
