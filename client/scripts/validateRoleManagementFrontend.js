import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { teamQueryParams } from '../src/utils/adminTeamQuery.js'
import { CONTENT_MANAGER_ROLES, ROLE_MANAGER_ROLES, canManageContent, canManageRoles } from '../src/utils/roles.js'
import { getRoleDestination } from '../src/utils/navigation.js'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks++ }
const app = read('src/App.jsx')
const guard = read('src/components/RouteGuards.jsx')
const layout = read('src/layouts/AdminLayout.jsx')
const page = read('src/pages/admin/AdminTeamPage.jsx')
const dialog = read('src/components/RoleActionDialog.jsx')
const service = read('src/services/teamApi.js')
const api = read('src/services/api.js')
const auth = read('src/context/AuthProvider.jsx')

check(CONTENT_MANAGER_ROLES.join(',') === 'owner,co_owner,admin', 'content-manager hierarchy')
check(ROLE_MANAGER_ROLES.join(',') === 'owner,co_owner', 'role-manager hierarchy')
for (const role of ['owner', 'co_owner', 'admin']) check(canManageContent(role), `${role} content access`)
check(!canManageContent('student') && !canManageRoles('admin') && canManageRoles('co_owner'), 'role boundaries')
check(getRoleDestination('/admin/administrators', 'admin') === '/unauthorized', 'Admin denied team destination')
check(getRoleDestination('/admin/administrators', 'co_owner') === '/admin/administrators', 'Co-Owner team destination')
check(getRoleDestination('//outside.example', 'owner') === '/admin', 'external destination rejected')
check(app.includes('<TeamRouteGuard />') && app.includes('path="administrators"'), 'nested guarded team route')
check(guard.includes('allowedRoles={CONTENT_MANAGER_ROLES}') && guard.includes('allowedRoles={ROLE_MANAGER_ROLES}'), 'distinct guards')
check(guard.includes('if (isLoading)') && guard.includes('if (!user)') && guard.includes('allowedRoles.includes(user.role)'), 'restored current user governs routing')
check(layout.includes('canManageRoles(user?.role)') && layout.includes('Manage administrators'), 'team navigation is role-gated')
check(service.includes("api.get('/admin/administrators'") && service.includes("api.post('/admin/administrators/promote'"), 'team list and promotion endpoints')
for (const action of ['revoke', 'grant-co-owner', 'revoke-co-owner']) check(service.includes(`/${action}`), `${action} endpoint`)
check((service.match(/requiresAuth: true/g) || []).length === 5, 'all team requests explicitly authenticated')
check(!/Authorization|localStorage|sessionStorage|console\.|dangerouslySetInnerHTML/.test(service + page + dialog), 'no token handling, logging, or HTML injection')
check(!/passwordHash|ownerMarker|roleAudit|\$set|\$push/.test(service), 'no protected payload fields or MongoDB operators')
check(service.includes('safeId(userId)') && service.includes('encodeURIComponent(value)'), 'target IDs validated and encoded')
const normalized = teamQueryParams({ page: 3, sort: '-createdAt', search: '  Example  ', role: 'owner', passwordHash: 'x' })
check(JSON.stringify(normalized) === JSON.stringify({ page: 3, pageSize: 20, search: 'Example', sort: '-createdAt' }), 'query uses allowlisted fields')
check(!('sort' in teamQueryParams({ sort: '__proto__' })) && !('search' in teamQueryParams({ search: ' '.repeat(81) })), 'invalid filters omitted')
check(page.includes("member.role === 'owner'") && page.includes('Permanent owner'), 'Owner visibly protected')
check(page.includes("member.role === 'co_owner' && user?.role === 'owner'") && page.includes("user?.role === 'owner'"), 'Co-Owner actions Owner-only')
check(page.includes('Remove admin access') && page.includes('Remove Co-Owner access') && page.includes('Make Co-Owner'), 'explicit role transitions')
check(page.includes('AbortController') && page.includes('controller.abort()') && page.includes('retry={() => setAttempt('), 'stale requests and retry')
check(page.includes('No team members found') && page.includes("setState('loading')") && page.includes('role="status"'), 'empty, loading, success states')
check(dialog.includes('<dialog') && dialog.includes('showModal()') && dialog.includes('onCancel=') && dialog.includes('focusTarget.focus()') && dialog.includes('team-page-heading'), 'accessible modal focus and cancellation')
check(dialog.includes('completedRef.current = true') && dialog.includes('!completedRef.current'), 'successful role change focuses stable heading instead of a disappearing action')
check(dialog.includes('setPassword(\'\')') && dialog.includes('setConfirmEmail(\'\')') && dialog.includes('autoComplete="current-password"'), 'password handling in active form only')
check(dialog.includes('confirmEmail.trim().toLowerCase() !== action.target.email') && dialog.includes('role="alert"'), 'typed email and accessible errors')
check(api.includes('ROLE_REFRESH_EVENT') && auth.includes('getCurrentUser(controller.signal)') && auth.includes('getAccessToken() === tokenAtStart'), 'database-backed role refresh and logout race guard')
check(!/jwt\.decode|atob\(/.test(app + guard + layout + page), 'no JWT claim authority')

process.stdout.write(`Validated ${checks} role-management frontend safeguards.\n`)
