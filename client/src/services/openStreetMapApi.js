const searchEndpoint = 'https://nominatim.openstreetmap.org/search'

export function buildOpenStreetMapSearchUrl(query, { broad = false } = {}) {
  const normalized = typeof query === 'string' ? query.trim() : ''
  if (normalized.length < 2 || normalized.length > 160) return null
  const url = new URL(searchEndpoint)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', normalized)
  url.searchParams.set('limit', '10')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('accept-language', 'en')
  if (!broad) url.searchParams.set('countrycodes', 'pk')
  return url.toString()
}

export async function searchOpenStreetMap(query, signal, options) {
  const url = buildOpenStreetMapSearchUrl(query, options)
  if (!url) throw new Error('Enter between 2 and 160 characters.')
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error('Location search is temporarily unavailable.')
  const payload = await response.json()
  if (!Array.isArray(payload)) throw new Error('Location search returned an invalid response.')
  return payload.flatMap((item) => {
    const latitude = Number(item?.lat)
    const longitude = Number(item?.lon)
    const label = typeof item?.display_name === 'string' ? item.display_name.trim() : ''
    if (!label || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return []
    return [{ id: String(item.place_id || `${latitude},${longitude}`), label, latitude, longitude }]
  }).slice(0, 10)
}
