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
  // The app's route paths use plain slugs and ObjectIds. Reject encoded paths,
  // while retaining encoded search values in otherwise safe internal URLs.
  if (pathname.includes('%') || [...candidate].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return fallback
  return AUTH_ROUTES.has(pathname) ? fallback : candidate
}

export function getRoleDestination(candidate, role) {
  const fallback = role === 'admin' ? '/admin' : '/dashboard'
  const safe = getSafeDestination(candidate, fallback)
  const pathname = safe.split(/[?#]/, 1)[0]
  if (role === 'student' && (pathname === '/admin' || pathname.startsWith('/admin/'))) return '/unauthorized'
  if (role === 'admin' && (pathname === '/dashboard' || pathname === '/profile')) return fallback
  return safe
}
