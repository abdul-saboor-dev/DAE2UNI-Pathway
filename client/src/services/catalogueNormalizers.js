import { getSafeExternalUrl } from '../utils/externalLinks.js'
import { getSafeGoogleMapsUrl } from '../utils/campusMap.js'

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function positiveNumber(value) {
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function normalizeSrcSet(value) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const candidates = value.split(/,\s+/).map((candidate) => candidate.trim())
  if (!candidates.length) return undefined

  const normalized = candidates.map((candidate) => {
    const match = candidate.match(/^(\S+)\s+(\d+)w$/)
    if (!match) return null
    const url = getSafeExternalUrl(match[1])
    const width = Number(match[2])
    return url && Number.isSafeInteger(width) && width > 0 ? `${url} ${width}w` : null
  })

  return normalized.every(Boolean) ? normalized.join(', ') : undefined
}

function normalizeMedia(value) {
  if (!value || typeof value !== 'object') return null
  const url = getSafeExternalUrl(value.url)
  if (!url) return null
  return {
    id: optionalString(value.id),
    url,
    srcSet: normalizeSrcSet(value.srcSet),
    width: positiveNumber(value.width),
    height: positiveNumber(value.height),
  }
}

function normalizeDisciplineMedia(value) {
  if (!value || typeof value !== 'object') return null
  const discipline = optionalString(value.discipline)
  const image = normalizeMedia(value.image)
  return discipline && image ? { discipline, image } : null
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
    ...(Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && {
      latitude: value.latitude,
      longitude: value.longitude,
    }),
    ...(getSafeGoogleMapsUrl(value.googleMapsUrl) && { googleMapsUrl: getSafeGoogleMapsUrl(value.googleMapsUrl) }),
    isMainCampus: value.isMainCampus === true,
    isActive: value.isActive !== false,
    image: normalizeMedia(value.image),
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
    provinceOrTerritory: optionalString(value.provinceOrTerritory),
    charterAuthority: optionalString(value.charterAuthority),
    hecRecognitionStatus: optionalString(value.hecRecognitionStatus),
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
    logo: normalizeMedia(value.logo),
    cover: normalizeMedia(value.cover),
    campuses: safeArray(value.campuses).map(normalizeCampus).filter(Boolean),
    contact,
    hecProfileUrl: optionalString(value.hecProfileUrl),
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
    disciplineMedia: normalizeDisciplineMedia(value.disciplineMedia),
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

export function normalizeListResponse(data, key, normalizer) {
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
