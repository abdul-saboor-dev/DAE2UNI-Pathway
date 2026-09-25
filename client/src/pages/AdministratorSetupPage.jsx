import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import FormAlert from '../components/FormAlert.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import PasswordField from '../components/PasswordField.jsx'
import TextField from '../components/TextField.jsx'
import useAuth from '../context/useAuth.js'
import { createFirstOwner, getOwnerSetupStatus } from '../services/setupApi.js'
import { getApiFieldErrors, getApiErrorMessage, isApiError } from '../utils/apiErrors.js'
import { validateRegistration } from '../utils/authValidation.js'

const emptyValues = { name: '', email: '', password: '', confirmPassword: '', setupSecret: '' }

function AdministratorSetupPage() {
  const { user, isLoading: isRestoringSession } = useAuth()
  const [state, setState] = useState('loading')
  const [values, setValues] = useState(emptyValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  useEffect(() => {
    if (user?.role === 'student') return undefined
    const controller = new AbortController()
    getOwnerSetupStatus(controller.signal)
      .then((required) => setState(required ? 'required' : 'completed'))
      .catch((error) => { if (error.name !== 'CanceledError') setState('error') })
    return () => controller.abort()
  }, [attempt, user?.role])

  function updateField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (isSubmitting) return
    const errors = validateRegistration(values)
    if (!values.setupSecret) errors.setupSecret = 'Setup secret is required.'
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length) return
    setIsSubmitting(true)
    try {
      await createFirstOwner({
        name: values.name.trim(), email: values.email.trim().toLowerCase(),
        password: values.password, passwordConfirmation: values.confirmPassword,
        setupSecret: values.setupSecret,
      })
      setValues(emptyValues)
      setState('success')
    } catch (error) {
      if (isApiError(error, 409, 'SETUP_COMPLETED')) {
        setValues(emptyValues)
        setState('completed')
      } else {
        const apiErrors = getApiFieldErrors(error)
        setFieldErrors({ ...apiErrors, confirmPassword: apiErrors.passwordConfirmation })
        setFormError(isApiError(error, 503, 'SETUP_NOT_CONFIGURED')
          ? 'The server setup secret is not configured. Ask the project owner to configure the backend environment.'
          : getApiErrorMessage(error, 'Setup could not be completed. Please try again.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isRestoringSession) return <LoadingScreen label="Restoring your session…" />
  if (user?.role === 'student') return <Navigate to="/unauthorized" replace />

  return <AuthShell eyebrow="Owner setup" title="Create platform owner"
    description="This one-time account permanently controls administrator roles. It cannot be removed, demoted, suspended, or replaced through the website."
    aside={<p className="mt-6 border-l-4 border-gold bg-[var(--ui-paper)] p-4 text-sm leading-6 text-navy">Use a separate, strong deployment setup secret. It is not your account password. Complete setup over HTTPS when deployed.</p>}>
    {state === 'loading' && <p role="status">Checking owner setup…</p>}
    {state === 'error' && <div role="alert"><p>Setup status could not be loaded.</p><button type="button" onClick={retry} className="action-primary mt-3">Retry</button></div>}
    {state === 'completed' && <div role="status"><h2 className="text-2xl font-bold">Owner setup has already been completed.</h2><p className="mt-3 text-ink/70">Sign in with the existing Owner account.</p><Link to="/login" className="action-primary mt-5">Go to login</Link></div>}
    {state === 'success' && <div role="status"><h2 className="text-2xl font-bold">Owner account created</h2><p className="mt-3 text-ink/70">Setup is now permanently closed. Sign in normally to manage content and administrator roles.</p><Link to="/login" className="action-primary mt-5">Go to login</Link></div>}
    {state === 'required' && <form onSubmit={submit} noValidate className="space-y-5">
      <h2 className="text-2xl font-bold">Set Owner credentials</h2>
      <FormAlert message={formError} />
      <TextField id="setup-name" name="name" label="Full name" value={values.name} onChange={updateField} error={fieldErrors.name} autoComplete="name" maxLength={120} required />
      <TextField id="setup-email" name="email" label="Email address" type="email" value={values.email} onChange={updateField} error={fieldErrors.email} autoComplete="email" maxLength={254} required />
      <PasswordField id="setup-password" name="password" label="Password" description="Use 8–72 characters and at most 72 UTF-8 bytes, including lowercase, uppercase, and a number." value={values.password} onChange={updateField} error={fieldErrors.password} autoComplete="new-password" minLength={8} maxLength={72} required />
      <PasswordField id="setup-confirm-password" name="confirmPassword" label="Confirm password" value={values.confirmPassword} onChange={updateField} error={fieldErrors.confirmPassword} autoComplete="new-password" maxLength={72} required />
      <PasswordField id="setup-secret" name="setupSecret" label="Deployment setup secret" description="Enter the separate secret configured on the backend. It is used only for this initial setup." value={values.setupSecret} onChange={updateField} error={fieldErrors.setupSecret} autoComplete="off" required />
      <button type="submit" disabled={isSubmitting} className="action-primary w-full">{isSubmitting ? 'Creating Owner…' : 'Create platform owner'}</button>
    </form>}
  </AuthShell>
}

export default AdministratorSetupPage
