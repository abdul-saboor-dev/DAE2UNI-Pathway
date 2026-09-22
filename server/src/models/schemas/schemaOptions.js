export const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
}

export const verificationStatuses = [
  'unverified',
  'pending_review',
  'verified',
  'needs_update',
  'unavailable',
]

export function isHttpUrl(value) {
  if (!value) return true

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeUppercaseList(values) {
  if (!Array.isArray(values)) return values

  return values
    .filter((value) => value != null)
    .map((value) => String(value).trim().toUpperCase())
    .filter(Boolean)
}
