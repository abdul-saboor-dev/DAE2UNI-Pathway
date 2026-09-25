import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

const SCRIPT_ID = 'cloudflare-turnstile-script'
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.getElementById(SCRIPT_ID) || document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_URL
    script.async = true
    script.addEventListener('load', () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable')), { once: true })
    script.addEventListener('error', () => reject(new Error('Turnstile unavailable')), { once: true })
    if (!script.isConnected) document.head.appendChild(script)
  }).catch(() => {
    document.getElementById(SCRIPT_ID)?.remove()
    scriptPromise = undefined
    throw new Error('Turnstile unavailable')
  })
  return scriptPromise
}

const TurnstileWidget = forwardRef(function TurnstileWidget({ onTokenChange }, ref) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()
  const containerRef = useRef(null)
  const widgetRef = useRef(null)
  const callbackRef = useRef(onTokenChange)
  const [status, setStatus] = useState(siteKey ? 'loading' : 'unavailable')
  const [attempt, setAttempt] = useState(0)
  callbackRef.current = onTokenChange

  useImperativeHandle(ref, () => ({
    reset() {
      callbackRef.current('')
      if (widgetRef.current !== null && window.turnstile) {
        window.turnstile.reset(widgetRef.current)
        setStatus('ready')
      }
    },
  }), [])

  useEffect(() => {
    if (!siteKey) return
    let active = true
    loadScript().then((turnstile) => {
      if (!active || !containerRef.current) return
      widgetRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: 'student_register',
        size: 'compact',
        theme: 'light',
        'response-field': false,
        callback: (token) => { if (active) { callbackRef.current(token); setStatus('verified') } },
        'expired-callback': () => {
          if (!active) return
          callbackRef.current('')
          setStatus('expired')
          if (widgetRef.current !== null) turnstile.reset(widgetRef.current)
        },
        'error-callback': () => {
          if (!active) return
          callbackRef.current('')
          setStatus('error')
          if (widgetRef.current !== null) turnstile.reset(widgetRef.current)
        },
        'timeout-callback': () => {
          if (!active) return
          callbackRef.current('')
          setStatus('expired')
          if (widgetRef.current !== null) turnstile.reset(widgetRef.current)
        },
      })
      setStatus('ready')
    }).catch(() => { if (active) { callbackRef.current(''); setStatus('unavailable') } })
    return () => {
      active = false
      if (widgetRef.current !== null && window.turnstile) window.turnstile.remove(widgetRef.current)
      widgetRef.current = null
    }
  }, [siteKey, attempt])

  return <section aria-label="Human verification" className="min-w-0 border-t border-[var(--ui-border)] pt-5">
    <h3 className="text-sm font-bold text-navy">Human verification</h3>
    <p className="mt-1 text-sm text-[var(--ui-muted)]">Complete this check before creating your student account.</p>
    {siteKey && <div ref={containerRef} className="mt-3 min-h-36 min-w-0" />}
    <p role="status" className="mt-2 text-sm text-[var(--ui-muted)]">
      {status === 'loading' && 'Loading verification…'}
      {status === 'unavailable' && (siteKey ? 'Verification is unavailable. Try again or refresh this page.' : 'Registration is unavailable until the site verification key is configured.')}
      {status === 'expired' && 'Verification expired. Please complete it again.'}
      {status === 'error' && 'Verification could not complete. Please try again.'}
      {status === 'ready' && 'Complete the verification widget to enable registration.'}
      {status === 'verified' && 'Verification complete. You can create your account.'}
    </p>
    {siteKey && (status === 'unavailable' || status === 'error') && <button type="button" className="action-secondary mt-3" onClick={() => {
      if (widgetRef.current !== null && window.turnstile) { window.turnstile.reset(widgetRef.current); setStatus('ready') }
      else { setStatus('loading'); setAttempt((value) => value + 1) }
    }}>Retry verification</button>}
  </section>
})

export default TurnstileWidget
