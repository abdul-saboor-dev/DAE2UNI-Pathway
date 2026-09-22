import api from './api.js'

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeSource(value) {
  if (!value || typeof value !== 'object') return null
  const officialUrl = optionalString(value.officialUrl)
  if (!officialUrl) return null
  return {
    officialUrl,
    verificationStatus: optionalString(value.verificationStatus),
    lastVerifiedAt: optionalString(value.lastVerifiedAt),
  }
}

function normalizeCampus(value) {
  if (!value || typeof value !== 'object') return null
  const name = optionalString(value.name)
  const city = optionalString(value.city)
  if (!name || !city) return null
  return {
    name,
    city,
    district: optionalString(value.district),
    province: optionalString(value.province),
    address: optionalString(value.address),
    isMainCampus: value.isMainCampus === true,
    isActive: value.isActive !== false,
  }
}

function normalizeUniversitySummary(value) {
  if (!value || typeof value !== 'object') return null
  const id = optionalString(value.id)
  const name = optionalString(value.name)
  if (!id || !name) return null
  return {
    id,
    name,
    slug: optionalString(value.slug),
    abbreviation: optionalString(value.abbreviation),
    sector: optionalString(value.sector),
    institutionType: optionalString(value.institutionType),
  }
}

export function normalizeUniversity(value) {
  const summary = normalizeUniversitySummary(value)
  if (!summary) return null
  const contact = value.contact && typeof value.contact === 'object'
    ? {
        websiteUrl: optionalString(value.contact.websiteUrl),
        admissionsUrl: optionalString(value.contact.admissionsUrl),
        email: optionalString(value.contact.email),
        phone: optionalString(value.contact.phone),
      }
    : null

  return {
    ...summary,
    establishedYear: Number.isFinite(value.establishedYear) ? value.establishedYear : null,
    recognitionBodies: safeArray(value.recognitionBodies).filter((item) => typeof item === 'string'),
    campuses: safeArray(value.campuses).map(normalizeCampus).filter(Boolean),
    contact,
    source: normalizeSource(value.source),
  }
}

export function normalizeProgram(value) {
  if (!value || typeof value !== 'object') return null
  const id = optionalString(value.id)
  const name = optionalString(value.name)
  const university = normalizeUniversitySummary(value.university)
  if (!id || !name || !university) return null

  const duration = value.duration && typeof value.duration === 'object'
    ? {
        years: Number.isFinite(value.duration.years) ? value.duration.years : null,
        semesters: Number.isFinite(value.duration.semesters) ? value.duration.semesters : null,
      }
    : null

  return {
    id,
    university,
    name,
    slug: optionalString(value.slug),
    degreeTitle: optionalString(value.degreeTitle),
    credentialType: optionalString(value.credentialType),
    degreeLevel: optionalString(value.degreeLevel),
    department: optionalString(value.department),
    disciplineCode: optionalString(value.disciplineCode),
    duration,
    campuses: safeArray(value.campuses).map(normalizeCampus).filter(Boolean),
    studyMode: optionalString(value.studyMode),
    source: normalizeSource(value.source),
  }
}

function normalizePagination(value) {
  if (!value || typeof value !== 'object') return null
  const page = Number(value.page)
  const pageSize = Number(value.pageSize)
  const totalRecords = Number(value.totalRecords)
  const totalPages = Number(value.totalPages)
  if (![page, pageSize, totalRecords, totalPages].every(Number.isInteger)) return null
  return { page, pageSize, totalRecords, totalPages }
}

function normalizeListResponse(data, key, normalizer) {
  const records = data?.data?.[key]
  const pagination = normalizePagination(data?.data?.pagination)
  if (!Array.isArray(records) || !pagination) {
    throw new Error('The catalogue API returned an unexpected response.')
  }
  return {
    items: records.map(normalizer).filter(Boolean),
    pagination,
  }
}

export async function getUniversities(params, signal) {
  const { data } = await api.get('/universities', { params, signal })
  return normalizeListResponse(data, 'universities', normalizeUniversity)
}

export async function getUniversity(identifier, signal) {
  const safeIdentifier = encodeURIComponent(String(identifier))
  const { data } = await api.get(`/universities/${safeIdentifier}`, { signal })
  const university = normalizeUniversity(data?.data?.university)
  if (!university) throw new Error('The catalogue API returned an unexpected response.')
  return university
}

export async function getUniversityOptions(signal) {
  const firstPage = await getUniversities({ page: 1, pageSize: 100, sort: 'name' }, signal)
  const items = [...firstPage.items]
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await getUniversities({ page, pageSize: 100, sort: 'name' }, signal)
    items.push(...result.items)
  }
  return items
}

export async function getPrograms(params, signal) {
  const { data } = await api.get('/programs', { params, signal })
  return normalizeListResponse(data, 'programs', normalizeProgram)
}

export async function getProgramsForUniversity(university, signal) {
  const firstPage = await getPrograms({ university, page: 1, pageSize: 100, sort: 'name' }, signal)
  const items = [...firstPage.items]
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await getPrograms({ university, page, pageSize: 100, sort: 'name' }, signal)
    items.push(...result.items)
  }
  return items
}

export async function getProgram(identifier, signal) {
  const safeIdentifier = encodeURIComponent(String(identifier))
  const { data } = await api.get(`/programs/${safeIdentifier}`, { signal })
  const program = normalizeProgram(data?.data?.program)
  if (!program) throw new Error('The catalogue API returned an unexpected response.')
  return program
}
