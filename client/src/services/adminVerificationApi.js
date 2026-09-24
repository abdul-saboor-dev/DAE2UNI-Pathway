import api from './api.js'
import { verificationParams } from '../utils/verificationQueueQuery.js'

const idPattern = /^[a-f\d]{24}$/i
export async function getVerificationQueue(values, signal) {
  const params = Object.fromEntries(verificationParams(values))
  params.pageSize = 20
  const { data } = await api.get('/admin/verification-queue', { params, signal, requiresAuth: true })
  if (!Array.isArray(data?.data?.records) || !data?.data?.pagination) throw new Error('Unexpected verification queue response.')
  return data.data
}

export async function verifySource(record, input) {
  if (!['university', 'program'].includes(record.entityType) || !idPattern.test(record.id)) throw new Error('Invalid catalogue record.')
  const { data } = await api.post(`/admin/verification-queue/${record.entityType}/${encodeURIComponent(record.id)}/verify`,
    { officialUrl: record.sourceUrl, sourceTitle: input.sourceTitle.trim(), sourceType: input.sourceType, confirmed: true },
    { requiresAuth: true })
  return data.data.record
}
