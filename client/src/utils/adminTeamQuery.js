const allowedSorts = new Set(['name', '-name', 'createdAt', '-createdAt', 'lastLoginAt', '-lastLoginAt', 'role', '-role'])

export function teamQueryParams(values = {}) {
  const params = { page: Number.isInteger(values.page) && values.page > 0 ? values.page : 1, pageSize: 20 }
  if (typeof values.search === 'string' && values.search.trim() && values.search.trim().length <= 80) params.search = values.search.trim()
  if (allowedSorts.has(values.sort) && values.sort !== 'name') params.sort = values.sort
  return params
}
