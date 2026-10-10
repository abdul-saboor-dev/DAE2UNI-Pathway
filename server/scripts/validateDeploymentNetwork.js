import assert from 'node:assert/strict'
import express from 'express'
import {
  configureProxyTrust,
  getClientAddress,
  getServerBinding,
  validateNetworkEnvironment,
} from '../src/config/network.js'
import { setupThrottle } from '../src/middleware/setupThrottle.js'
import {
  passwordResetIpThrottle,
  resetPasswordResetThrottleForTests,
} from '../src/middleware/passwordResetThrottle.js'
import { teamThrottle } from '../src/middleware/teamThrottle.js'

let checks = 0
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks += 1 }
function check(value, message) { assert.ok(value, message); checks += 1 }

function createRequest(app, realIp, userId = 'actor') {
  return {
    app,
    socket: { remoteAddress: '::ffff:127.0.0.1' },
    user: { _id: userId },
    get(name) { return name.toLowerCase() === 'x-real-ip' ? realIp : undefined },
  }
}

function invokeThrottle(middleware, request) {
  let nextValue = Symbol('not-called')
  let responseStatus
  const response = {
    status(status) { responseStatus = status; return this },
    json() { return this },
  }
  middleware(request, response, (value) => { nextValue = value })
  return { nextValue, responseStatus }
}

let server
try {
  equal(getServerBinding({}).port, 5000, 'local default port')
  check(!('host' in getServerBinding({ HOST: 'local-shell-name' })), 'development ignores generic HOST')
  equal(getServerBinding({ PORT: '8123', IP: '::' }).host, '::', 'provider IP is selected')
  equal(getServerBinding({ PORT: '8123', HOST: '127.0.0.1', NODE_ENV: 'production' }).host, '127.0.0.1', 'production HOST fallback')
  assert.throws(() => getServerBinding({ PORT: 'invalid' }), /PORT must be an integer/)
  checks += 1

  const bindingApp = express()
  server = bindingApp.listen(getServerBinding({ PORT: '8124', IP: '127.0.0.1' }))
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })
  equal(server.address().address, '127.0.0.1', 'listen options bind the requested provider address')
  await new Promise((resolve) => server.close(resolve))
  server = null

  const untrustedApp = express()
  configureProxyTrust(untrustedApp, {})
  equal(getClientAddress({
    app: untrustedApp,
    socket: { remoteAddress: '203.0.113.8' },
    get: () => '198.51.100.12',
  }), '203.0.113.8', 'spoofed X-Real-IP is ignored without provider trust')

  const trustedApp = express()
  configureProxyTrust(trustedApp, { TRUST_PROXY_PROVIDER: 'alwaysdata', IP: '::' })
  equal(getClientAddress(createRequest(trustedApp, '198.51.100.12')), '198.51.100.12', 'trusted alwaysdata X-Real-IP is used')
  equal(getClientAddress({
    app: trustedApp,
    socket: { remoteAddress: '::ffff:127.0.0.1' },
    get: (name) => name.toLowerCase() === 'x-forwarded-for' ? '198.51.100.99' : undefined,
  }), '127.0.0.1', 'undocumented forwarded-for input does not control throttle identity')
  equal(getClientAddress(createRequest(trustedApp, '198.51.100.12, 203.0.113.9')), '127.0.0.1', 'combined X-Real-IP is rejected')
  equal(getClientAddress({
    app: trustedApp,
    socket: { remoteAddress: '203.0.113.8' },
    get: () => '198.51.100.12',
  }), '203.0.113.8', 'untrusted direct peer cannot inject X-Real-IP')

  const explicitProxyApp = express()
  configureProxyTrust(explicitProxyApp, {
    TRUST_PROXY_PROVIDER: 'alwaysdata',
    ALWAYSDATA_TRUSTED_PROXY_IPS: '192.0.2.20',
  })
  equal(getClientAddress({
    app: explicitProxyApp,
    socket: { remoteAddress: '192.0.2.20' },
    get: () => '198.51.100.15',
  }), '198.51.100.15', 'explicit exact proxy peer is trusted')
  assert.throws(
    () => validateNetworkEnvironment({ TRUST_PROXY_PROVIDER: 'other' }),
    /TRUST_PROXY_PROVIDER/,
  )
  checks += 1
  assert.throws(
    () => validateNetworkEnvironment({ ALWAYSDATA_TRUSTED_PROXY_IPS: '0.0.0.0' }),
    /exact, non-wildcard IP/,
  )
  checks += 1

  for (let index = 0; index < 20; index += 1) {
    check(!(invokeThrottle(setupThrottle, createRequest(trustedApp, '198.51.100.21')).nextValue instanceof Error), 'setup request below limit')
  }
  equal(invokeThrottle(setupThrottle, createRequest(trustedApp, '198.51.100.21')).nextValue?.statusCode, 429, 'setup limiter groups one real client')
  check(!(invokeThrottle(setupThrottle, createRequest(trustedApp, '198.51.100.22')).nextValue instanceof Error), 'setup limiter separates real clients')

  resetPasswordResetThrottleForTests()
  for (let index = 0; index < 20; index += 1) {
    check(invokeThrottle(passwordResetIpThrottle, createRequest(trustedApp, '198.51.100.31')).responseStatus === undefined, 'password request below limit')
  }
  equal(invokeThrottle(passwordResetIpThrottle, createRequest(trustedApp, '198.51.100.31')).responseStatus, 200, 'password limiter preserves generic response')
  check(invokeThrottle(passwordResetIpThrottle, createRequest(trustedApp, '198.51.100.32')).responseStatus === undefined, 'password limiter separates real clients')

  for (let index = 0; index < 60; index += 1) {
    check(!(invokeThrottle(teamThrottle, createRequest(trustedApp, '198.51.100.41')).nextValue instanceof Error), 'team request below limit')
  }
  equal(invokeThrottle(teamThrottle, createRequest(trustedApp, '198.51.100.41')).nextValue?.statusCode, 429, 'team limiter groups actor and real client')
  check(!(invokeThrottle(teamThrottle, createRequest(trustedApp, '198.51.100.42')).nextValue instanceof Error), 'team limiter separates real clients')

  process.stdout.write(`Deployment network validation passed: ${checks} assertions.\n`)
} catch (error) {
  process.stderr.write(`Deployment network validation failed: ${error.message}\n`)
  process.exitCode = 1
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
}
