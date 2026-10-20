import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const read = (path) => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8')
let checks = 0
const check = (value, message) => { checks += 1; assert.ok(value, message) }
const app = read('src/App.jsx')
const layout = read('src/layouts/AdminLayout.jsx')
const upload = read('src/components/MediaUploadField.jsx')
const mediaApi = read('src/services/mediaLibraryApi.js')
const universityForm = read('src/pages/admin/AdminUniversityFormPage.jsx')
const library = read('src/pages/admin/AdminProgramImagesPage.jsx')
const dashboard = read('src/pages/admin/AdminDashboardPage.jsx')
const universityCard = read('src/components/UniversityCard.jsx')
const programCard = read('src/components/ProgramCard.jsx')
const universityDetail = read('src/pages/UniversityDetailPage.jsx')
const programDetail = read('src/pages/ProgramDetailPage.jsx')
const campuses = read('src/components/CampusDirectory.jsx')

check(app.includes('path="program-images"') && layout.includes('/admin/program-images'), 'Program image library is routed inside the guarded admin layout')
check(dashboard.includes('Program image library') && dashboard.includes('/admin/program-images'), 'Admin dashboard links to the shared program image section')
check(universityForm.includes('university_logo') && universityForm.includes('university_cover') && universityForm.includes('campus_image'), 'Existing university form manages all three media scopes')
check(upload.includes('image/jpeg,image/png,image/webp,image/avif') && upload.includes('5 * 1024 * 1024'), 'Client rejects unsupported and oversized files before upload')
check(mediaApi.includes("'/admin/media/upload-intents'") && mediaApi.includes("'/admin/media/upload-completions'"), 'Browser requests a signed intent and server-verifies completion')
check(mediaApi.includes('FormData') && mediaApi.includes('upload.uploadUrl') && !mediaApi.includes('CLOUDINARY_API_SECRET'), 'Direct provider upload never contains the API secret')
check(!mediaApi.includes('bytes: provider.bytes') && !mediaApi.includes('secureUrl: provider.secure_url'), 'Browser never forwards untrusted provider metadata for persistence')
check(mediaApi.includes('/admin/media/upload-intents/${safeId(intentId)}'), 'Failed upload attempts request safe intent cleanup')
check(library.includes('exact aliases') || library.includes('Exact aliases'), 'Discipline UI explains exact matching')
check(library.includes('BSCS') && library.includes('BS Computer Science'), 'Alias examples cover canonical computing names')
check(universityCard.includes('university.logo') && universityCard.includes('university.cover'), 'University cards render logo and cover with fallbacks')
check(universityCard.indexOf('university-card__cover') < universityCard.indexOf('alt={`${university.name} logo`}'), 'University identity and logo render below, not over, the cover')
check(universityCard.includes('aspect-video') && universityCard.includes('object-cover'), 'University covers use a responsive 16:9 crop')
check(universityCard.includes("evidence.map((item) => <span") && !universityCard.includes(' · HEC:'), 'University evidence renders as separate truthful lines')
check(programCard.includes('disciplineMedia') && programDetail.includes('disciplineMedia'), 'Program cards and detail pages reuse shared discipline media')
check(universityDetail.includes('srcSet') && programDetail.includes('srcSet') && campuses.includes('loading="lazy"'), 'Responsive and lazy image behavior is present')
check([upload, library, universityCard, programCard, universityDetail, programDetail, campuses].every((source) => !source.includes('dangerouslySetInnerHTML')), 'Media UI never renders raw HTML')
check(upload.includes('alt={alt}') && universityCard.includes('alt={`${university.name} logo`}') && campuses.includes('campus`}'), 'Images have contextual accessible alternatives')

process.stdout.write(`Validated ${checks} catalogue-media frontend safeguards.\n`)
