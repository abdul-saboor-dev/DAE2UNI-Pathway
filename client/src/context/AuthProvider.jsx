import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, loginStudent, registerStudent } from '../services/authApi.js'
import {
  AUTH_INVALID_EVENT,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../services/tokenStorage.js'
import { getApiErrorMessage } from '../utils/apiErrors.js'
import { ROLE_REFRESH_EVENT } from '../services/api.js'
import AuthContext from './auth-context.js'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    function invalidateSession() {
      clearAccessToken()
      setUser(null)
    }

    async function restoreSession() {
      const tokenAtStart = getAccessToken()
      if (!tokenAtStart) {
        if (active) setIsLoading(false)
        return
      }

      try {
        const currentUser = await getCurrentUser(controller.signal)
        if (active && getAccessToken() === tokenAtStart) setUser(currentUser)
      } catch (error) {
        if (error.name !== 'CanceledError' && active && getAccessToken() === tokenAtStart) {
          invalidateSession()
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    window.addEventListener(AUTH_INVALID_EVENT, invalidateSession)
    async function refreshCurrentUser() {
      const tokenAtStart = getAccessToken()
      if (!tokenAtStart) return
      try {
        const currentUser = await getCurrentUser(controller.signal)
        if (active && getAccessToken() === tokenAtStart) setUser(currentUser)
      } catch (error) {
        if (active && error.name !== 'CanceledError' && getAccessToken() === tokenAtStart) invalidateSession()
      }
    }
    window.addEventListener(ROLE_REFRESH_EVENT, refreshCurrentUser)
    window.addEventListener('focus', refreshCurrentUser)
    restoreSession()

    return () => {
      active = false
      controller.abort()
      window.removeEventListener(AUTH_INVALID_EVENT, invalidateSession)
      window.removeEventListener(ROLE_REFRESH_EVENT, refreshCurrentUser)
      window.removeEventListener('focus', refreshCurrentUser)
    }
  }, [])

  const login = useCallback(async (credentials) => {
    setAuthError('')
    try {
      const result = await loginStudent(credentials)
      setAccessToken(result.token)
      setUser(result.user)
      return result.user
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to sign in right now.')
      setAuthError(message)
      throw error
    }
  }, [])

  const register = useCallback(async ({ name, email, password, turnstileToken }) => {
    setAuthError('')
    try {
      await registerStudent({ name, email, password, turnstileToken })
      return true
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to create your account right now.')
      setAuthError(message)
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    clearAccessToken()
    setUser(null)
    setAuthError('')
  }, [])

  const clearAuthError = useCallback(() => setAuthError(''), [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      authError,
      login,
      register,
      logout,
      clearAuthError,
    }),
    [authError, clearAuthError, isLoading, login, logout, register, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
