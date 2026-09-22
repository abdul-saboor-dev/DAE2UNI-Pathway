export const emptyProfileForm = {
  daeBoardName: '',
  daeInstituteName: '',
  daeRegistrationNumber: '',
  daePassingYear: '',
  daeTotalMarks: '',
  daeObtainedMarks: '',
  matricBoardName: '',
  matricGroup: '',
  matricPassingYear: '',
  matricTotalMarks: '',
  matricObtainedMarks: '',
  domicileDistrict: '',
  preferredCities: '',
  preferredDegreeFields: '',
  preferredUniversitySectors: [],
}

function text(value) {
  return value?.trim() || undefined
}

function number(value) {
  if (value === '' || value == null) return undefined
  return Number(value)
}

function list(value) {
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  return entries.length ? entries : undefined
}

function include(object, key, value) {
  if (value !== undefined) object[key] = value
}

function marks(totalMarks, obtainedMarks) {
  const result = {}
  include(result, 'totalMarks', number(totalMarks))
  include(result, 'obtainedMarks', number(obtainedMarks))
  return Object.keys(result).length ? result : undefined
}

export function profileToForm(profile) {
  if (!profile) return { ...emptyProfileForm }

  return {
    daeBoardName: profile.dae?.boardName || '',
    daeInstituteName: profile.dae?.instituteName || '',
    daeRegistrationNumber: profile.dae?.registrationNumber || '',
    daePassingYear: profile.dae?.passingYear?.toString() || '',
    daeTotalMarks: profile.dae?.marks?.totalMarks?.toString() || '',
    daeObtainedMarks: profile.dae?.marks?.obtainedMarks?.toString() || '',
    matricBoardName: profile.matric?.boardName || '',
    matricGroup: profile.matric?.group || '',
    matricPassingYear: profile.matric?.passingYear?.toString() || '',
    matricTotalMarks: profile.matric?.marks?.totalMarks?.toString() || '',
    matricObtainedMarks: profile.matric?.marks?.obtainedMarks?.toString() || '',
    domicileDistrict: profile.domicile?.district || '',
    preferredCities: profile.interests?.preferredCities?.join(', ') || '',
    preferredDegreeFields: profile.interests?.preferredDegreeFields?.join(', ') || '',
    preferredUniversitySectors: profile.interests?.preferredUniversitySectors || [],
  }
}

export function buildProfilePayload(form, profileStatus) {
  const payload = { profileStatus }
  const dae = {}
  const matric = {}
  const domicile = {}
  const interests = {}

  include(dae, 'boardName', text(form.daeBoardName))
  include(dae, 'instituteName', text(form.daeInstituteName))
  include(dae, 'registrationNumber', text(form.daeRegistrationNumber))
  include(dae, 'passingYear', number(form.daePassingYear))
  include(dae, 'marks', marks(form.daeTotalMarks, form.daeObtainedMarks))

  include(matric, 'boardName', text(form.matricBoardName))
  include(matric, 'group', text(form.matricGroup))
  include(matric, 'passingYear', number(form.matricPassingYear))
  include(matric, 'marks', marks(form.matricTotalMarks, form.matricObtainedMarks))

  include(domicile, 'district', text(form.domicileDistrict))

  include(interests, 'preferredCities', list(form.preferredCities))
  include(interests, 'preferredDegreeFields', list(form.preferredDegreeFields))
  if (form.preferredUniversitySectors.length) {
    interests.preferredUniversitySectors = [...form.preferredUniversitySectors]
  }

  if (Object.keys(dae).length) payload.dae = dae
  if (Object.keys(matric).length) payload.matric = matric
  if (Object.keys(domicile).length) payload.domicile = domicile
  if (Object.keys(interests).length) payload.interests = interests

  return payload
}

const completionRequirements = [
  ['daeBoardName', 'DAE board name'],
  ['daeInstituteName', 'DAE institute name'],
  ['daePassingYear', 'DAE passing year'],
  ['daeTotalMarks', 'DAE total marks'],
  ['daeObtainedMarks', 'DAE obtained marks'],
  ['matricBoardName', 'Matric board name'],
  ['matricGroup', 'Matric group'],
  ['matricPassingYear', 'Matric passing year'],
  ['matricTotalMarks', 'Matric total marks'],
  ['matricObtainedMarks', 'Matric obtained marks'],
  ['domicileDistrict', 'Domicile district'],
]

function validateMarks(errors, form, prefix, label) {
  const totalKey = `${prefix}TotalMarks`
  const obtainedKey = `${prefix}ObtainedMarks`
  const total = number(form[totalKey])
  const obtained = number(form[obtainedKey])

  if (total !== undefined && (!Number.isFinite(total) || total <= 0)) {
    errors[totalKey] = `${label} total marks must be greater than zero.`
  }
  if (obtained !== undefined && (!Number.isFinite(obtained) || obtained < 0)) {
    errors[obtainedKey] = `${label} obtained marks cannot be negative.`
  }
  if (Number.isFinite(total) && Number.isFinite(obtained) && obtained > total) {
    errors[obtainedKey] = `${label} obtained marks cannot exceed total marks.`
  }
}

function validateYear(errors, form, key, label) {
  if (!form[key]) return
  const value = number(form[key])
  if (!Number.isInteger(value) || value < 1950 || value > 2100) {
    errors[key] = `${label} must be a year from 1950 to 2100.`
  }
}

export function validateProfile(form, profileStatus) {
  const errors = {}

  validateMarks(errors, form, 'dae', 'DAE')
  validateMarks(errors, form, 'matric', 'Matric')
  validateYear(errors, form, 'daePassingYear', 'DAE passing year')
  validateYear(errors, form, 'matricPassingYear', 'Matric passing year')

  if (list(form.preferredCities)?.length > 20) {
    errors.preferredCities = 'Add no more than 20 preferred cities.'
  }
  if (list(form.preferredDegreeFields)?.length > 20) {
    errors.preferredDegreeFields = 'Add no more than 20 preferred degree fields.'
  }

  if (profileStatus === 'complete') {
    for (const [key, label] of completionRequirements) {
      if (!form[key].toString().trim()) errors[key] = `${label} is required to complete your profile.`
    }
  }

  return errors
}
