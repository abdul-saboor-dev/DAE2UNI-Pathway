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
const brandLogo = read('src/components/BrandLogo.jsx')
const home = read('src/pages/HomePage.jsx')
const heroArtwork = read('src/assets/dae2uni-hero-pathway.svg')
const html = read('index.html')
const entry = read('src/main.jsx')
for (const layout of [main, admin]) {
  check(layout.includes('Skip to '), 'Layout offers a keyboard skip link')
  check(layout.includes('aria-expanded={menuOpen}') && layout.includes('aria-controls='), 'Mobile navigation exposes its disclosure state')
  check(layout.includes('NavLink'), 'Active route comes from React Router navigation')
  check(layout.includes('Logout'), 'Account exit remains available')
}
check(admin.includes('canManageRoles(user?.role)'), 'Team navigation retains role gating')
check(brandLogo.includes('dae2uni-mark.png') && brandLogo.includes('alt="DAE2UNI"'), 'Navigation and shared brand locations use the supplied accessible mark')
check(main.includes('site-header--home-top') && main.includes('site-header--home-scrolled') && main.includes('site-header--home-menu'), 'Homepage header preserves distinct top, scrolled, and menu states')
check(home.includes('hero-artwork-frame') && home.includes('DAE pathway from academic profile through merit and admission to university'), 'Hero artwork is grouped and accessibly described')
check(heroArtwork.includes('viewBox="800 20 400 250"'), 'Approved pathway artwork uses a tightly framed canvas')
for (const icon of ['favicon.ico', 'favicon-48x48.png', 'favicon-32x32.png', 'favicon-16x16.png']) check(html.includes(icon), `Document references ${icon}`)
check(!html.includes('favicon.svg'), 'Retired favicon reference is removed')
check(html.includes('class="app-loading"') && html.includes('id="initial-loading-shell"') && html.includes('.app-loading #root{visibility:hidden}'), 'Critical loading shell covers prerendered content before application styles load')
check(html.includes('<noscript><style>') && html.includes('.app-loading #root{visibility:visible!important}'), 'Prerendered content remains available without JavaScript')
check(entry.includes('flushSync') && entry.includes("classList.remove('app-loading')") && entry.includes("getElementById('initial-loading-shell')?.remove()"), 'Loading shell is removed after the first committed React layout without a timer')

const campus = read('src/components/CampusDirectory.jsx')
const universityCard = read('src/components/UniversityCard.jsx')
const ui = read('src/components/AdminUi.jsx')
const roleDialog = read('src/components/RoleActionDialog.jsx')
const verifyDialog = read('src/components/VerifySourceDialog.jsx')
check(campus.includes('getCampusMapUrl') && campus.includes('{mapUrl &&'), 'Map action only appears for usable coordinates')
check(campus.includes('target="_blank" rel="noopener noreferrer"'), 'Map link opens safely')
check(campus.includes('isMainCampus') && campus.includes('isActive'), 'Campus state is described in text')
check(universityCard.includes('universityMonogram') && universityCard.includes("data-image-state={safeImageUrl ? 'image' : 'fallback'}"), 'University media has a branded fallback')
check(universityCard.includes('getSafeExternalUrl(university.cover?.url || imageUrl)'), 'Catalogue and fallback image input is URL checked')
check(!universityCard.includes('https://images.') && !universityCard.includes('unsplash'), 'No real image host is hard-coded')
check(ui.includes('showModal()') && ui.includes('focusAfterCloseId'), 'Confirmation dialog retains focus management')
check(roleDialog.includes('showModal()') && roleDialog.includes('focusTarget.focus()'), 'Role dialog retains focus restoration')
check(verifyDialog.includes('showModal()') && verifyDialog.includes('previous.focus()'), 'Verification dialog retains focus restoration')

equal(getCampusMapUrl({ address: 'Main Road #1', city: 'Lahore', province: 'Punjab' }), null, 'Address alone does not create an imprecise Maps link')
equal(getCampusMapUrl({ latitude: 31.5204, longitude: 74.3587 }),
  'https://www.google.com/maps/search/?api=1&query=31.5204%2C74.3587', 'Coordinates are encoded as a search query')
equal(universityMonogram({ name: 'Fictional Institute of Technology' }), 'FIT', 'Name-based monogram works')
equal(universityMonogram({ abbreviation: 'UIT' }), 'UIT', 'Abbreviation takes priority')
equal(getSafeExternalUrl('javascript:alert(1)'), null, 'Unsafe URL cannot become clickable')

const css = read('src/index.css')
for (const token of ['#17243b', '#21314b', '#168bc0', '#38bce4', '#f5a12e', '#f5f1e9', '--ui-surface-solid:', '.glass-surface', '.panel-surface', '.record-surface', '.interactive-surface', '.display-type', '.page-title', '.site-input', ':focus-visible', 'prefers-reduced-motion']) {
  check(css.includes(token), `Design token or accessibility rule: ${token}`)
}
const linear = (value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
const luminance = (hex) => {
  const channels = [0, 2, 4].map((offset) => linear(Number.parseInt(hex.slice(offset, offset + 2), 16) / 255))
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}
const contrast = (first, second) => (Math.max(luminance(first), luminance(second)) + 0.05) / (Math.min(luminance(first), luminance(second)) + 0.05)
check(contrast('f5f1e9', '17243b') >= 4.5, 'Ivory text on midnight background meets WCAG AA')
check(contrast('17243b', 'f5f1e9') >= 4.5, 'Midnight text on ivory background meets WCAG AA')
check(css.includes('--academic-hover:') && css.includes('--academic-pressed:') && css.includes('--academic-disabled:'), 'Action states remain explicit')
check(css.includes('grid-template-columns: minmax(0,1fr) minmax(0,1fr)') && css.includes('@keyframes pathway-float') && css.includes('.hero-artwork-frame { animation: none; }'), 'Balanced hero animation respects reduced motion')
check(css.includes('background: var(--brand-blue)') && css.includes('outline: 3px solid var(--brand-cyan)'), 'Primary actions and focus use accessible semantic tokens')
check(!css.includes('.bg-white,') && !css.includes('.rounded-xl, .rounded-2xl'), 'Legacy utility classes are not globally remapped')
check(!css.includes('.paper-surface:hover'), 'Static surfaces do not imply interactivity on hover')
check(css.includes('.interactive-surface:hover'), 'Interactive elevation requires an explicit class')
check(home.includes('journey-step') && home.includes('Verified admission criteria'), 'Homepage communicates the verified pathway sequence')
const sourceFiles = (directory) => readdirSync(resolve(import.meta.dirname, '..', directory), { withFileTypes: true }).flatMap((entry) => {
  const relativePath = `${directory}/${entry.name}`
  return entry.isDirectory() ? sourceFiles(relativePath) : entry.name.endsWith('.jsx') ? [read(relativePath)] : []
})
check(![css, ...sourceFiles('src')].some((source) => /teal-|(?:^|[^a-z])(?:forest|leaf|mint)(?:$|[^a-z])/i.test(source)), 'Unrelated green brand utilities are absent')
const adminUi = read('src/components/AdminUi.jsx')
check(adminUi.includes("['verified', 'active', 'completed']") && adminUi.includes("safeValue === 'published'") && adminUi.includes('status-badge--${tone}'), 'Status badges keep semantic text and shared styling')
const allVisualFiles = [main, admin, campus, universityCard, ui, roleDialog, verifyDialog,
  read('src/pages/HomePage.jsx'), read('src/pages/UniversityDetailPage.jsx'), read('src/pages/ProgramDetailPage.jsx')]
check(allVisualFiles.every((source) => !source.includes('dangerouslySetInnerHTML')), 'Visual components never render raw HTML')
check(allVisualFiles.every((source) => !source.includes('console.log') && !source.includes('console.error')), 'Visual components do not log private data')
check(!main.includes('passwordHash') && !admin.includes('passwordHash'), 'Navigation does not render credential fields')

process.stdout.write(`Validated ${assertions} frontend design safeguards.\n`)
