const states = new Set(['eligible', 'not_eligible', 'needs_information', 'needs_manual_review', 'unavailable'])
const outcomes = new Set(['matched', 'failed', 'missing', 'manual_review', 'unavailable'])

function text(value, maximum) {
  return typeof value === 'string' ? value.slice(0, maximum) : ''
}

function reference(value, withSlug = false) {
  if (!value || typeof value !== 'object') return null
  const id = text(value.id, 24)
  const name = text(value.name, 240)
  if (!id || !name) return null
  return { id, name, ...(withSlug && { slug: text(value.slug, 240) }) }
}

export function normalizeEligibilityResults(value) {
  if (!Array.isArray(value)) throw new Error('The eligibility service returned an unexpected response.')
  return value.map((item) => {
    if (!item || !states.has(item.state) || typeof item.message !== 'string' || !Array.isArray(item.reasons)) {
      throw new Error('The eligibility service returned an unexpected result.')
    }
    const reasons = item.reasons.map((reason) => {
      if (!reason || typeof reason.code !== 'string' || !outcomes.has(reason.outcome) || typeof reason.message !== 'string') {
        throw new Error('The eligibility service returned an unexpected explanation.')
      }
      return { code: text(reason.code, 120), outcome: reason.outcome, message: text(reason.message, 600) }
    })
    return {
      state: item.state,
      message: text(item.message, 600),
      university: reference(item.university),
      program: reference(item.program, true),
      rule: item.rule && typeof item.rule === 'object'
        ? { code: text(item.rule.code, 80), name: text(item.rule.name, 240) }
        : null,
      source: item.source && typeof item.source === 'object'
        ? { officialUrl: text(item.source.officialUrl, 2048) }
        : null,
      reasons,
    }
  })
}
