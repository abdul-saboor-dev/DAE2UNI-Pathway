import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { getCampusMapUrl } from '../src/utils/campusMap.js'
import { universityMonogram } from '../src/utils/universityMonogram.js'
import { getSafeExternalUrl } from '../src/utils/externalLinks.js'

const read = (path) => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8')
let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }
function equal(actual, expected, message) { assertions += 1; assert.equal(actual, expected, message) }

const app = read('src/App.jsx')
for (const route of ['path="universities"', 'path="programs"', 'path="login"', 'path="register"', 'path="dashboard"', 'path="profile"', 'path="admin"', 'path="setup/admin"']) {
  check(app.includes(route), `${route} remains available`)
}
check(app.includes('AdminRouteGuard') && app.includes('ProtectedRoute'), 'Route guards remain in place')

const main = read('src/layouts/MainLayout.jsx')
const admin = read('src/layouts/AdminLayout.jsx')
for (const layout of [main, admin]) {
  check(layout.includes('Skip to '), 'Layout offers a keyboard skip link')
  check(layout.includes('<details') && layout.includes('<summary'), 'Mobile navigation uses native disclosure')
  check(layout.includes('NavLink'), 'Active route comes from React Router navigation')
  check(layout.includes('Logout'), 'Account exit remains available')
}
check(admin.includes('canManageRoles(user?.role)'), 'Team navigation retains role gating')

const campus = read('src/components/CampusDirectory.jsx')
const universityCard = read('src/components/UniversityCard.jsx')
const ui = read('src/components/AdminUi.jsx')
const roleDialog = read('src/components/RoleActionDialog.jsx')
const verifyDialog = read('src/components/VerifySourceDialog.jsx')
check(campus.includes('getCampusMapUrl') && campus.includes('{mapUrl &&'), 'Map action only appears for a usable address')
check(campus.includes('target="_blank" rel="noopener noreferrer"'), 'Map link opens safely')
check(campus.includes('isMainCampus') && campus.includes('isActive'), 'Campus state is described in text')
check(universityCard.includes('universityMonogram') && universityCard.includes("data-image-state={safeImageUrl ? 'image' : 'fallback'}"), 'University media has a branded fallback')
check(universityCard.includes('getSafeExternalUrl(imageUrl)'), 'Future image input is URL checked')
check(!universityCard.includes('https://images.') && !universityCard.includes('unsplash'), 'No real image host is hard-coded')
check(ui.includes('showModal()') && ui.includes('focusAfterCloseId'), 'Confirmation dialog retains focus management')
check(roleDialog.includes('showModal()') && roleDialog.includes('focusTarget.focus()'), 'Role dialog retains focus restoration')
check(verifyDialog.includes('showModal()') && verifyDialog.includes('previous.focus()'), 'Verification dialog retains focus restoration')

equal(getCampusMapUrl({ address: '  ' }), null, 'Missing address has no Maps link')
equal(getCampusMapUrl({ address: 'Main Road #1', city: 'Lahore', province: 'Punjab' }),
  'https://www.google.com/maps/search/?api=1&query=Main%20Road%20%231%2C%20Lahore%2C%20Punjab', 'Address is encoded as a search query')
equal(universityMonogram({ name: 'Fictional Institute of Technology' }), 'FIT', 'Name-based monogram works')
equal(universityMonogram({ abbreviation: 'UIT' }), 'UIT', 'Abbreviation takes priority')
equal(getSafeExternalUrl('javascript:alert(1)'), null, 'Unsafe URL cannot become clickable')

const css = read('src/index.css')
for (const token of ['#102a43', '#f7f4ed', '#285f8f', '#c9963b', '.display-type', '.page-title', '.site-input', ':focus-visible', 'prefers-reduced-motion']) {
  check(css.includes(token), `Design token or accessibility rule: ${token}`)
}
const linear = (value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
const channels = [0, 2, 4].map((offset) => linear(Number.parseInt('285f8f'.slice(offset, offset + 2), 16) / 255))
const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
check(1.05 / (luminance + 0.05) >= 4.5, 'White text on academic blue meets WCAG AA')
check(css.includes('--academic-hover:') && css.includes('--academic-pressed:') && css.includes('--academic-disabled:'), 'Action states derive from academic blue')
check(css.includes('background: var(--color-academic)') && css.includes('outline: 3px solid var(--color-academic)'), 'Primary actions and focus use academic blue')
const sourceFiles = (directory) => readdirSync(resolve(import.meta.dirname, '..', directory), { withFileTypes: true }).flatMap((entry) => {
  const relativePath = `${directory}/${entry.name}`
  return entry.isDirectory() ? sourceFiles(relativePath) : entry.name.endsWith('.jsx') ? [read(relativePath)] : []
})
check(![css, ...sourceFiles('src')].some((source) => /#146b5a|teal-|(?:^|[^a-z])(?:forest|leaf|mint)(?:$|[^a-z])/i.test(source)), 'Old green brand utilities are absent')
const adminUi = read('src/components/AdminUi.jsx')
check(adminUi.includes("['verified', 'active', 'completed']") && adminUi.includes("safeValue === 'published'") && adminUi.includes('bg-bluewash'), 'Green badges are semantic; published uses blue')
const allVisualFiles = [main, admin, campus, universityCard, ui, roleDialog, verifyDialog,
  read('src/pages/HomePage.jsx'), read('src/pages/UniversityDetailPage.jsx'), read('src/pages/ProgramDetailPage.jsx')]
check(allVisualFiles.every((source) => !source.includes('dangerouslySetInnerHTML')), 'Visual components never render raw HTML')
check(allVisualFiles.every((source) => !source.includes('console.log') && !source.includes('console.error')), 'Visual components do not log private data')
check(!main.includes('passwordHash') && !admin.includes('passwordHash'), 'Navigation does not render credential fields')

process.stdout.write(`Validated ${assertions} frontend design safeguards.\n`)
