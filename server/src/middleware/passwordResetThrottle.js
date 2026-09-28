import { PASSWORD_RESET_GENERIC_MESSAGE } from '../services/passwordRecoveryService.js'

const attempts = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 20

export function passwordResetIpThrottle(request, response, next) {
  // Express trust proxy remains disabled, so spoofed forwarded headers are ignored.
  const address = request.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const previous = attempts.get(address)
  const entry = !previous || previous.until <= now ? { count: 0, until: now + WINDOW_MS } : previous
  entry.count += 1
  attempts.set(address, entry)
  if (entry.count > MAX_ATTEMPTS) {
    return response.status(200).json({ status: 'success', data: { message: PASSWORD_RESET_GENERIC_MESSAGE } })
  }
  if (attempts.size > 500) {
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key)
  }
  return next()
}

export function resetPasswordResetThrottleForTests() {
  attempts.clear()
}
