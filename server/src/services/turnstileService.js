import ApiError from '../utils/ApiError.js'
import { getTurnstileAllowedHostnames, isInvalidTurnstileSecret } from '../config/environment.js'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const FAILURE_MESSAGE = 'Human verification failed. Please try again.'

export async function verifyTurnstile(token, { fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (isInvalidTurnstileSecret(secret)) {
    throw new ApiError(503, 'Human verification is temporarily unavailable.', 'HUMAN_VERIFICATION_UNAVAILABLE')
  }
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) {
    throw new ApiError(400, FAILURE_MESSAGE, 'HUMAN_VERIFICATION_FAILED')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error('Siteverify rejected the request')
    const result = await response.json()
    const hostnames = getTurnstileAllowedHostnames()
    const hostname = typeof result?.hostname === 'string' ? result.hostname.toLowerCase() : ''
    if (result?.success !== true || result.action !== 'student_register' || !hostname ||
      typeof result.challenge_ts !== 'string' || Number.isNaN(Date.parse(result.challenge_ts)) ||
      (hostnames.length > 0 && !hostnames.includes(hostname))) {
      throw new Error('Siteverify did not approve registration')
    }
  } catch {
    throw new ApiError(400, FAILURE_MESSAGE, 'HUMAN_VERIFICATION_FAILED')
  } finally {
    clearTimeout(timeout)
  }
}
