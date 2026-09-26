import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const read = (path) => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8')
const app = read('src/App.jsx')
const provider = read('src/context/AuthProvider.jsx')
const registration = read('src/pages/RegisterPage.jsx')
const login = read('src/pages/LoginPage.jsx')
const verification = read('src/pages/VerifyEmailPage.jsx')
const resend = read('src/pages/ResendVerificationPage.jsx')
const widget = read('src/components/TurnstileWidget.jsx')
const api = read('src/services/authApi.js')
let checks = 0
const check = (condition, label) => { assert.ok(condition, label); checks += 1 }

check(app.includes('path="verify-email"') && app.includes('path="resend-verification"'), 'verification and resend routes exist')
check(!provider.match(/registerStudent\([\s\S]*?loginStudent\(/), 'registration does not automatically log in')
check(registration.includes('Check your email') && registration.includes('setRegisteredEmail('), 'registration has check-email state')
check(registration.includes("password: '', confirmPassword: ''"), 'password fields clear after registration')
check(registration.includes('TurnstileWidget') && registration.includes('turnstileToken'), 'registration retains Turnstile')
check(login.includes('EMAIL_VERIFICATION_REQUIRED') && login.includes('/resend-verification'), 'login handles verification requirement')
check(widget.includes("action = 'student_register'") && resend.includes('action="email_verification_resend"'), 'resend uses distinct Turnstile action')
check(resend.includes('disabled={state === \'sending\' || !turnstileToken}') && resend.includes('widgetRef.current?.reset()'), 'resend waits for challenge and resets widget')
check(resend.includes('If an unverified account exists for this email'), 'resend confirmation stays generic')
check(api.includes("api.post('/auth/verify-email', { token })") && api.includes("api.post('/auth/resend-verification', { email, turnstileToken })"), 'public API requests use explicit payloads')
check(verification.includes("new URLSearchParams(url.hash.slice(1)).get('token')") && verification.includes('window.history.replaceState'), 'fragment token read once and removed from visible URL')
check(verification.includes('requestRef.current') && verification.includes('if (!requestRef.current)'), 'verification submits once across rerenders')
check(verification.includes("state === 'verifying'") && verification.includes("state === 'success'") && verification.includes("state === 'invalid'") && verification.includes("state === 'network'"), 'all verification states rendered')
check(verification.includes('role="status"') && verification.includes('role="alert"') && resend.includes('role="status"'), 'status and errors announced')
check(![registration, login, verification, resend, widget, api].some((source) => /dangerouslySetInnerHTML|console\.(?:log|error)|localStorage|sessionStorage\.setItem/.test(source)), 'no raw HTML, logs, or browser token storage')
check(![registration, login, verification, resend, widget, api].some((source) => /BREVO_API_KEY|EMAIL_FROM_ADDRESS|xkeysib-/i.test(source)), 'no Brevo secret in client source')

process.stdout.write(`Email-verification frontend safeguards passed: ${checks} assertions.\n`)
