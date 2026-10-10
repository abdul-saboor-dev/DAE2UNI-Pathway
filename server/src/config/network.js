import { isIP } from 'node:net'

const ALWAYSDATA_PROVIDER = 'alwaysdata'
const LOCAL_PROXY_ADDRESSES = new Set(['127.0.0.1', '::1'])

function normalizeIpAddress(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  const normalized = trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed
  return isIP(normalized) ? normalized : null
}

function parseTrustedProxyAddresses(environment) {
  const addresses = new Set(LOCAL_PROXY_ADDRESSES)
  const configured = [
    environment.IP,
    environment.HOST,
    ...(environment.ALWAYSDATA_TRUSTED_PROXY_IPS || '').split(','),
  ]

  for (const value of configured) {
    const address = normalizeIpAddress(value)
    if (address && address !== '0.0.0.0' && address !== '::') addresses.add(address)
  }
  return addresses
}

export function getServerBinding(environment = process.env) {
  const configuredPort = environment.PORT
  const port = configuredPort === undefined || configuredPort === '' ? 5000 : Number(configuredPort)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.')
  }

  const hostCandidate = environment.IP ||
    (environment.NODE_ENV === 'production' ? environment.HOST : undefined)
  const host = typeof hostCandidate === 'string' ? hostCandidate.trim() : ''
  return host ? { host, port } : { port }
}

export function configureProxyTrust(app, environment = process.env) {
  if (environment.TRUST_PROXY_PROVIDER !== ALWAYSDATA_PROVIDER) {
    app.set('trust proxy', false)
    app.locals.isTrustedProxyAddress = () => false
    return
  }

  const trustedAddresses = parseTrustedProxyAddresses(environment)
  const isTrustedProxyAddress = (address) => {
    const normalized = normalizeIpAddress(address)
    return normalized ? trustedAddresses.has(normalized) : false
  }
  app.set('trust proxy', isTrustedProxyAddress)
  app.locals.isTrustedProxyAddress = isTrustedProxyAddress
}

export function getClientAddress(request) {
  const socketAddress = normalizeIpAddress(request.socket?.remoteAddress) || 'unknown'
  const trustProxy = request.app?.locals?.isTrustedProxyAddress
  if (typeof trustProxy !== 'function' || !trustProxy(socketAddress, 0)) return socketAddress

  // alwaysdata documents X-Real-IP as the client address set by its front proxy.
  // Reject combined/malformed values rather than accepting a user-supplied prefix.
  const realIpHeader = request.get?.('x-real-ip')
  if (typeof realIpHeader !== 'string' || realIpHeader.includes(',')) return socketAddress
  return normalizeIpAddress(realIpHeader) || socketAddress
}

export function validateNetworkEnvironment(environment = process.env) {
  const provider = environment.TRUST_PROXY_PROVIDER
  if (provider && provider !== ALWAYSDATA_PROVIDER) {
    throw new Error('TRUST_PROXY_PROVIDER must be omitted or set to alwaysdata.')
  }

  const explicitAddresses = (environment.ALWAYSDATA_TRUSTED_PROXY_IPS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (explicitAddresses.some((address) => {
    const normalized = normalizeIpAddress(address)
    return !normalized || normalized === '0.0.0.0' || normalized === '::'
  })) {
    throw new Error('ALWAYSDATA_TRUSTED_PROXY_IPS must contain only exact, non-wildcard IP addresses.')
  }
}
