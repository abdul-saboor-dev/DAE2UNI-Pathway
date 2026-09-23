import ApiError from '../utils/ApiError.js'

const attempts = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 60

export function teamThrottle(request, _response, next) {
  const key = `${request.user?._id || 'unknown'}:${request.socket.remoteAddress || 'unknown'}`
  const now = Date.now()
  const previous = attempts.get(key)
  const entry = !previous || previous.until <= now ? { count: 0, until: now + WINDOW_MS } : previous
  entry.count++
  attempts.set(key, entry)
  if (entry.count > MAX_ATTEMPTS) return next(new ApiError(429, 'Too many role-change attempts. Try again later.', 'ROLE_RATE_LIMITED'))
  if (attempts.size > 1000) for (const [id, value] of attempts) if (value.until <= now) attempts.delete(id)
  return next()
}
