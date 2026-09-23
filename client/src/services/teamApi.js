import api from './api.js'
import { teamQueryParams } from '../utils/adminTeamQuery.js'

const objectId = /^[a-f\d]{24}$/i
function safeId(value) {
  if (typeof value !== 'string' || !objectId.test(value)) throw new Error('Invalid user identifier.')
  return encodeURIComponent(value)
}

export async function listAdministrators(values, signal) {
  const { data } = await api.get('/admin/administrators', { params: teamQueryParams(values), signal, requiresAuth: true })
  if (!Array.isArray(data?.data?.users) || !data?.data?.pagination) throw new Error('Unexpected administrator list response.')
  return data.data
}

export async function promoteStudent(email, currentPassword) {
  const { data } = await api.post('/admin/administrators/promote', { email, currentPassword }, { requiresAuth: true })
  return data.data.user
}

export async function revokeAdmin(userId, currentPassword) {
  const { data } = await api.post(`/admin/administrators/${safeId(userId)}/revoke`, { currentPassword, confirmed: true }, { requiresAuth: true })
  return data.data.user
}

export async function grantCoOwner(userId, currentPassword, confirmEmail) {
  const { data } = await api.post(`/admin/administrators/${safeId(userId)}/grant-co-owner`, { currentPassword, confirmEmail, confirmed: true }, { requiresAuth: true })
  return data.data.user
}

export async function revokeCoOwner(userId, currentPassword, confirmEmail) {
  const { data } = await api.post(`/admin/administrators/${safeId(userId)}/revoke-co-owner`, { currentPassword, confirmEmail, confirmed: true }, { requiresAuth: true })
  return data.data.user
}
