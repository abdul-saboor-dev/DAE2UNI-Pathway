import { evaluateStudentEligibility } from '../services/eligibilityEvaluationService.js'
import asyncHandler from '../utils/asyncHandler.js'

export const getStudentEligibility = asyncHandler(async (request, response) => {
  const results = await evaluateStudentEligibility(request.user._id, request.validated.query)
  response.status(200).json({ status: 'success', data: { results } })
})
