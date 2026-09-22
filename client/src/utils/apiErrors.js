export function getApiErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

export function getApiFieldErrors(error) {
  const details = error.response?.data?.details
  if (!Array.isArray(details)) return {}

  return details.reduce((errors, detail) => {
    const path = detail.path?.replace(/^body\./, '')
    if (path && detail.message && !errors[path]) {
      errors[path] = detail.message
    }
    return errors
  }, {})
}

export function isApiError(error, status, code) {
  return (
    error.response?.status === status &&
    (code === undefined || error.response?.data?.code === code)
  )
}
