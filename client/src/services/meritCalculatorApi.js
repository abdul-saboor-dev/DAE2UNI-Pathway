import api from './api.js'
export { buildMeritCalculationPayload, emptyTemporaryDaeMarks, profileDaeToTemporaryMarks, validateTemporaryDaeMarks } from '../utils/meritCalculator.js'

const objectId = /^[a-f\d]{24}$/i

export async function getMeritCalculatorOptions(signal) {
  const { data } = await api.get('/student/merit-calculator/options', { requiresAuth: true, signal })
  const formulas = data?.data?.formulas
  if (!Array.isArray(formulas)) throw new Error('The merit calculator returned an unexpected response.')
  return formulas.filter((formula) => formula && objectId.test(formula.id))
}

export async function calculateMerit(payload) {
  const { data } = await api.post('/student/merit-calculator/calculate', payload, { requiresAuth: true })
  return data?.data?.result
}
