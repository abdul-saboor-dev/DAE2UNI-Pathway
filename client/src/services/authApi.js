import api from './api.js'

export async function registerStudent({ name, email, password, turnstileToken }) {
  const { data } = await api.post('/auth/register', { name, email, password, turnstileToken })
  return data.data.user
}

export async function loginStudent({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password })
  return data.data
}

export async function getCurrentUser(signal) {
  const { data } = await api.get('/auth/me', { requiresAuth: true, signal })
  return data.data.user
}

export async function verifyEmailToken(token) {
  const { data } = await api.post('/auth/verify-email', { token })
  return data.data
}

export async function resendVerificationEmail({ email, turnstileToken }) {
  const { data } = await api.post('/auth/resend-verification', { email, turnstileToken })
  return data.data
}

export async function requestPasswordReset({ email, turnstileToken }) {
  // Siteverify and transactional delivery are sequential server operations, so
  // this public request needs more time than ordinary API calls.
  const { data } = await api.post('/auth/forgot-password', { email, turnstileToken }, { timeout: 15000 })
  return data.data
}

export async function resetPassword({ token, password }) {
  const { data } = await api.post('/auth/reset-password', { token, password })
  return data.data
}
