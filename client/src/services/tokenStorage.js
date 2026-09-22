export const AUTH_INVALID_EVENT = 'dae2uni:authentication-invalid'

const ACCESS_TOKEN_KEY = 'dae2uni.accessToken'

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}
