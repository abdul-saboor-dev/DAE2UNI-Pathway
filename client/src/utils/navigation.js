const AUTH_ROUTES = new Set(['/login', '/register'])

export function getSafeDestination(candidate, fallback = '/dashboard') {
  if (
    typeof candidate !== 'string' ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\')
  ) {
    return fallback
  }

  const pathname = candidate.split(/[?#]/, 1)[0]
  return AUTH_ROUTES.has(pathname) ? fallback : candidate
}
