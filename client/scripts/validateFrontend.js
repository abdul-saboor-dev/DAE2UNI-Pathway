import assert from 'node:assert/strict'
import { validateLogin, validateRegistration } from '../src/utils/authValidation.js'
import { getSafeDestination } from '../src/utils/navigation.js'
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

const form = {
  ...emptyProfileForm,
  daeBoardName: 'PBTE',
  daeInstituteName: 'GCT',
  daePassingYear: '2026',
  daeTotalMarks: '3450',
  daeObtainedMarks: '2760',
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
check(payload.dae.marks.totalMarks === 3450, 'numeric DAE marks')
check(payload.interests.preferredCities.length === 2, 'city parsing')
check(payload.interests.preferredDegreeFields.length === 2, 'field parsing')
check(!('user' in payload) && !('userId' in payload), 'no owner identifier')
check(Object.keys(validateProfile(form, 'complete')).length === 0, 'valid complete profile')
check(Boolean(validateProfile({ ...form, daeBoardName: '' }, 'complete').daeBoardName), 'completion requirement')
check(Boolean(validateProfile({ ...form, daeObtainedMarks: '4000' }, 'draft').daeObtainedMarks), 'marks relationship')
const emptyDraft = buildProfilePayload(emptyProfileForm, 'draft')
assert.deepEqual(emptyDraft, { profileStatus: 'draft' })
checks += 1

const restored = profileToForm({
  dae: { boardName: 'PBTE', marks: { totalMarks: 3450, obtainedMarks: 2760 } },
  interests: { preferredCities: ['Lahore', 'Faisalabad'] },
})
check(restored.daeBoardName === 'PBTE', 'profile field restoration')
check(restored.preferredCities === 'Lahore, Faisalabad', 'list restoration')

console.log(`Validated ${checks} frontend authentication, redirect, and profile safeguards.`)
