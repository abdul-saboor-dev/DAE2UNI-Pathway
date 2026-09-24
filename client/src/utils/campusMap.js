export function getCampusMapUrl(campus) {
  const address = typeof campus?.address === 'string' ? campus.address.trim() : ''
  if (!address) return null
  const parts = [address, campus.city, campus.district, campus.province]
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part) => part.trim())
  const location = parts.filter((part, index) => index === 0 || part.toLowerCase() !== parts[index - 1].toLowerCase()).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}
