const MINIMUM_JWT_SECRET_LENGTH = 32
const JWT_EXPIRATION_PATTERN = /^[1-9]\d*(?:ms|s|m|h|d|w|y)$/
const INSECURE_SECRET_MARKERS = ['replace-with-', 'change-me', 'changeme']

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
}
