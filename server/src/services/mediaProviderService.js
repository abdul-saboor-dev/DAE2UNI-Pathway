import crypto from 'node:crypto'
import ApiError from '../utils/ApiError.js'

export const MEDIA_FORMATS = Object.freeze(['jpg', 'jpeg', 'png', 'webp', 'avif'])
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
  const folder = (process.env.CLOUDINARY_MEDIA_FOLDER || 'dae2uni/catalogue')
    .trim().replace(/^\/+|\/+$/g, '')
  if (!cloudName || !apiKey || !apiSecret || !folder) {
    throw new ApiError(503, 'Media hosting is not configured.', 'MEDIA_PROVIDER_UNAVAILABLE')
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(cloudName) || !/^[a-zA-Z0-9/_-]+$/.test(folder)) {
    throw new ApiError(500, 'Media hosting configuration is invalid.', 'MEDIA_PROVIDER_INVALID')
  }
  return { cloudName, apiKey, apiSecret, folder }
}

function valueForSignature(value) {
  return Array.isArray(value) ? value.join(',') : String(value)
}

export function signCloudinaryParameters(parameters, secret) {
  const message = Object.entries(parameters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => `${key}=${valueForSignature(value)}`)
    .join('&')
  return crypto.createHash('sha1').update(`${message}${secret}`, 'utf8').digest('hex')
}

export function createSignedUpload(publicId, targetType) {
  const { cloudName, apiKey, apiSecret, folder } = cloudinaryConfig()
  const timestamp = Math.floor(Date.now() / 1000)
  const dimensions = targetType === 'university_logo' ? 'c_limit,w_1200,h_1200' : 'c_limit,w_2400,h_1600'
  const parameters = {
    allowed_formats: MEDIA_FORMATS,
    overwrite: false,
    public_id: publicId,
    timestamp,
    transformation: dimensions,
  }
  return {
    cloudName,
    apiKey,
    timestamp,
    publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    parameters,
    signature: signCloudinaryParameters(parameters, apiSecret),
    maxBytes: MEDIA_MAX_BYTES,
    allowedFormats: MEDIA_FORMATS,
  }
}

function safeEqual(first, second) {
  if (!/^[a-f\d]{40}$/i.test(first || '') || !/^[a-f\d]{40}$/i.test(second || '')) return false
  return crypto.timingSafeEqual(Buffer.from(first, 'hex'), Buffer.from(second, 'hex'))
}

function validateCloudinaryAsset(asset, expectedPublicId, cloudName, folder) {
  if (asset.publicId !== expectedPublicId || !expectedPublicId.startsWith(`${folder}/`)) {
    throw new ApiError(400, 'The uploaded asset does not match its signed intent.', 'INVALID_MEDIA_ASSET')
  }
  let url
  try { url = new URL(asset.secureUrl) } catch { url = null }
  const expectedPath = `/${cloudName}/image/upload/`
  if (url?.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(expectedPath)) {
    throw new ApiError(400, 'The media delivery URL is not owned by the configured provider.', 'INVALID_MEDIA_URL')
  }
  if (asset.resourceType !== 'image' || !MEDIA_FORMATS.includes(asset.format)) {
    throw new ApiError(400, 'Only supported image formats may be attached.', 'INVALID_MEDIA_FORMAT')
  }
  if (asset.bytes > MEDIA_MAX_BYTES) {
    throw new ApiError(400, 'The image exceeds the five megabyte limit.', 'MEDIA_TOO_LARGE')
  }
  return asset
}

async function fetchCloudinaryAsset(publicId) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig()
  const encodedPublicId = publicId.split('/').map(encodeURIComponent).join('/')
  const authorization = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString('base64')
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload/${encodedPublicId}`, {
    headers: { authorization: `Basic ${authorization}` },
  })
  if (!response.ok) throw new ApiError(502, 'The uploaded image could not be verified with the media provider.', 'MEDIA_PROVIDER_VERIFICATION_FAILED')
  const asset = await response.json()
  return {
    publicId: asset.public_id,
    version: asset.version,
    format: asset.format,
    resourceType: asset.resource_type,
    secureUrl: asset.secure_url,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    checksum: asset.etag,
  }
}

export async function verifyCloudinaryUpload(result, expectedPublicId) {
  const { cloudName, apiSecret, folder } = cloudinaryConfig()
  if (result.publicId !== expectedPublicId || !expectedPublicId.startsWith(`${folder}/`)) {
    throw new ApiError(400, 'The uploaded asset does not match its signed intent.', 'INVALID_MEDIA_ASSET')
  }
  const expectedSignature = signCloudinaryParameters({ public_id: result.publicId, version: result.version }, apiSecret)
  if (!safeEqual(result.signature, expectedSignature)) {
    throw new ApiError(400, 'The media provider response could not be verified.', 'INVALID_MEDIA_SIGNATURE')
  }
  const asset = await fetchCloudinaryAsset(expectedPublicId)
  if (asset.version !== result.version) {
    throw new ApiError(400, 'The uploaded asset version does not match its signed response.', 'INVALID_MEDIA_ASSET')
  }
  return validateCloudinaryAsset(asset, expectedPublicId, cloudName, folder)
}

export async function destroyCloudinaryAsset(publicId) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig()
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = signCloudinaryParameters({ invalidate: true, public_id: publicId, timestamp }, apiSecret)
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), invalidate: 'true', api_key: apiKey, signature })
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`, {
    method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' },
  })
  if (!response.ok) throw new Error(`Cloudinary deletion failed with HTTP ${response.status}.`)
  const payload = await response.json()
  if (!['ok', 'not found'].includes(payload?.result)) throw new Error('Cloudinary did not confirm asset deletion.')
}

export function mediaFolder() {
  return cloudinaryConfig().folder
}

// The catalogue service depends on this small adapter contract rather than a
// provider SDK. Tests and a future provider can replace the adapter without
// changing catalogue models or API payloads.
export const cloudinaryMediaProvider = {
  name: 'cloudinary',
  createSignedUpload,
  verifyUpload: verifyCloudinaryUpload,
  destroyAsset: destroyCloudinaryAsset,
  folder: mediaFolder,
}
