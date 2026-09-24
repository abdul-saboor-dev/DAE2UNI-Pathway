const statuses = new Set(['unverified', 'pending_review', 'needs_update', 'unavailable'])
const sorts = new Set(['name', '-name', 'updatedAt', '-updatedAt', 'lastVerifiedAt', '-lastVerifiedAt'])

export function parseVerificationQuery(params) {
  const page = Number(params.get('page'))
  return {
    entityType: params.get('entityType') === 'program' ? 'program' : 'university',
    verificationStatus: statuses.has(params.get('verificationStatus')) ? params.get('verificationStatus') : '',
    search: (params.get('search') || '').trim().slice(0, 100),
    sort: sorts.has(params.get('sort')) ? params.get('sort') : '-updatedAt',
    page: Number.isInteger(page) && page >= 1 && page <= 100000 ? page : 1,
  }
}

export function verificationParams(values) {
  const params = new URLSearchParams()
  if (values.entityType === 'program') params.set('entityType', 'program')
  if (statuses.has(values.verificationStatus)) params.set('verificationStatus', values.verificationStatus)
  if (typeof values.search === 'string' && values.search.trim()) params.set('search', values.search.trim().slice(0, 100))
  if (sorts.has(values.sort) && values.sort !== '-updatedAt') params.set('sort', values.sort)
  if (Number.isInteger(values.page) && values.page > 1) params.set('page', String(values.page))
  return params
}

export function nextVerificationParams(currentSearch, key, value) {
  const current = parseVerificationQuery(new URLSearchParams(currentSearch))
  return verificationParams({ ...current, [key]: value, page: key === 'page' ? Number(value) : 1 })
}
