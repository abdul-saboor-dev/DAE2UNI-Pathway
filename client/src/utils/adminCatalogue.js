import { catalogueApiParams, parseCatalogueQuery } from './catalogueQuery.js'
import { sourceDateToIso } from './adminDates.js'

const text = (maximum = 100) => ({ type: 'text', maximum })
const choice = (values, defaultValue = '') => ({ type: 'enum', values, defaultValue })

export const verificationOptions = ['unverified', 'pending_review', 'verified', 'needs_update', 'unavailable']
export const universityStatusOptions = ['draft', 'published', 'archived']
export const programStatusOptions = ['draft', 'published', 'suspended', 'archived']

export const adminUniversityQueryDefinition = {
  search: text(), city: text(), sector: choice(['public', 'private']),
  institutionType: choice(['general', 'engineering', 'technology', 'specialized']),
  recordStatus: choice(universityStatusOptions), verificationStatus: choice(verificationOptions),
  sort: choice(['name', '-name', 'establishedYear', '-establishedYear', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt'], 'name'),
  page: { type: 'page', defaultValue: 1 },
}

export const adminProgramQueryDefinition = {
  search: text(), university: { type: 'identifier' }, city: text(),
  institutionType: choice(['general', 'engineering', 'technology', 'specialized']),
  credentialType: choice(['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other']),
  degreeLevel: choice(['undergraduate']),
  studyMode: choice(['morning', 'evening', 'weekend', 'multiple']),
  recordStatus: choice(programStatusOptions), verificationStatus: choice(verificationOptions),
  sort: choice(['name', '-name', 'degreeTitle', '-degreeTitle', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt'], 'name'),
  page: { type: 'page', defaultValue: 1 },
}

export function adminApiParams(values, definition, pageSize = 20) {
  const raw = new URLSearchParams()
  for (const key of Object.keys(definition)) {
    if (typeof values[key] === 'string' || typeof values[key] === 'number') raw.set(key, String(values[key]))
  }
  const parsed = parseCatalogueQuery(raw, definition)
  const boundedPageSize = Number.isInteger(pageSize) ? Math.min(100, Math.max(1, pageSize)) : 20
  return catalogueApiParams(parsed.values, definition, boundedPageSize)
}

export const isPublicRecord = (record) =>
  record?.recordStatus === 'published' && record?.source?.verificationStatus === 'verified'

const optional = (value) => typeof value === 'string' && value.trim() ? value.trim() : undefined

export function buildSourcePayload(source, originalSource, isNew) {
  const officialUrl = optional(source.officialUrl)
  const status = source.verificationStatus || 'unverified'
  const changedUrl = !isNew && officialUrl !== originalSource?.officialUrl
  const newDate = sourceDateToIso(source.lastVerifiedAt, originalSource?.lastVerifiedAt)
  const oldDate = originalSource?.lastVerifiedAt ? new Date(originalSource.lastVerifiedAt).toISOString() : undefined
  if (!isNew && !changedUrl && status === originalSource?.verificationStatus && newDate === oldDate) return undefined
  // A changed URL cannot inherit a stale verified claim or date.
  const verificationStatus = changedUrl ? 'pending_review' : status
  const result = { ...(isNew || changedUrl ? { officialUrl } : {}), verificationStatus }
  if (verificationStatus === 'verified' && newDate) {
    result.lastVerifiedAt = newDate
  }
  return result
}

export function buildUniversityPayload(form, original, isNew) {
  const payload = {
    name: optional(form.name), slug: optional(form.slug)?.toLowerCase(),
    sector: form.sector, institutionType: form.institutionType,
    campuses: form.campuses.map((campus) => ({
      ...(!isNew && campus.id ? { id: campus.id } : {}),
      name: optional(campus.name), city: optional(campus.city), province: 'Punjab',
      ...(optional(campus.district) && { district: optional(campus.district) }),
      ...(optional(campus.address) && { address: optional(campus.address) }),
      isMainCampus: Boolean(campus.isMainCampus), isActive: Boolean(campus.isActive),
    })),
    recordStatus: form.recordStatus,
  }
  const source = buildSourcePayload(form.source, original?.source, isNew)
  if (source) payload.source = source
  if (optional(form.abbreviation)) payload.abbreviation = optional(form.abbreviation)
  if (form.establishedYear !== '') payload.establishedYear = Number(form.establishedYear)
  const bodies = form.recognitionBodies.split(',').map((part) => part.trim()).filter(Boolean)
  if (bodies.length || original?.recognitionBodies?.length) payload.recognitionBodies = bodies
  const contact = {}
  for (const key of ['websiteUrl', 'admissionsUrl', 'email', 'phone']) {
    if (optional(form.contact[key])) contact[key] = optional(form.contact[key])
  }
  if (Object.keys(contact).length) payload.contact = contact
  return payload
}

export function buildProgramPayload(form, original, isNew) {
  const payload = {
    university: form.university,
    name: optional(form.name), slug: optional(form.slug)?.toLowerCase(),
    degreeTitle: optional(form.degreeTitle), credentialType: form.credentialType,
    degreeLevel: 'undergraduate', studyMode: form.studyMode,
    duration: { years: Number(form.years) },
    campusIds: [...new Set(form.campusIds.filter((id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)))],
    recordStatus: form.recordStatus,
  }
  const source = buildSourcePayload(form.source, original?.source, isNew)
  if (source) payload.source = source
  if (form.semesters !== '') payload.duration.semesters = Number(form.semesters)
  if (optional(form.department)) payload.department = optional(form.department)
  if (optional(form.disciplineCode)) payload.disciplineCode = optional(form.disciplineCode)
  return payload
}
