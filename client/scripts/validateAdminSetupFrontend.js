import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const app = read('src/App.jsx')
const page = read('src/pages/AdministratorSetupPage.jsx')
const api = read('src/services/setupApi.js')
const navigation = read('src/layouts/MainLayout.jsx')
let checks = 0
function check(condition, label) { assert.ok(condition, label); checks++ }

check(app.includes('path="setup/admin"') && app.includes('<AdministratorSetupPage />'), 'public setup route')
check(!navigation.includes('to="/setup/admin"'), 'setup excluded from primary navigation')
check(api.includes("api.get('/setup/status'") && api.includes("api.post('/setup/admin'"), 'exact public setup endpoints')
check(!api.includes('requiresAuth') && !api.includes('Authorization'), 'setup requests do not attach a stored token')
check(page.includes("user?.role === 'student'") && page.includes('to="/unauthorized"'), 'signed-in student redirected')
check(page.includes('isRestoringSession') && page.includes('getOwnerSetupStatus(controller.signal)'), 'session and setup status loading')
check(page.includes('Create platform owner') && page.includes('Owner account created'), 'Owner identity is explicit')
check(page.includes('controller.abort()') && page.includes('Retry'), 'status cancellation and retry')
for (const field of ['name', 'email', 'password', 'confirmPassword', 'setupSecret']) {
  check(page.includes(`name="${field}"`), `${field} form field`)
}
check(page.includes('validateRegistration(values)'), 'registration password policy reused')
check(page.includes('setValues(emptyValues)') && page.includes("setState('success')"), 'sensitive inputs cleared after success')
check(page.includes('SETUP_NOT_CONFIGURED') && page.includes('SETUP_COMPLETED'), 'configuration and completed states')
check(page.includes('FormAlert') && page.includes('fieldErrors'), 'accessible field and form errors')
check(!/localStorage|sessionStorage|document\.cookie|console\.|dangerouslySetInnerHTML/.test(page + api), 'no browser persistence, logging, or HTML injection')
check(!/\$set|passwordHash|userId|role:/.test(api), 'setup payload excludes protected fields')

process.stdout.write(`Validated ${checks} first-Owner frontend safeguards.\n`)
