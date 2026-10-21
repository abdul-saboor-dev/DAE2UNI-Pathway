export function getSafeGoogleMapsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || url.username || url.password) return null
    if (host !== 'google.com' && !host.endsWith('.google.com') && host !== 'maps.app.goo.gl' && host !== 'goo.gl') return null
    return url.href
  } catch { return null }
}

export function getCampusMapUrl(campus) {
  const latitude = campus?.latitude
  const longitude = campus?.longitude
  if (Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
      Number.isFinite(longitude) && longitude >= -180 && longitude <= 180) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
  }
  return getSafeGoogleMapsUrl(campus?.googleMapsUrl)
}
