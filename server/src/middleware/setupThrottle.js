import ApiError from '../utils/ApiError.js'

const attempts = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 20

export function setupThrottle(request, _response, next) {
  // Express trust proxy remains disabled; socket address ignores spoofed headers.
  const address = request.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const previous = attempts.get(address)
  const entry = !previous || previous.until <= now ? { count: 0, until: now + WINDOW_MS } : previous
  entry.count += 1
  attempts.set(address, entry)
  if (entry.count > MAX_ATTEMPTS) {
    return next(new ApiError(429, 'Too many setup attempts. Try again later.', 'SETUP_RATE_LIMITED'))
  }
  if (attempts.size > 500) {
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key)
  }
  return next()
}
