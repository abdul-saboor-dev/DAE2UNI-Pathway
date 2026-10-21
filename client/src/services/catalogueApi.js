import api from './api.js'
import { normalizeListResponse, normalizeProgram, normalizeUniversity } from './catalogueNormalizers.js'

export { normalizeProgram, normalizeUniversity } from './catalogueNormalizers.js'

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
