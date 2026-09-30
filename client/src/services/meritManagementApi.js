import api from './api.js'
export { buildEntryTestPayload, buildMeritFormulaPayload } from '../utils/meritManagement.js'

const objectId = /^[a-f\d]{24}$/i
const queryKeys = new Set(['search', 'recordStatus', 'verificationStatus', 'university', 'page', 'pageSize', 'sort'])

function safeId(value) {
  if (typeof value !== 'string' || !objectId.test(value)) throw new Error('Invalid record identifier.')
  return encodeURIComponent(value)
}

function params(values) {
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => queryKeys.has(key) && value !== '' && value != null))
}

function list(data, key) {
  const items = data?.data?.[key]
  const pagination = data?.data?.pagination
  if (!Array.isArray(items) || !pagination) throw new Error('The administrator API returned an unexpected response.')
  return { items, pagination }
}

export async function listEntryTests(values = {}, signal) {
  const { data } = await api.get('/admin/entry-tests', { params: params(values), signal, requiresAuth: true })
  return list(data, 'entryTests')
}
export async function getEntryTest(id, signal) { const { data } = await api.get(`/admin/entry-tests/${safeId(id)}`, { signal, requiresAuth: true }); return data?.data?.entryTest }
export async function saveEntryTest(id, payload) { const { data } = id ? await api.put(`/admin/entry-tests/${safeId(id)}`, payload, { requiresAuth: true }) : await api.post('/admin/entry-tests', payload, { requiresAuth: true }); return data?.data?.entryTest }
export async function deleteEntryTest(id) { await api.delete(`/admin/entry-tests/${safeId(id)}`, { requiresAuth: true }) }

export async function listMeritFormulas(values = {}, signal) {
  const { data } = await api.get('/admin/merit-formulas', { params: params(values), signal, requiresAuth: true })
  return list(data, 'meritFormulas')
}
export async function getMeritFormula(id, signal) { const { data } = await api.get(`/admin/merit-formulas/${safeId(id)}`, { signal, requiresAuth: true }); return data?.data?.meritFormula }
export async function saveMeritFormula(id, payload) { const { data } = id ? await api.put(`/admin/merit-formulas/${safeId(id)}`, payload, { requiresAuth: true }) : await api.post('/admin/merit-formulas', payload, { requiresAuth: true }); return data?.data?.meritFormula }
export async function deleteMeritFormula(id) { await api.delete(`/admin/merit-formulas/${safeId(id)}`, { requiresAuth: true }) }
