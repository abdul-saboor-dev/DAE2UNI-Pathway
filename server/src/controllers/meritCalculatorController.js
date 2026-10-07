import { calculateStudentMerit, getAvailableMeritFormulas } from '../services/meritCalculatorService.js'
import asyncHandler from '../utils/asyncHandler.js'

export const getMeritCalculatorOptions = asyncHandler(async (_request, response) => {
  response.status(200).json({ status: 'success', data: { formulas: await getAvailableMeritFormulas() } })
})

export const postMeritCalculation = asyncHandler(async (request, response) => {
  const result = await calculateStudentMerit(request.user._id, request.validated.body)
  response.status(200).json({ status: 'success', data: { result } })
})
