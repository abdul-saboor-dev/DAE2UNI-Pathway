import api from './api.js'
import { adminApiParams, adminProgramQueryDefinition, adminUniversityQueryDefinition } from '../utils/adminCatalogue.js'

const objectId = /^[a-f\d]{24}$/i
function safeId(value) {
  if (typeof value !== 'string' || !objectId.test(value)) throw new Error('Invalid record identifier.')
  return encodeURIComponent(value)
}

function listResult(data, key) {
  const items = data?.data?.[key]
  const pagination = data?.data?.pagination
  if (!Array.isArray(items) || !pagination || !Number.isInteger(pagination.totalRecords)) {
    throw new Error('The administrator API returned an unexpected response.')
  }
  return { items: items.filter((item) => item && typeof item.id === 'string'), pagination }
}

export async function listAdminUniversities(values = {}, signal) {
  const params = adminApiParams(values, adminUniversityQueryDefinition, values.pageSize || 20)
  const { data } = await api.get('/admin/universities', { params, signal, requiresAuth: true })
  return listResult(data, 'universities')
}

export async function getAdminUniversity(id, signal) {
  const { data } = await api.get(`/admin/universities/${safeId(id)}`, { signal, requiresAuth: true })
  return data?.data?.university || null
}

export async function createAdminUniversity(payload) {
  const { data } = await api.post('/admin/universities', payload, { requiresAuth: true })
  return data?.data?.university
}

export async function updateAdminUniversity(id, payload) {
  const { data } = await api.put(`/admin/universities/${safeId(id)}`, payload, { requiresAuth: true })
  return data?.data?.university
}

export async function deleteAdminUniversity(id) {
  await api.delete(`/admin/universities/${safeId(id)}`, { requiresAuth: true })
}

export async function listAdminPrograms(values = {}, signal) {
  const params = adminApiParams(values, adminProgramQueryDefinition, values.pageSize || 20)
  const { data } = await api.get('/admin/programs', { params, signal, requiresAuth: true })
  return listResult(data, 'programs')
}

export async function getAdminProgram(id, signal) {
  const { data } = await api.get(`/admin/programs/${safeId(id)}`, { signal, requiresAuth: true })
  return data?.data?.program || null
}

export async function createAdminProgram(payload) {
  const { data } = await api.post('/admin/programs', payload, { requiresAuth: true })
  return data?.data?.program
}

export async function updateAdminProgram(id, payload) {
  const { data } = await api.put(`/admin/programs/${safeId(id)}`, payload, { requiresAuth: true })
  return data?.data?.program
}

export async function deleteAdminProgram(id) {
  await api.delete(`/admin/programs/${safeId(id)}`, { requiresAuth: true })
}
