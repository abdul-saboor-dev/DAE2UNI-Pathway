import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import FormAlert from '../components/FormAlert.jsx'
import PasswordField from '../components/PasswordField.jsx'
import { resetPassword } from '../services/authApi.js'
import { getApiFieldErrors, getApiErrorMessage } from '../utils/apiErrors.js'
import { validateNewPassword } from '../utils/authValidation.js'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const tokenRef = useRef()
  const cleanupTimerRef = useRef()
  if (tokenRef.current === undefined) {
    tokenRef.current = new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
  }
  const [values, setValues] = useState({ password: '', confirmPassword: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useLayoutEffect(() => {
    clearTimeout(cleanupTimerRef.current)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
    setIsReady(true)
    return () => {
      // React development Strict Mode performs a setup/cleanup/setup cycle.
      // Deferring cleanup lets the second setup cancel it while still clearing
      // the sensitive value after a real unmount.
      cleanupTimerRef.current = setTimeout(() => { tokenRef.current = '' }, 0)
    }
  }, [])

  function updateField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (isSubmitting) return
    const errors = validateNewPassword(values)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    if (!tokenRef.current) {
      setError('This password reset link is invalid or has expired. Request a new link.')
      return
    }
    setIsSubmitting(true)
    try {
      await resetPassword({ token: tokenRef.current, password: values.password })
      tokenRef.current = ''
      setValues({ password: '', confirmPassword: '' })
      navigate('/login', { replace: true, state: { passwordResetComplete: true } })
    } catch (failure) {
      setFieldErrors(getApiFieldErrors(failure))
      setError(getApiErrorMessage(failure, 'This password reset link is invalid or has expired. Request a new link.'))
      tokenRef.current = ''
      setValues({ password: '', confirmPassword: '' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return <AuthShell eyebrow="Account recovery" title="Choose a new password"
    description="Use a strong password you do not use for another service.">
    {!isReady ? <p role="status">Preparing password reset…</p> : <form onSubmit={submit} noValidate className="space-y-5">
      <h2 className="section-title text-2xl text-navy">New password</h2>
      <FormAlert message={error} />
      <PasswordField id="new-password" name="password" label="New password" value={values.password}
        onChange={updateField} error={fieldErrors.password} autoComplete="new-password" required />
      <PasswordField id="confirm-new-password" name="confirmPassword" label="Confirm new password" value={values.confirmPassword}
        onChange={updateField} error={fieldErrors.confirmPassword} autoComplete="new-password" required />
      <p className="text-sm text-[var(--ui-muted)]">Use 8–72 characters with uppercase, lowercase, and a number. The UTF-8 limit is 72 bytes.</p>
      <button type="submit" disabled={isSubmitting} className="action-primary w-full">{isSubmitting ? 'Resetting…' : 'Reset password'}</button>
      <p className="text-center text-sm"><Link className="font-bold text-academic underline" to="/forgot-password">Request a new link</Link></p>
    </form>}
  </AuthShell>
}
