import assert from 'node:assert/strict'
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
  daeBoardName: 'PBTE',
  daeInstituteName: 'GCT',
  daePassingYear: '2026',
  daeYear1TotalMarks: '1150',
  daeYear1ObtainedMarks: '920',
  daeYear2TotalMarks: '1150',
  daeYear2ObtainedMarks: '920',
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
check(payload.dae.year1.totalMarks === 1150 && payload.dae.year2.obtainedMarks === 920, 'numeric DAE year marks')
check(payload.dae.year3 === null, 'missing Year 3 stays absent rather than zero')
check(payload.interests.preferredCities.length === 2, 'city parsing')
check(payload.interests.preferredDegreeFields.length === 2, 'field parsing')
check(!('user' in payload) && !('userId' in payload), 'no owner identifier')
check(Object.keys(validateProfile(form, 'complete')).length === 0, 'valid complete profile')
check(Boolean(validateProfile({ ...form, daeBoardName: '' }, 'complete').daeBoardName), 'completion requirement')
check(Boolean(validateProfile({ ...form, daeYear1ObtainedMarks: '4000' }, 'draft').daeYear1ObtainedMarks), 'marks relationship')
check(Boolean(validateProfile({ ...form, daeYear3ObtainedMarks: '600' }, 'draft').daeYear3TotalMarks), 'partial Year 3 rejected')
check(Object.keys(validateProfile({ ...form, daeYear3TotalMarks: '1150', daeYear3ObtainedMarks: '900' }, 'complete')).length === 0, 'complete Year 3 accepted')
const emptyDraft = buildProfilePayload(emptyProfileForm, 'draft')
assert.deepEqual(emptyDraft, { profileStatus: 'draft' })
checks += 1

const restored = profileToForm({
  dae: { boardName: 'PBTE', year1: { totalMarks: 1150, obtainedMarks: 920 }, year2: { totalMarks: 1150, obtainedMarks: 920 } },
  interests: { preferredCities: ['Lahore', 'Faisalabad'] },
})
check(restored.daeBoardName === 'PBTE', 'profile field restoration')
check(restored.daeYear1TotalMarks === '1150' && restored.daeYear3TotalMarks === '', 'year marks restoration')
check(restored.preferredCities === 'Lahore, Faisalabad', 'list restoration')

console.log(`Validated ${checks} frontend authentication, redirect, and profile safeguards.`)
