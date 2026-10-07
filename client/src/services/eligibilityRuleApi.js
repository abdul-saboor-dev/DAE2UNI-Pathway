import api from './api.js'
import { buildEligibilityRulePayload } from '../utils/eligibilityRules.js'

const objectId = /^[a-f\d]{24}$/i
function safeId(value) {
  if (typeof value !== 'string' || !objectId.test(value)) throw new Error('Invalid rule identifier.')
  return encodeURIComponent(value)
}

function listParams(values = {}) {
  const params = {}
  if (values.search) params.search = values.search.trim().slice(0, 100)
  if (['draft', 'published', 'archived'].includes(values.recordStatus)) params.recordStatus = values.recordStatus
  if (Number.isInteger(values.page) && values.page > 1) params.page = values.page
  params.pageSize = 20
  if (['name', '-name', 'updatedAt', '-updatedAt'].includes(values.sort)) params.sort = values.sort
  return params
}

export async function listEligibilityRules(values, signal) {
  const { data } = await api.get('/admin/eligibility-rules', { params: listParams(values), signal, requiresAuth: true })
  if (!Array.isArray(data?.data?.rules) || !data?.data?.pagination) throw new Error('Unexpected eligibility-rule response.')
  return data.data
}
export async function getEligibilityRule(id, signal) {
  const { data } = await api.get(`/admin/eligibility-rules/${safeId(id)}`, { signal, requiresAuth: true })
  return data?.data?.rule
}
export async function getEligibilityRuleOptions(values = {}, signal) {
  const params = {}
  if (objectId.test(values.university || '')) params.university = values.university
  if (objectId.test(values.program || '')) params.program = values.program
  const { data } = await api.get('/admin/eligibility-rules/options', { params, signal, requiresAuth: true })
  for (const key of ['universities', 'programs', 'admissionCycles', 'research', 'entryTests']) {
    if (!Array.isArray(data?.data?.[key])) throw new Error('Unexpected eligibility-rule options response.')
  }
  return data.data
}
export async function createEligibilityRule(values) {
  const { data } = await api.post('/admin/eligibility-rules', buildEligibilityRulePayload(values), { requiresAuth: true })
  return data?.data?.rule
}
export async function updateEligibilityRule(id, values) {
  const { data } = await api.put(`/admin/eligibility-rules/${safeId(id)}`, buildEligibilityRulePayload(values), { requiresAuth: true })
  return data?.data?.rule
}
export async function deleteEligibilityRule(id) {
  await api.delete(`/admin/eligibility-rules/${safeId(id)}`, { requiresAuth: true })
}
