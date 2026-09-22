import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import FormAlert from '../components/FormAlert.jsx'
import PasswordField from '../components/PasswordField.jsx'
import TextField from '../components/TextField.jsx'
import useAuth from '../context/useAuth.js'
import { getApiFieldErrors, getApiErrorMessage } from '../utils/apiErrors.js'
import { validateRegistration } from '../utils/authValidation.js'
import { getSafeDestination } from '../utils/navigation.js'

const initialValues = { name: '', email: '', password: '', confirmPassword: '' }

function RegisterPage() {
  const { register, authError, clearAuthError } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
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
    const errors = validateRegistration(values)
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length) return

    setIsSubmitting(true)
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      navigate(getSafeDestination(location.state?.from), { replace: true })
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error))
      setFormError(getApiErrorMessage(error, 'Unable to create your account right now.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Begin your pathway"
      title="Create your student account"
      description="Your account is the starting point for a DAE CIT profile that you can save gradually and complete when ready."
      aside={<ul className="mt-8 space-y-3 text-sm text-ink/65"><li>✓ Student accounts only</li><li>✓ Draft-friendly onboarding</li><li>✓ DAE and Matric marks kept together</li></ul>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Register</h2>
          <p className="mt-1 text-sm text-ink/55">All fields are required. You will be signed in after registration.</p>
        </div>
        <FormAlert message={formError || authError} />
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-forest px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-forest/20 transition hover:bg-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-leaf/35 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account…' : 'Create student account'}
        </button>
        <p className="text-center text-sm text-ink/60">
          Already registered?{' '}
          <Link className="font-bold text-forest underline decoration-leaf/35 underline-offset-4 hover:text-leaf" to="/login" state={location.state}>
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

export default RegisterPage
