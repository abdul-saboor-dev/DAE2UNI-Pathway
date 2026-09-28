import { login, registerStudent } from '../services/authService.js'
import asyncHandler from '../utils/asyncHandler.js'
import toSafeUser from '../utils/safeUser.js'
import { resendStudentVerification, verifyStudentEmail } from '../services/emailVerificationService.js'
import { normalizeEmail } from '../services/authService.js'
import { verifyTurnstile } from '../services/turnstileService.js'
import { PASSWORD_RESET_GENERIC_MESSAGE, requestPasswordReset, resetPassword } from '../services/passwordRecoveryService.js'

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

export const forgotPassword = asyncHandler(async (request, response) => {
  const { email, turnstileToken } = request.validated.body
  await verifyTurnstile(turnstileToken, { expectedAction: 'password_reset_request' })
  const startedAt = Date.now()
  await requestPasswordReset(email)
  const minimumResponseMs = 350
  const remainingDelay = minimumResponseMs - (Date.now() - startedAt)
  if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay))
  response.status(200).json({ status: 'success', data: { message: PASSWORD_RESET_GENERIC_MESSAGE } })
})

export const completePasswordReset = asyncHandler(async (request, response) => {
  const message = await resetPassword(request.validated.body.token, request.validated.body.password)
  response.status(200).json({ status: 'success', data: { message } })
})

export function getCurrentUser(request, response) {
  response.status(200).json({
    status: 'success',
    data: { user: toSafeUser(request.user) },
  })
}
