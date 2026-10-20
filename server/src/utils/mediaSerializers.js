function cloudinaryVariant(url, width) {
  return typeof url === 'string'
    ? url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`)
    : undefined
}

export function toSafeMedia(asset, widths = [480, 960, 1440]) {
  if (!asset || typeof asset !== 'object' || !asset.secureUrl) return null
  const available = widths.filter((width) => width <= asset.width)
  const candidates = available.length ? available : [Math.min(asset.width, widths[0])]
  return {
    id: asset._id?.toString() || asset.id?.toString(),
    url: cloudinaryVariant(asset.secureUrl, Math.min(asset.width, widths.at(-1))),
    srcSet: candidates.map((width) => `${cloudinaryVariant(asset.secureUrl, width)} ${width}w`).join(', '),
    width: asset.width,
    height: asset.height,
  }
}

export function toAdminDiscipline(record) {
  const discipline = record.toObject ? record.toObject() : record
  return {
    id: discipline._id?.toString() || discipline.id?.toString(),
    name: discipline.name,
    slug: discipline.slug,
    aliases: discipline.aliases || [],
    image: toSafeMedia(discipline.imageMedia, [480, 960, 1440]),
    createdAt: discipline.createdAt instanceof Date ? discipline.createdAt.toISOString() : discipline.createdAt,
    updatedAt: discipline.updatedAt instanceof Date ? discipline.updatedAt.toISOString() : discipline.updatedAt,
  }
}
