import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import { verifyEmailToken } from '../services/authApi.js'
import { isApiError } from '../utils/apiErrors.js'

export default function VerifyEmailPage() {
  const requestRef = useRef(null)
  const [state, setState] = useState('verifying')

  useLayoutEffect(() => {
    let active = true
    if (!requestRef.current) {
      const url = new URL(window.location.href)
      const token = new URLSearchParams(url.hash.slice(1)).get('token')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`)
      requestRef.current = token ? verifyEmailToken(token) : Promise.reject(new Error('Missing token'))
    }
    requestRef.current.then(() => { if (active) setState('success') }).catch((error) => {
      if (active) setState(isApiError(error, 400, 'EMAIL_VERIFICATION_INVALID') || error.message === 'Missing token' ? 'invalid' : 'network')
    })
    return () => { active = false }
  }, [])

  return <AuthShell eyebrow="Student account" title="Verify your email" description="Confirm your address before signing in to DAE2UNI Pathway.">
    {state === 'verifying' && <p role="status">Verifying your email…</p>}
    {state === 'success' && <div role="status" className="space-y-4"><h2 className="section-title text-2xl text-navy">Email verified</h2><p>Your student account is ready. Sign in with your password.</p><Link to="/login" className="action-primary">Go to login</Link></div>}
    {state === 'invalid' && <div role="alert" className="space-y-4"><h2 className="section-title text-2xl text-navy">Link invalid or expired</h2><p>Request a new verification message. Links expire after 30 minutes and can be used once.</p><Link to="/resend-verification" className="action-primary">Request another email</Link></div>}
    {state === 'network' && <div role="alert" className="space-y-4"><h2 className="section-title text-2xl text-navy">Could not verify right now</h2><p>Check your connection. For safety, this link will not be submitted again automatically.</p><Link to="/resend-verification" className="action-primary">Request a new link</Link></div>}
  </AuthShell>
}
