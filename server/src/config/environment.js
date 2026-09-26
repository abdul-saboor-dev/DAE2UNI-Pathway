const MINIMUM_JWT_SECRET_LENGTH = 32
const JWT_EXPIRATION_PATTERN = /^[1-9]\d*(?:ms|s|m|h|d|w|y)$/
const INSECURE_SECRET_MARKERS = ['replace-with-', 'change-me', 'changeme']
const TURNSTILE_TEST_SECRETS = new Set([
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
])
const TURNSTILE_ALWAYS_PASS_TEST_SECRET = '1x0000000000000000000000000000000AA'

export function isLocalAlwaysPassTurnstileSecret(secret, production = process.env.NODE_ENV === 'production') {
  return !production && secret === TURNSTILE_ALWAYS_PASS_TEST_SECRET
}

const EMAIL_PLACEHOLDERS = ['replace-with', 'change-me', 'example', 'placeholder', 'your-key']

export function isValidClientBaseUrl(value, production = process.env.NODE_ENV === 'production') {
  if (typeof value !== 'string' || !value || value !== value.trim()) return false
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || (!production && url.protocol === 'http:')) &&
      !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' &&
      !value.includes('\\') && !/\s/.test(value) &&
      (!production || !/^(?:localhost|127\.0\.0\.1|example\.com)$|\.(?:localhost|invalid|test|example)$/i.test(url.hostname))
  } catch { return false }
}

export function isValidEmailConfiguration(environment = process.env, production = environment.NODE_ENV === 'production') {
  const key = environment.BREVO_API_KEY
  const sender = environment.EMAIL_FROM_ADDRESS
  const name = environment.EMAIL_FROM_NAME
  return typeof key === 'string' && key.length >= 24 && key === key.trim() &&
    new Set(key).size >= 10 && !EMAIL_PLACEHOLDERS.some((marker) => key.toLowerCase().includes(marker)) &&
    (!production || !['temporary', 'synthetic', 'dummy', 'fixture', 'test-key'].some((marker) => key.toLowerCase().includes(marker))) &&
    key !== environment.JWT_SECRET && key !== environment.TURNSTILE_SECRET_KEY && key !== environment.ADMIN_SETUP_SECRET &&
    typeof sender === 'string' && sender.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender) &&
    (!production || !/@(?:example\.com|[^@]+\.(?:invalid|test|example|localhost))$/i.test(sender)) &&
    typeof name === 'string' && name.trim().length > 0 && name.length <= 120 && !/[\r\n]/.test(name) &&
    isValidClientBaseUrl(environment.CLIENT_BASE_URL, production)
}

export function isInvalidTurnstileSecret(secret, production = process.env.NODE_ENV === 'production') {
  if (typeof secret !== 'string') return true
  const normalized = secret.trim().toLowerCase()
  return secret.length < 32 || secret !== secret.trim() ||
    ['replace-with', 'change-me', 'changeme', 'example', 'placeholder', 'your-secret'].some((marker) => normalized.includes(marker)) ||
    (production && (TURNSTILE_TEST_SECRETS.has(secret) || new Set(secret).size < 10))
}

export function getTurnstileAllowedHostnames() {
  return (process.env.TURNSTILE_ALLOWED_HOSTNAMES || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
}

export function isWeakAdminSetupSecret(secret) {
  if (!secret) return true
  const normalized = secret.trim().toLowerCase()
  return secret.length < 32 || new Set(secret).size < 10 ||
    ['replace-with', 'change-me', 'changeme', 'example', 'placeholder', 'your-secret'].some((marker) => normalized.includes(marker))
}

function isWeakJwtSecret(secret) {
  const normalizedSecret = secret.trim().toLowerCase()

  return (
    secret.length < MINIMUM_JWT_SECRET_LENGTH ||
    INSECURE_SECRET_MARKERS.some((marker) => normalizedSecret.includes(marker)) ||
    new Set(secret).size < 10
  )
}

export default function validateEnvironment() {
  const requiredVariables = ['MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN']
  const missingVariables = requiredVariables.filter((name) => !process.env[name])

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}. Check .env.example.`,
    )
  }

  if (isWeakJwtSecret(process.env.JWT_SECRET)) {
    throw new Error(
      `JWT_SECRET must contain at least ${MINIMUM_JWT_SECRET_LENGTH} varied characters and must not use an example value.`,
    )
  }

  if (!JWT_EXPIRATION_PATTERN.test(process.env.JWT_EXPIRES_IN)) {
    throw new Error(
      'JWT_EXPIRES_IN must be a positive duration with a unit such as 15m, 1h, or 1d.',
    )
  }
  if (process.env.ADMIN_SETUP_SECRET && isWeakAdminSetupSecret(process.env.ADMIN_SETUP_SECRET)) {
    throw new Error('ADMIN_SETUP_SECRET must contain at least 32 varied characters and must not use an example value.')
  }
  if (process.env.ADMIN_SETUP_SECRET && process.env.ADMIN_SETUP_SECRET === process.env.JWT_SECRET) {
    throw new Error('ADMIN_SETUP_SECRET must be different from JWT_SECRET.')
  }
  if (process.env.TURNSTILE_SECRET_KEY &&
    (process.env.TURNSTILE_SECRET_KEY === process.env.JWT_SECRET ||
      process.env.TURNSTILE_SECRET_KEY === process.env.ADMIN_SETUP_SECRET)) {
    throw new Error('TURNSTILE_SECRET_KEY must be separate from other application secrets.')
  }
  if (process.env.NODE_ENV === 'production') {
    if (!isValidEmailConfiguration(process.env, true)) {
      throw new Error('Brevo sender, API key, and HTTPS CLIENT_BASE_URL must be configured securely.')
    }
    if (isInvalidTurnstileSecret(process.env.TURNSTILE_SECRET_KEY, true)) {
      throw new Error('TURNSTILE_SECRET_KEY must be a valid non-example production secret.')
    }
    const hostnames = getTurnstileAllowedHostnames()
    if (!hostnames.length || hostnames.some((host) =>
      host.length > 253 || !host.includes('.') ||
      !host.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
      host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.localhost')
    )) {
      throw new Error('TURNSTILE_ALLOWED_HOSTNAMES must list valid production hostnames without localhost.')
    }
  }
}
