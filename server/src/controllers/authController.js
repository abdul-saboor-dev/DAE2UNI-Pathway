import { login, registerStudent } from '../services/authService.js'
import asyncHandler from '../utils/asyncHandler.js'
import toSafeUser from '../utils/safeUser.js'
import { resendStudentVerification, verifyStudentEmail } from '../services/emailVerificationService.js'
import { normalizeEmail } from '../services/authService.js'
import { verifyTurnstile } from '../services/turnstileService.js'

export const register = asyncHandler(async (request, response) => {
  const user = await registerStudent(request.validated.body)
  response.status(201).json({ status: 'success', data: { user } })
})

export const loginUser = asyncHandler(async (request, response) => {
  const result = await login(request.validated.body)
  response.status(200).json({ status: 'success', data: result })
})

export const verifyEmail = asyncHandler(async (request, response) => {
  await verifyStudentEmail(request.validated.body.token)
  response.status(200).json({ status: 'success', data: { message: 'Email verified. You can now sign in.' } })
})

export const resendVerification = asyncHandler(async (request, response) => {
  const { email, turnstileToken } = request.validated.body
  await verifyTurnstile(turnstileToken, { expectedAction: 'email_verification_resend' })
  const message = await resendStudentVerification(normalizeEmail(email))
  response.status(200).json({ status: 'success', data: { message } })
})

export function getCurrentUser(request, response) {
  response.status(200).json({
    status: 'success',
    data: { user: toSafeUser(request.user) },
  })
}
