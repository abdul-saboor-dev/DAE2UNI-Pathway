import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { normalizeProgram, normalizeUniversity } from '../src/services/catalogueNormalizers.js'

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

const cloudinaryMedia = (name, width = 1280, height = 720) => ({
  id: `media-${name}`,
  url: `https://res.cloudinary.com/dae2uni/image/upload/f_auto,q_auto,c_limit,w_${width}/catalogue/${name}.webp`,
  srcSet: `https://res.cloudinary.com/dae2uni/image/upload/f_auto,q_auto,c_limit,w_480/catalogue/${name}.webp 480w, https://res.cloudinary.com/dae2uni/image/upload/f_auto,q_auto,c_limit,w_960/catalogue/${name}.webp 960w`,
  width,
  height,
})

const universityFixture = {
  id: 'university-1',
  name: 'Media Fixture University',
  logo: cloudinaryMedia('university-logo', 384, 384),
  cover: cloudinaryMedia('university-cover'),
  campuses: [{ name: 'Main Campus', city: 'Lahore', image: cloudinaryMedia('main-campus', 960, 540) }],
}
const normalizedUniversity = normalizeUniversity(universityFixture)
const normalizedProgram = normalizeProgram({
  id: 'program-1',
  name: 'BS Computer Science',
  university: { id: universityFixture.id, name: universityFixture.name },
  campuses: universityFixture.campuses,
  disciplineMedia: { discipline: 'Computer Science', image: cloudinaryMedia('computer-science') },
})
const universityWithoutMedia = normalizeUniversity({ id: 'university-2', name: 'No Media University', campuses: [{ name: 'City Campus', city: 'Lahore' }] })
const programWithoutMedia = normalizeProgram({ id: 'program-2', name: 'BS Information Technology', university: { id: 'university-2', name: 'No Media University' } })

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
check(normalizedUniversity.logo?.id === 'media-university-logo' && normalizedUniversity.cover?.id === 'media-university-cover', 'University normalization retains logo and cover media references')
check(normalizedUniversity.campuses[0].image?.id === 'media-main-campus', 'Campus normalization retains its image reference')
check(normalizedUniversity.cover.srcSet.includes('f_auto,q_auto,c_limit,w_480') && normalizedUniversity.cover.width === 1280 && normalizedUniversity.cover.height === 720, 'University media retains Cloudinary transformations and dimensions')
check(normalizedProgram.disciplineMedia?.discipline === 'Computer Science' && normalizedProgram.disciplineMedia.image?.id === 'media-computer-science', 'Program normalization retains shared discipline media')
check(universityWithoutMedia.logo === null && universityWithoutMedia.cover === null && universityWithoutMedia.campuses[0].image === null && programWithoutMedia.disciplineMedia === null, 'Catalogue records without media remain valid')
const unsafeUniversity = normalizeUniversity({ id: 'university-3', name: 'Unsafe Media University', logo: { url: 'javascript:alert(1)' }, cover: { url: 'https://user:secret@example.invalid/cover.webp' }, campuses: [] })
check(unsafeUniversity.logo === null && unsafeUniversity.cover === null, 'Unsafe media URLs are rejected during normalization')
const unsafeSrcSetUniversity = normalizeUniversity({ id: 'university-4', name: 'Unsafe Source Set University', logo: { ...cloudinaryMedia('safe-logo'), srcSet: 'javascript:alert(1) 384w' }, campuses: [] })
check(unsafeSrcSetUniversity.logo?.url?.startsWith('https://') && unsafeSrcSetUniversity.logo.srcSet === undefined, 'Unsafe responsive-image candidates are discarded without losing a safe primary image')

process.stdout.write(`Validated ${checks} catalogue-media frontend safeguards.\n`)
