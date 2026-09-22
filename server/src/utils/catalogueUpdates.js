export function setSimpleFields(document, updates, fields) {
  for (const field of fields) {
    if (updates[field] !== undefined) document.set(field, updates[field])
  }
}

export function mergeNestedFields(document, path, updates) {
  if (!updates) return
  for (const [key, value] of Object.entries(updates)) {
    document.set(`${path}.${key}`, value)
  }
}

export function mergeSourceFields(document, updates) {
  if (!updates) return

  const currentUrl = document.get('source.officialUrl')
  const urlChanged = updates.officialUrl !== undefined && updates.officialUrl !== currentUrl
  const verificationChanged =
    updates.verificationStatus !== undefined || updates.lastVerifiedAt !== undefined

  if (urlChanged || verificationChanged) {
    document.set('source.verificationRecord', undefined)
  }

  if (urlChanged) {
    document.set('source.lastVerifiedAt', undefined)
    if (updates.verificationStatus === undefined) {
      document.set('source.verificationStatus', 'pending_review')
    }
  }

  mergeNestedFields(document, 'source', updates)
}
