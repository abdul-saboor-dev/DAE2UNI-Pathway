import { charterAuthorities, hecRecognitionStatuses, physicalLocations } from './geography.js'

const textField = (maximum = 100) => ({ type: 'text', maximum })
const enumField = (values, defaultValue = '') => ({ type: 'enum', values, defaultValue })
const identifierField = () => ({ type: 'identifier' })
const universityIdentifierPattern = /^(?:[a-f\d]{24}|[a-z0-9]+(?:-[a-z0-9]+)*)$/i

export const universityQueryDefinition = {
  search: textField(),
  city: textField(),
  provinceOrTerritory: enumField(physicalLocations),
  charterAuthority: enumField(charterAuthorities),
  hecRecognitionStatus: enumField(hecRecognitionStatuses),
  sector: enumField(['public', 'private']),
  institutionType: enumField(['general', 'engineering', 'technology', 'specialized']),
  sort: enumField(['name', '-name', 'establishedYear', '-establishedYear'], 'name'),
  page: { type: 'page', defaultValue: 1 },
}

export const programQueryDefinition = {
  search: textField(),
  university: identifierField(),
  city: textField(),
  credentialType: enumField(['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other']),
  degreeLevel: enumField(['undergraduate']),
  studyMode: enumField(['morning', 'evening', 'weekend', 'multiple']),
  sort: enumField(['name', '-name', 'degreeTitle', '-degreeTitle'], 'name'),
  page: { type: 'page', defaultValue: 1 },
}

function readValue(rawValue, field) {
  if (field.type === 'text') {
    const value = rawValue?.trim() || ''
    return value.length <= field.maximum ? value : ''
  }
  if (field.type === 'enum') {
    return field.values.includes(rawValue) ? rawValue : field.defaultValue
  }
  if (field.type === 'identifier') {
    const value = rawValue?.trim().toLowerCase() || ''
    return universityIdentifierPattern.test(value) ? value : ''
  }
  if (field.type === 'page') {
    if (!/^\d+$/.test(rawValue || '')) return field.defaultValue
    const value = Number(rawValue)
    return Number.isSafeInteger(value) && value >= 1 ? value : field.defaultValue
  }
  return ''
}

function shouldWrite(value, field) {
  if (field.type === 'page') return value !== field.defaultValue
  if (field.type === 'enum') return Boolean(value) && value !== field.defaultValue
  return Boolean(value)
}

export function parseCatalogueQuery(searchParams, definition) {
  const values = {}
  const normalized = new URLSearchParams()

  for (const [key, field] of Object.entries(definition)) {
    const value = readValue(searchParams.get(key), field)
    values[key] = value
    if (shouldWrite(value, field)) normalized.set(key, String(value))
  }

  return { values, normalized }
}

export function setCatalogueQueryValue(currentParams, definition, key, value, resetPage = true) {
  if (!Object.hasOwn(definition, key)) return parseCatalogueQuery(currentParams, definition).normalized

  const next = parseCatalogueQuery(currentParams, definition).normalized
  const field = definition[key]
  const normalizedValue = readValue(String(value ?? ''), field)
  if (shouldWrite(normalizedValue, field)) next.set(key, String(normalizedValue))
  else next.delete(key)
  if (resetPage && key !== 'page') next.delete('page')
  return next
}

export function catalogueApiParams(values, definition, pageSize) {
  const params = { page: values.page, pageSize }
  for (const key of Object.keys(definition)) {
    if (key === 'page') continue
    const value = values[key]
    if (value) params[key] = value
  }
  return params
}

export function cataloguePageHref(currentParams, definition, page) {
  const next = setCatalogueQueryValue(currentParams, definition, 'page', page, false)
  const query = next.toString()
  return query ? `?${query}` : ''
}
