import axios from 'axios'
import {
  AUTH_INVALID_EVENT,
  clearAccessToken,
  getAccessToken,
} from './tokenStorage.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 5000,
  headers: {
    Accept: 'application/json',
  },
})

export const ROLE_REFRESH_EVENT = 'dae2uni:role-refresh'

api.interceptors.request.use((config) => {
  if (config.requiresAuth) {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const authenticationRejected =
      error.response?.status === 401 ||
      (error.response?.status === 403 && error.response?.data?.code === 'ACCOUNT_DISABLED')

    if (authenticationRejected && error.config?.requiresAuth) {
      clearAccessToken()
      window.dispatchEvent(new Event(AUTH_INVALID_EVENT))
    } else if (error.response?.status === 403 && error.response?.data?.code === 'FORBIDDEN' &&
      error.config?.requiresAuth && String(error.config.url || '').startsWith('/admin/')) {
      window.dispatchEvent(new Event(ROLE_REFRESH_EVENT))
    }
    return Promise.reject(error)
  },
)

export async function getHealth(signal) {
  const { data } = await api.get('/health', { signal })
  return data
}

export default api
