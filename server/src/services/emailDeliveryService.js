import { isValidEmailConfiguration } from '../config/environment.js'
import ApiError from '../utils/ApiError.js'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'
const DELIVERY_ERROR = () => new ApiError(503, 'Verification email could not be sent. Please request another message shortly.', 'EMAIL_DELIVERY_UNAVAILABLE')

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
