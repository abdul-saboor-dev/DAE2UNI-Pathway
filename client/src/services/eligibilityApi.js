import api from './api.js'
import { normalizeEligibilityResults } from '../utils/eligibilityResults.js'

export async function getStudentEligibility(signal) {
  const { data } = await api.get('/student/eligibility', { requiresAuth: true, signal })
  return normalizeEligibilityResults(data?.data?.results)
}
