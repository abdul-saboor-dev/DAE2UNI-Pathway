import { login, registerStudent } from '../services/authService.js'
import asyncHandler from '../utils/asyncHandler.js'
import toSafeUser from '../utils/safeUser.js'

export const register = asyncHandler(async (request, response) => {
  const user = await registerStudent(request.validated.body)
  response.status(201).json({ status: 'success', data: { user } })
})

export const loginUser = asyncHandler(async (request, response) => {
  const result = await login(request.validated.body)
  response.status(200).json({ status: 'success', data: result })
})

export function getCurrentUser(request, response) {
  response.status(200).json({
    status: 'success',
    data: { user: toSafeUser(request.user) },
  })
}
