import { isValidEmailConfiguration } from '../config/environment.js'
import ApiError from '../utils/ApiError.js'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'
const DELIVERY_ERROR = () => new ApiError(503, 'Verification email could not be sent. Please request another message shortly.', 'EMAIL_DELIVERY_UNAVAILABLE')
const PASSWORD_RESET_DELIVERY_ERROR = () => new ApiError(503, 'Password recovery email could not be sent.', 'PASSWORD_RESET_DELIVERY_UNAVAILABLE')
const PASSWORD_RESET_DELIVERY_REJECTED = () => new ApiError(503, 'Password recovery email could not be sent.', 'PASSWORD_RESET_DELIVERY_REJECTED')
const PASSWORD_RESET_DELIVERY_UNCERTAIN = () => new ApiError(503, 'Password recovery email delivery could not be confirmed.', 'PASSWORD_RESET_DELIVERY_UNCERTAIN')

export function buildVerificationLink(token) {
  if (!isValidEmailConfiguration()) throw DELIVERY_ERROR()
  const url = new URL('/verify-email', process.env.CLIENT_BASE_URL)
  url.hash = `token=${encodeURIComponent(token)}`
  return url.toString()
}

export async function sendVerificationEmail({ email, token }, { fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  if (!isValidEmailConfiguration()) throw DELIVERY_ERROR()
  const url = buildVerificationLink(token)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_FROM_ADDRESS, name: process.env.EMAIL_FROM_NAME },
        to: [{ email }],
        subject: 'Verify your DAE2UNI Pathway student email',
        textContent: `DAE2UNI Pathway\n\nVerify your student account by opening this link:\n${url}\n\nThis link expires in 30 minutes. If you did not register, ignore this message.`,
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error('Delivery rejected')
  } catch {
    throw DELIVERY_ERROR()
  } finally {
    clearTimeout(timeout)
  }
}

export function buildPasswordResetLink(token) {
  if (!isValidEmailConfiguration()) throw PASSWORD_RESET_DELIVERY_ERROR()
  const url = new URL('/reset-password', process.env.CLIENT_BASE_URL)
  url.hash = `token=${encodeURIComponent(token)}`
  return url.toString()
}

export async function sendPasswordResetEmail({ email, name, token }, { fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  if (!isValidEmailConfiguration()) throw PASSWORD_RESET_DELIVERY_ERROR()
  const url = buildPasswordResetLink(token)
  const safeName = typeof name === 'string' ? name.replace(/[\r\n]+/g, ' ').trim() : ''
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetchImpl(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_FROM_ADDRESS, name: process.env.EMAIL_FROM_NAME },
        to: [{ email }],
        subject: 'Reset your DAE2UNI Pathway password',
        textContent: `DAE2UNI Pathway\n\n${safeName ? `Hello ${safeName},\n\n` : ''}Open this link to reset your password:\n${url}\n\nThis link expires in 30 minutes and can be used once. If you did not request a reset, ignore this message.`,
      }),
      signal: controller.signal,
    })
  } catch {
    // A timeout or network failure is ambiguous: Brevo may have accepted the
    // message before the acknowledgement was lost.
    throw PASSWORD_RESET_DELIVERY_UNCERTAIN()
  } finally {
    clearTimeout(timeout)
  }
  if (!response.ok) throw PASSWORD_RESET_DELIVERY_REJECTED()
  return { accepted: true, status: response.status }
}
