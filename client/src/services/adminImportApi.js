import api from './api.js'

export async function previewCatalogueImport(document) {
  const { data } = await api.post('/admin/catalogue-import/preview', document, { requiresAuth: true, timeout: 30000 })
  return data.data
}

export async function applyCatalogueImport(document) {
  const { data } = await api.post('/admin/catalogue-import/apply', { ...document, confirmed: true },
    { requiresAuth: true, timeout: 60000 })
  return data.data
}
