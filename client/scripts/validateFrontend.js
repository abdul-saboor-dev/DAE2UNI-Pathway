import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateLogin, validateRegistration } from '../src/utils/authValidation.js'
import { getRoleDestination, getSafeDestination } from '../src/utils/navigation.js'
import {
  buildProfilePayload,
  emptyProfileForm,
  profileToForm,
  validateProfile,
} from '../src/utils/profileForm.js'

let checks = 0
function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}

const profilePage = readFileSync(new URL('../src/pages/StudentProfilePage.jsx', import.meta.url), 'utf8')
for (const stageLabel of ['First Year DAE', 'Second Year DAE', 'Third Year DAE', 'DAE Pass-out']) {
  check(profilePage.includes(stageLabel), `${stageLabel} option exists`)
}
check(profilePage.includes('type="radio"') && !profilePage.includes('Registration number'), 'academic stage is single-choice and registration number is removed')

const validRegistration = {
  name: 'Ayesha Khan',
  email: 'ayesha@example.com',
  password: 'SecurePass123',
  confirmPassword: 'SecurePass123',
}

check(Object.keys(validateRegistration(validRegistration)).length === 0, 'valid registration')
check(Boolean(validateRegistration({ ...validRegistration, name: 'A' }).name), 'short name')
check(Boolean(validateRegistration({ ...validRegistration, email: 'bad-email' }).email), 'invalid email')
check(Boolean(validateRegistration({ ...validRegistration, password: 'short', confirmPassword: 'short' }).password), 'short password')
check(Boolean(validateRegistration({ ...validRegistration, password: 'alllowercase1', confirmPassword: 'alllowercase1' }).password), 'uppercase required')
check(Boolean(validateRegistration({ ...validRegistration, password: 'ALLUPPERCASE1', confirmPassword: 'ALLUPPERCASE1' }).password), 'lowercase required')
check(Boolean(validateRegistration({ ...validRegistration, password: 'NoNumbersHere', confirmPassword: 'NoNumbersHere' }).password), 'number required')
check(Boolean(validateRegistration({ ...validRegistration, confirmPassword: 'Different123' }).confirmPassword), 'matching confirmation')
const byteHeavyPassword = `Aa1${'🙂'.repeat(18)}`
check(byteHeavyPassword.length <= 72 && Boolean(validateRegistration({ ...validRegistration, password: byteHeavyPassword, confirmPassword: byteHeavyPassword }).password), 'UTF-8 byte limit')
check(Boolean(validateLogin({ email: '', password: '' }).email), 'login email required')
check(Boolean(validateLogin({ email: 'student@example.com', password: '' }).password), 'login password required')

check(getSafeDestination('/profile?step=marks') === '/profile?step=marks', 'internal redirect')
check(getSafeDestination('https://example.com') === '/dashboard', 'external redirect')
check(getSafeDestination('//example.com') === '/dashboard', 'protocol-relative redirect')
check(getSafeDestination('/login') === '/dashboard', 'authentication loop redirect')
check(getSafeDestination('/\\example.com') === '/dashboard', 'backslash redirect')
check(getSafeDestination('/%2f%2fexample.com') === '/dashboard', 'encoded external redirect')
check(getSafeDestination('/%5cexample.com') === '/dashboard', 'encoded backslash redirect')
check(getSafeDestination('/%252fexample.com') === '/dashboard', 'double-encoded external redirect')
check(getSafeDestination('/admin/universities?search=computing%2FIT') === '/admin/universities?search=computing%2FIT', 'encoded filter value retained')
check(getRoleDestination('/admin/programs/new', 'admin') === '/admin/programs/new', 'administrator intended route')
check(getRoleDestination('/admin/programs/new', 'student') === '/unauthorized', 'student cannot inherit administrator route')
check(getRoleDestination('//example.com', 'admin') === '/admin', 'administrator external redirect rejected')

const form = {
  ...emptyProfileForm,
  academicStage: 'pass_out',
  daeBoardName: 'PBTE',
  daeInstituteName: 'GCT',
  daePassingYear: '2026',
  daeCompleteTotalMarks: '3450',
  daeCompleteObtainedMarks: '2760',
  matricBoardName: 'BISE Lahore',
  matricGroup: 'Science',
  matricPassingYear: '2023',
  matricTotalMarks: '1100',
  matricObtainedMarks: '880',
  domicileDistrict: 'Lahore',
  preferredCities: 'Lahore, Faisalabad',
  preferredDegreeFields: 'Computer Science, Information Technology',
  preferredUniversitySectors: ['public'],
}
const payload = buildProfilePayload(form, 'complete')
check(payload.profileStatus === 'complete', 'profile status')
check(payload.dae.passingYear === 2026, 'numeric DAE year')
check(payload.dae.academicStage === 'pass_out', 'academic stage is explicit')
check(payload.dae.marks.totalMarks === 3450 && payload.dae.marks.obtainedMarks === 2760, 'complete DAE marks are numeric')
check(!('registrationNumber' in payload.dae) && !('year3' in payload.dae), 'removed registration and annual pass-out fields are not submitted')
check(payload.interests.preferredCities.length === 2, 'city parsing')
check(payload.interests.preferredDegreeFields.length === 2, 'field parsing')
check(!('user' in payload) && !('userId' in payload), 'no owner identifier')
check(Object.keys(validateProfile(form, 'complete')).length === 0, 'valid complete profile')
check(Boolean(validateProfile({ ...form, daeBoardName: '' }, 'complete').daeBoardName), 'completion requirement')
check(Boolean(validateProfile({ ...form, daeCompleteObtainedMarks: '4000' }, 'draft').daeCompleteObtainedMarks), 'marks relationship')
const secondYear = { ...form, academicStage: 'second_year', daeYear1TotalMarks: '1150', daeYear1ObtainedMarks: '920' }
check(Object.keys(validateProfile(secondYear, 'complete')).length === 0, 'Second Year needs only first-year DAE marks')
const thirdYear = { ...secondYear, academicStage: 'third_year', daeYear2TotalMarks: '1150', daeYear2ObtainedMarks: '900' }
check(Object.keys(validateProfile(thirdYear, 'complete')).length === 0, 'Third Year needs first- and second-year DAE marks')
const firstYear = { ...form, academicStage: 'first_year' }
check(Object.keys(validateProfile(firstYear, 'complete')).length === 0, 'First Year needs no DAE result')
const emptyDraft = buildProfilePayload(emptyProfileForm, 'draft')
assert.deepEqual(emptyDraft, { profileStatus: 'draft', dae: { academicStage: 'first_year' } })
checks += 1

const restored = profileToForm({
  dae: { academicStage: 'third_year', boardName: 'PBTE', year1: { totalMarks: 1150, obtainedMarks: 920 }, year2: { totalMarks: 1150, obtainedMarks: 920 } },
  interests: { preferredCities: ['Lahore', 'Faisalabad'] },
})
check(restored.daeBoardName === 'PBTE', 'profile field restoration')
check(restored.academicStage === 'third_year' && restored.daeYear1TotalMarks === '1150', 'stage and year marks restoration')
check(restored.preferredCities === 'Lahore, Faisalabad', 'list restoration')

console.log(`Validated ${checks} frontend authentication, redirect, and profile safeguards.`)
