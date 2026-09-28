import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import FormAlert from '../components/FormAlert.jsx'
import TextField from '../components/TextField.jsx'
import TurnstileWidget from '../components/TurnstileWidget.jsx'
import { requestPasswordReset } from '../services/authApi.js'
import { getApiErrorMessage } from '../utils/apiErrors.js'
import { validateEmail } from '../utils/authValidation.js'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState('idle')
  const widgetRef = useRef(null)

  async function submit(event) {
    event.preventDefault()
    if (state === 'sending') return
    const validation = validateEmail(email)
    setFieldError(validation.email || '')
    if (validation.email || !turnstileToken) return
    setState('sending')
    setError('')
    try {
      await requestPasswordReset({ email: email.trim().toLowerCase(), turnstileToken })
      setState('sent')
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Could not request a password reset right now. Please try again.'))
      setState('idle')
    } finally {
      setTurnstileToken('')
      widgetRef.current?.reset()
    }
  }

  return <AuthShell eyebrow="Account recovery" title="Reset your password"
    description="Request a short-lived reset link. For privacy, the response is the same whether an eligible account exists or not.">
    {state === 'sent' ? <div role="status" className="space-y-4">
      <h2 className="section-title text-2xl text-navy">Check your email</h2>
      <p>If an eligible account exists for this email, a reset message has been sent.</p>
      <p className="text-sm text-[var(--ui-muted)]">The link expires in 30 minutes and can be used once. Check your spam folder too.</p>
      <Link to="/login" className="action-primary">Back to login</Link>
    </div> : <form onSubmit={submit} noValidate className="space-y-5">
      <h2 className="section-title text-2xl text-navy">Request reset link</h2>
      <FormAlert message={error} />
      <TextField id="recovery-email" name="email" label="Email address" type="email" value={email}
        onChange={(event) => { setEmail(event.target.value); setFieldError(''); setError('') }} error={fieldError}
        autoComplete="email" maxLength={254} required />
      <TurnstileWidget ref={widgetRef} action="password_reset_request" onTokenChange={setTurnstileToken} />
      <button type="submit" disabled={state === 'sending' || !turnstileToken} className="action-primary w-full">
        {state === 'sending' ? 'Requesting…' : 'Send reset link'}
      </button>
      <p className="text-center text-sm"><Link className="font-bold text-academic underline" to="/login">Return to login</Link></p>
    </form>}
  </AuthShell>
}
