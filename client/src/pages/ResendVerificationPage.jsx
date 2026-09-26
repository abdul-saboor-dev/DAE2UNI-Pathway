import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import FormAlert from '../components/FormAlert.jsx'
import TextField from '../components/TextField.jsx'
import TurnstileWidget from '../components/TurnstileWidget.jsx'
import { resendVerificationEmail } from '../services/authApi.js'
import { getApiErrorMessage } from '../utils/apiErrors.js'
import { validateEmail } from '../utils/authValidation.js'

export default function ResendVerificationPage() {
  const location = useLocation()
  const [email, setEmail] = useState(typeof location.state?.email === 'string' ? location.state.email : '')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
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
      await resendVerificationEmail({ email: email.trim().toLowerCase(), turnstileToken })
      setState('sent')
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Could not request a message right now. Please try again.'))
      setState('idle')
    } finally {
      setTurnstileToken('')
      widgetRef.current?.reset()
    }
  }

  return <AuthShell eyebrow="Email verification" title="Request another verification email"
    description="If an unverified student account exists, we will send a new link. For privacy, the result is the same for all addresses.">
    {state === 'sent' ? <div role="status" className="space-y-4"><h2 className="section-title text-2xl text-navy">Check your email</h2><p>If an unverified account exists for this email, a verification message has been sent.</p><p className="text-sm text-[var(--ui-muted)]">Allow at least one minute before requesting another. Check your spam folder too.</p><Link to="/login" className="action-primary">Back to login</Link></div> :
      <form onSubmit={submit} noValidate className="space-y-5">
        <h2 className="section-title text-2xl text-navy">Resend link</h2>
        <FormAlert message={error} />
        <TextField id="resend-email" name="email" label="Email address" type="email" value={email}
          onChange={(event) => { setEmail(event.target.value); setFieldError(''); setError('') }} error={fieldError}
          autoComplete="email" maxLength={254} required />
        <TurnstileWidget ref={widgetRef} action="email_verification_resend" onTokenChange={setTurnstileToken} />
        <button type="submit" disabled={state === 'sending' || !turnstileToken} className="action-primary w-full">{state === 'sending' ? 'Requesting…' : 'Send verification email'}</button>
      </form>}
  </AuthShell>
}
