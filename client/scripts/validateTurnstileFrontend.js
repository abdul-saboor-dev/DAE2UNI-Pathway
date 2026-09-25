import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const read = (path) => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8')
const widget = read('src/components/TurnstileWidget.jsx')
const page = read('src/pages/RegisterPage.jsx')
const authApi = read('src/services/authApi.js')
const provider = read('src/context/AuthProvider.jsx')
const api = read('src/services/api.js')
const login = read('src/pages/LoginPage.jsx')
let checks = 0
function check(condition, label) { assert.ok(condition, label); checks += 1 }

check(widget.includes('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'), 'official explicit-render script')
check(widget.includes('if (scriptPromise) return scriptPromise'), 'duplicate script insertion prevented')
check(widget.includes("action: 'student_register'"), 'registration action assigned')
check(widget.includes("'response-field': false"), 'automatic extra form field disabled')
check(widget.includes("'expired-callback'") && widget.includes("'error-callback'"), 'expiration and error callbacks')
check(widget.includes('turnstile.reset(widgetRef.current)'), 'widget resets after failure')
check(widget.includes('turnstile.remove(widgetRef.current)'), 'widget removed on unmount')
check(widget.includes("status === 'unavailable'") && widget.includes("status === 'loading'"), 'loading and unavailable states')
check(page.includes('disabled={isSubmitting || !turnstileToken}'), 'submission waits for token')
check(page.includes('turnstileRef.current?.reset()'), 'failed registration resets widget')
check(page.includes('name: values.name.trim()') && page.includes('email: values.email.trim().toLowerCase()'), 'name and email retained and normalized')
check(authApi.includes("api.post('/auth/register', { name, email, password, turnstileToken })"), 'explicit registration payload')
check(!login.includes('TurnstileWidget') && !provider.includes('setAccessToken(turnstileToken)'), 'login and token storage untouched')
check(api.includes('if (config.requiresAuth)'), 'existing authorization opt-in retained')
check(![widget, page, authApi, provider].some((source) => source.includes('dangerouslySetInnerHTML') || source.includes('console.log(') || source.includes('console.error(')), 'no raw HTML or sensitive logging')
check(![widget, page, authApi, provider].some((source) => /(?:localStorage|sessionStorage)\.setItem\([^)]*turnstile/i.test(source)), 'verification token not persisted')

process.stdout.write(`Turnstile frontend safeguards passed: ${checks} assertions.\n`)
