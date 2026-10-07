import api from './api.js'
import { buildEligibilityResearchPayload } from '../utils/eligibilityResearch.js'

const objectId = /^[a-f\d]{24}$/i
const statuses = new Set(['not_started', 'researching', 'blocked', 'ready_for_review', 'verified'])

function safeId(value) {
  if (typeof value !== 'string' || !objectId.test(value)) throw new Error('Invalid record identifier.')
  return encodeURIComponent(value)
}

function listParams(values = {}) {
  const params = new URLSearchParams()
  if (statuses.has(values.researchStatus)) params.set('researchStatus', values.researchStatus)
  if (objectId.test(values.university || '')) params.set('university', values.university)
  if (objectId.test(values.program || '')) params.set('program', values.program)
  if (Number.isInteger(values.page) && values.page > 1) params.set('page', String(values.page))
  params.set('pageSize', '20')
  if (['updatedAt', '-updatedAt', 'reviewedDate', '-reviewedDate'].includes(values.sort)) {
    params.set('sort', values.sort)
  }
  return Object.fromEntries(params)
}

export async function listEligibilityResearch(values, signal) {
  const { data } = await api.get('/admin/eligibility-research', {
    params: listParams(values),
    signal,
    requiresAuth: true,
  })
  if (!Array.isArray(data?.data?.records) || !data?.data?.pagination) {
    throw new Error('Unexpected eligibility research response.')
  }
  return data.data
}

export async function getEligibilityResearchOptions(values = {}, signal) {
  const params = {}
  if (objectId.test(values.university || '')) params.university = values.university
  if (objectId.test(values.program || '')) params.program = values.program
  const { data } = await api.get('/admin/eligibility-research/options', {
    params,
    signal,
    requiresAuth: true,
  })
  for (const key of ['universities', 'programs', 'admissionCycles']) {
    if (!Array.isArray(data?.data?.[key])) throw new Error('Unexpected research options response.')
  }
  return data.data
}

export async function createEligibilityResearch(values) {
  const { data } = await api.post(
    '/admin/eligibility-research',
    buildEligibilityResearchPayload(values),
    { requiresAuth: true },
  )
  return data?.data?.record
}

export async function updateEligibilityResearch(id, values) {
  const { data } = await api.put(
    `/admin/eligibility-research/${safeId(id)}`,
    buildEligibilityResearchPayload(values),
    { requiresAuth: true },
  )
  return data?.data?.record
}
