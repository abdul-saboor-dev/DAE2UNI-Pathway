import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import FormAlert from '../components/FormAlert.jsx'
import PasswordField from '../components/PasswordField.jsx'
import TextField from '../components/TextField.jsx'
import TurnstileWidget from '../components/TurnstileWidget.jsx'
import useAuth from '../context/useAuth.js'
import { getApiFieldErrors, getApiErrorMessage } from '../utils/apiErrors.js'
import { validateRegistration } from '../utils/authValidation.js'

const initialValues = { name: '', email: '', password: '', confirmPassword: '' }

function RegisterPage() {
  const { register, authError, clearAuthError } = useAuth()
  const location = useLocation()
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [values, setValues] = useState(initialValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef(null)

  useEffect(() => () => clearAuthError(), [clearAuthError])

  function updateField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = validateRegistration(values)
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length) return
    if (!turnstileToken) return

    setIsSubmitting(true)
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        turnstileToken,
      })
      setTurnstileToken('')
      setRegisteredEmail(values.email.trim().toLowerCase())
      setValues((current) => ({ ...current, password: '', confirmPassword: '' }))
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error))
      setFormError(getApiErrorMessage(error, 'Unable to create your account right now.'))
      turnstileRef.current?.reset()
      setTurnstileToken('')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (registeredEmail) return <AuthShell eyebrow="Email verification" title="Check your email"
    description="Your student account has been created, but you must verify your email before signing in.">
    <div role="status" className="space-y-4">
      <p className="text-sm leading-7">We sent a verification link to <strong className="break-all">{registeredEmail}</strong>. The link expires in 30 minutes.</p>
      <p className="text-sm text-[var(--ui-muted)]">Check your inbox and spam folder. If delivery fails or the link expires, request another message.</p>
      <div className="flex flex-wrap gap-3"><Link className="action-primary" to="/login">Go to login</Link><Link className="action-secondary" to="/resend-verification" state={{ email: registeredEmail }}>Resend verification</Link></div>
    </div>
  </AuthShell>

  return (
    <AuthShell
      eyebrow="Begin your pathway"
      title="Create your student account"
      description="Your account is the starting point for a DAE CIT profile that you can save gradually and complete when ready."
      aside={<ul className="mt-8 space-y-3 border-l-4 border-gold pl-5 text-sm text-[var(--ui-muted)]"><li>Student accounts only</li><li>Draft-friendly onboarding</li><li>DAE and Matric marks kept together</li></ul>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <h2 className="section-title text-2xl text-navy">Register</h2>
          <p className="mt-1 text-sm text-ink/55">All fields are required. You will verify your email before signing in.</p>
        </div>
        <FormAlert message={formError || authError} />
        {formError && <p className="text-sm"><Link className="font-bold text-academic underline" to="/resend-verification" state={{ email: values.email.trim().toLowerCase() }}>Already created an account? Request a new verification email.</Link></p>}
        <TextField
          id="register-name"
          name="name"
          label="Full name"
          type="text"
          value={values.name}
          onChange={updateField}
          error={fieldErrors.name}
          autoComplete="name"
          minLength={2}
          maxLength={120}
          required
        />
        <TextField
          id="register-email"
          name="email"
          label="Email address"
          type="email"
          value={values.email}
          onChange={updateField}
          error={fieldErrors.email}
          autoComplete="email"
          maxLength={254}
          required
        />
        <PasswordField
          id="register-password"
          name="password"
          label="Password"
          description="Use 8–72 characters with a lowercase letter, uppercase letter, and number."
          value={values.password}
          onChange={updateField}
          error={fieldErrors.password}
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
        />
        <PasswordField
          id="register-confirm-password"
          name="confirmPassword"
          label="Confirm password"
          value={values.confirmPassword}
          onChange={updateField}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
          maxLength={72}
          required
        />
        <TurnstileWidget ref={turnstileRef} onTokenChange={setTurnstileToken} />
        <button
          type="submit"
          disabled={isSubmitting || !turnstileToken}
          className="action-primary w-full"
        >
          {isSubmitting ? 'Creating account…' : 'Create student account'}
        </button>
        <p className="text-center text-sm text-ink/60">
          Already registered?{' '}
          <Link className="font-bold text-academic underline decoration-academic/35 underline-offset-4 hover:text-academic" to="/login" state={location.state}>
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

export default RegisterPage
