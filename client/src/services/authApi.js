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
