import api from './api.js'

const objectId = /^[a-f\d]{24}$/i
function safeId(value) {
  if (typeof value !== 'string' || !objectId.test(value)) throw new Error('Invalid record identifier.')
  return encodeURIComponent(value)
}

export async function uploadCatalogueImage(file, target) {
  let intentId
  try {
    const { data: intentResponse } = await api.post('/admin/media/upload-intents', target, { requiresAuth: true })
    const upload = intentResponse?.data?.upload
    if (!upload?.intentId || !upload.uploadUrl || !upload.signature) throw new Error('The media API returned an invalid upload intent.')
    intentId = upload.intentId
    const body = new FormData()
    for (const [key, value] of Object.entries(upload.parameters || {})) {
      body.append(key, Array.isArray(value) ? value.join(',') : String(value))
    }
    body.append('api_key', upload.apiKey)
    body.append('signature', upload.signature)
    body.append('file', file)
    const providerResponse = await fetch(upload.uploadUrl, { method: 'POST', body })
    if (!providerResponse.ok) throw new Error('The image host rejected this upload.')
    const provider = await providerResponse.json()
    const completion = {
      intentId,
      publicId: provider.public_id,
      version: provider.version,
      signature: provider.signature,
    }
    const { data } = await api.post('/admin/media/upload-completions', completion, { requiresAuth: true })
    return data?.data?.media
  } catch (error) {
    if (intentId) {
      try { await api.delete(`/admin/media/upload-intents/${safeId(intentId)}`, { requiresAuth: true }) } catch { /* cleanup remains retryable server-side */ }
    }
    throw error
  }
}

export async function removeCatalogueImage(target) {
  await api.delete('/admin/media/attachments', { data: target, requiresAuth: true })
}

export async function listProgramDisciplines(params = {}, signal) {
  const { data } = await api.get('/admin/program-disciplines', { params, signal, requiresAuth: true })
  return data?.data || { disciplines: [], pagination: { page: 1, totalPages: 1, totalRecords: 0 } }
}

export async function createProgramDiscipline(payload) {
  const { data } = await api.post('/admin/program-disciplines', payload, { requiresAuth: true })
  return data?.data?.discipline
}

export async function updateProgramDiscipline(id, payload) {
  const { data } = await api.put(`/admin/program-disciplines/${safeId(id)}`, payload, { requiresAuth: true })
  return data?.data?.discipline
}

export async function deleteProgramDiscipline(id) {
  await api.delete(`/admin/program-disciplines/${safeId(id)}`, { requiresAuth: true })
}
