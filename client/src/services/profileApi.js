import api from './api.js'

export async function getStudentProfile(signal) {
  const { data } = await api.get('/student/profile', {
    requiresAuth: true,
    signal,
  })
  return data.data.profile
}

export async function updateStudentProfile(profile) {
  const { data } = await api.put('/student/profile', profile, {
    requiresAuth: true,
  })
  return data.data.profile
}
