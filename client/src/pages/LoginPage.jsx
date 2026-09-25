import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import FormAlert from '../components/FormAlert.jsx'
import PasswordField from '../components/PasswordField.jsx'
import TextField from '../components/TextField.jsx'
import useAuth from '../context/useAuth.js'
import { getApiFieldErrors, getApiErrorMessage } from '../utils/apiErrors.js'
import { validateLogin } from '../utils/authValidation.js'
import { getRoleDestination } from '../utils/navigation.js'

function LoginPage() {
  const { login, authError, clearAuthError } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => () => clearAuthError(), [clearAuthError])

  function updateField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = validateLogin(values)
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length) return

    setIsSubmitting(true)
    try {
      const user = await login({ email: values.email.trim().toLowerCase(), password: values.password })
      navigate(getRoleDestination(location.state?.from, user.role), { replace: true })
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error))
      setFormError(getApiErrorMessage(error, 'Unable to sign in right now.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Account access"
      title="Welcome back"
      description="Sign in to continue your DAE profile and keep your university pathway in one place."
      aside={<p className="mt-8 border-l-4 border-gold bg-[var(--ui-paper)] p-4 text-sm leading-6 text-navy">Your session stays in this browser tab and is cleared when the tab session ends.</p>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <h2 className="section-title text-2xl text-navy">Sign in</h2>
          <p className="mt-1 text-sm text-ink/55">Use your DAE2UNI account email and password.</p>
        </div>
        <FormAlert message={formError || authError} />
        <TextField
          id="login-email"
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
          id="login-password"
          name="password"
          label="Password"
          value={values.password}
          onChange={updateField}
          error={fieldErrors.password}
          autoComplete="current-password"
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="action-primary w-full"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-ink/60">
          New to DAE2UNI?{' '}
          <Link className="font-bold text-academic underline decoration-academic/35 underline-offset-4 hover:text-academic" to="/register" state={location.state}>
            Create a student account
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

export default LoginPage
