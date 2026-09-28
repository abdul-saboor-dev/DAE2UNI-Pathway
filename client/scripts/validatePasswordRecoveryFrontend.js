import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const read = (path) => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8')
const app = read('src/App.jsx')
const login = read('src/pages/LoginPage.jsx')
const forgot = read('src/pages/ForgotPasswordPage.jsx')
const reset = read('src/pages/ResetPasswordPage.jsx')
const api = read('src/services/authApi.js')
const widget = read('src/components/TurnstileWidget.jsx')
let checks = 0
const check = (condition, label) => { assert.ok(condition, label); checks += 1 }

check(app.includes('path="forgot-password"') && app.includes('path="reset-password"'), 'public recovery routes exist')
check(login.includes('to="/forgot-password"') && login.includes('passwordResetComplete'), 'login links to recovery and announces completion')
check(forgot.includes('action="password_reset_request"') && forgot.includes('disabled={state === \'sending\' || !turnstileToken}'), 'forgot form requires distinct Turnstile challenge')
check(forgot.includes('If an eligible account exists for this email') && forgot.includes('widgetRef.current?.reset()'), 'forgot result is generic and widget resets')
check(api.includes("api.post('/auth/forgot-password', { email, turnstileToken }, { timeout: 15000 })") && api.includes("api.post('/auth/reset-password', { token, password })"), 'recovery APIs use explicit payload allowlists and a delivery-aware request timeout')
check(reset.includes("new URLSearchParams(window.location.hash.slice(1))") && reset.includes('window.history.replaceState'), 'fragment token is read and immediately removed')
check(reset.includes("tokenRef.current = ''") && !reset.match(/useState\([^)]*token/), 'reset token stays only in a short-lived ref')
check(reset.includes('clearTimeout(cleanupTimerRef.current)') && reset.includes('cleanupTimerRef.current = setTimeout'), 'Strict Mode cleanup cannot erase the token during effect replay')
check(reset.includes('if (isSubmitting) return') && reset.includes('disabled={isSubmitting}'), 'duplicate reset submissions are blocked')
check(reset.includes('autoComplete="new-password"') && forgot.includes('autoComplete="email"'), 'recovery autocomplete semantics are appropriate')
check(forgot.includes('role="status"') && reset.includes('FormAlert'), 'recovery status and errors are announced')
check(widget.includes("action === 'password_reset_request'"), 'Turnstile component describes password recovery action')
check(![forgot, reset, api, widget].some((source) => /dangerouslySetInnerHTML|console\.(?:log|error)|localStorage|sessionStorage|BREVO_API_KEY|TURNSTILE_SECRET_KEY/.test(source)), 'no raw HTML, logs, storage, or server secrets')
check(!reset.includes('?token=') && !forgot.includes('?token='), 'frontend never uses query-string reset tokens')

process.stdout.write(`Password-recovery frontend safeguards passed: ${checks} assertions.\n`)
