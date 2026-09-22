import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 5000,
  headers: {
    Accept: 'application/json',
  },
})

export async function getHealth(signal) {
  const { data } = await api.get('/health', { signal })
  return data
}

export default api
