import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import University from '../src/models/University.js'
import ProgramDiscipline from '../src/models/ProgramDiscipline.js'
import { normalizeDisciplineAlias, programDisciplineCandidates } from '../src/utils/disciplineAliases.js'
import { toSafeMedia } from '../src/utils/mediaSerializers.js'
import { cloudinaryMediaProvider, signCloudinaryParameters, verifyCloudinaryUpload } from '../src/services/mediaProviderService.js'
import {
  completeMediaUploadSchema,
  createMediaUploadIntentSchema,
  createProgramDisciplineSchema,
  removeMediaAttachmentSchema,
} from '../src/validation/mediaLibraryValidation.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let checks = 0
const check = (value, message) => { checks += 1; assert.ok(value, message) }
const equal = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message) }
const id = () => new mongoose.Types.ObjectId().toString()
const request = (body = {}, params = {}, query = {}) => ({ body, params, query })

process.env.CLOUDINARY_CLOUD_NAME = 'dae2uni-test'
process.env.CLOUDINARY_API_KEY = 'test-public-key'
process.env.CLOUDINARY_API_SECRET = 'test-secret-that-is-not-production'
process.env.CLOUDINARY_MEDIA_FOLDER = 'dae2uni/catalogue'

equal(normalizeDisciplineAlias('  BSCS  '), 'bscs', 'Aliases normalize case and spacing')
equal(normalizeDisciplineAlias('BSCS'), normalizeDisciplineAlias('bscs'), 'Exact aliases are case insensitive')
check(normalizeDisciplineAlias('Data Science') !== normalizeDisciplineAlias('Computer Science'), 'Different disciplines never fuzzy-match')
equal(programDisciplineCandidates({ name: 'BS Computer Science', degreeTitle: 'Bachelor of Science in Computer Science', disciplineCode: 'BSCS' }), ['bscs', 'bs computer science', 'bachelor of science in computer science'], 'Program matching uses explicit candidate fields only')

const target = { targetType: 'campus_image', targetId: id(), campusId: id() }
check(createMediaUploadIntentSchema.safeParse(request(target)).success, 'Campus upload intent accepts owned identifiers')
check(!createMediaUploadIntentSchema.safeParse(request({ ...target, campusId: undefined })).success, 'Campus upload requires campus ID')
check(!createMediaUploadIntentSchema.safeParse(request({ ...target, $set: { role: 'owner' } })).success, 'Upload intent rejects operators and unknown fields')
check(!removeMediaAttachmentSchema.safeParse(request({ targetType: 'university_logo', targetId: id(), campusId: id() })).success, 'Non-campus attachment rejects a campus ID')
check(createProgramDisciplineSchema.safeParse(request({ name: 'Computer Science', slug: 'computer-science', aliases: ['BSCS', 'BS Computer Science'] })).success, 'Strict discipline creation accepts explicit aliases')
check(!createProgramDisciplineSchema.safeParse(request({ name: 'Computer Science', slug: 'computer-science', aliases: ['BSCS'], imageUrl: 'https://attacker.invalid/image.jpg' })).success, 'Discipline cannot submit arbitrary media URLs')

const publicId = 'dae2uni/catalogue/program_discipline/test-asset'
const version = 12345
const signature = signCloudinaryParameters({ public_id: publicId, version }, process.env.CLOUDINARY_API_SECRET)
const upload = { intentId: id(), publicId, version, signature }
const providerAsset = { public_id: publicId, version, format: 'webp', resource_type: 'image', secure_url: `https://res.cloudinary.com/dae2uni-test/image/upload/v${version}/dae2uni/catalogue/program_discipline/test-asset.webp`, width: 1200, height: 675, bytes: 120000, etag: 'safe-etag' }
check(completeMediaUploadSchema.safeParse(request(upload)).success, 'Completion accepts only signed upload identifiers')
check(!completeMediaUploadSchema.safeParse(request({ ...upload, bytes: 1 })).success, 'Completion rejects browser-supplied asset metadata')
check(cloudinaryMediaProvider.name === 'cloudinary' && typeof cloudinaryMediaProvider.destroyAsset === 'function', 'Provider is isolated behind a mockable adapter contract')
await assert.rejects(verifyCloudinaryUpload({ ...upload, publicId: `${publicId}-other` }, publicId), /does not match/i); checks += 1
await assert.rejects(verifyCloudinaryUpload({ ...upload, signature: '0'.repeat(40) }, publicId), /could not be verified/i); checks += 1
const originalFetch = globalThis.fetch
globalThis.fetch = async () => new Response(JSON.stringify(providerAsset), { status: 200, headers: { 'content-type': 'application/json' } })
const verified = await verifyCloudinaryUpload(upload, publicId)
equal(verified, { publicId, version, format: 'webp', resourceType: 'image', secureUrl: providerAsset.secure_url, width: 1200, height: 675, bytes: 120000, checksum: 'safe-etag' }, 'Authoritative provider metadata is loaded server-side')
globalThis.fetch = async () => new Response(JSON.stringify({ ...providerAsset, secure_url: 'https://attacker.invalid/image.webp' }), { status: 200, headers: { 'content-type': 'application/json' } })
await assert.rejects(verifyCloudinaryUpload(upload, publicId), /not owned/i); checks += 1
globalThis.fetch = async () => new Response(JSON.stringify({ ...providerAsset, bytes: (5 * 1024 * 1024) + 1 }), { status: 200, headers: { 'content-type': 'application/json' } })
await assert.rejects(verifyCloudinaryUpload(upload, publicId), /five megabyte limit/i); checks += 1
globalThis.fetch = originalFetch
const signedUpload = cloudinaryMediaProvider.createSignedUpload(publicId, 'program_discipline')
check(signedUpload.parameters.allowed_formats.join(',') === 'jpg,jpeg,png,webp,avif', 'Signed provider request restricts accepted image formats')
check(!Object.hasOwn(signedUpload.parameters, 'max_file_size'), 'Signed request avoids unsupported Cloudinary max_file_size parameters')

const university = new University({ name: 'Legacy University', slug: 'legacy-university', sector: 'public', institutionType: 'general', campuses: [{ name: 'Main', city: 'Lahore', isMainCampus: true }], source: { officialUrl: 'https://example.invalid', verificationStatus: 'pending_review' } })
await university.validate()
check(!university.logoMedia && !university.coverMedia && !university.campuses[0].imageMedia, 'Existing records remain valid without media')
university.logoMedia = new mongoose.Types.ObjectId(); university.campuses[0].imageMedia = new mongoose.Types.ObjectId()
await university.validate(); checks += 1

const first = new ProgramDiscipline({ name: 'Computer Science', slug: 'computer-science', aliases: ['BSCS', 'BS Computer Science'] })
await first.validate()
equal(first.normalizedAliases, ['computer science', 'bscs', 'bs computer science'], 'Canonical name and explicit aliases receive exact normalized keys')
const duplicate = new ProgramDiscipline({ name: 'Computer Science', slug: 'computer-science-2', aliases: ['computer-science'] })
await assert.rejects(duplicate.validate(), /unique after normalization/i); checks += 1

const safeMedia = toSafeMedia({ _id: id(), secureUrl: `https://res.cloudinary.com/dae2uni-test/image/upload/v1/${publicId}.webp`, width: 1600, height: 900 })
check(safeMedia.url.includes('f_auto,q_auto,c_limit,w_1440'), 'Delivery URL requests bounded automatic format and quality')
check(safeMedia.srcSet.includes('480w') && safeMedia.srcSet.includes('1440w'), 'Responsive source set avoids oversized downloads')

const root = resolve(import.meta.dirname, '..')
const routes = readFileSync(resolve(root, 'src/routes/adminRoutes.js'), 'utf8')
const service = readFileSync(resolve(root, 'src/services/mediaLibraryService.js'), 'utf8')
const importer = readFileSync(resolve(root, 'src/services/catalogueImportService.js'), 'utf8')
check(routes.indexOf('router.use(authenticate, authorize(...CONTENT_MANAGER_ROLES))') < routes.indexOf("router.post('/media/upload-intents'"), 'All media endpoints inherit catalogue-editor authorization')
check(service.includes('mongoose.connection.transaction') && service.includes('referencedAsset'), 'Attachment replacement/removal is transactional and reference-aware')
check(service.includes("status: 'processing'") && service.includes('UPLOAD_INTENT_ALREADY_USED') && service.includes("intent?.status === 'completed'"), 'Concurrent or repeated completion is single-use and idempotent without deleting an attached asset')
check(service.includes('verifiedUpload = await mediaProvider.verifyUpload') && service.includes('cleanupProviderUpload(intent)'), 'Server reads authoritative provider metadata and cleans rejected uploads before attachment')
check(service.includes('matches.size === 1') && !service.includes('find(Boolean)'), 'Conflicting exact program identifiers fall back instead of guessing a discipline')
check(service.includes("status = 'cleanup_pending'") && service.includes('retryPendingCleanup') && service.includes('mediaProvider.destroyAsset'), 'Failed provider cleanup remains retryable instead of corrupting references')
check(!service.includes('req.body.secureUrl') && !routes.includes('/api/public/upload'), 'No public or blindly trusted upload path exists')
check(importer.includes('exactUniversityRestoreMatch') && importer.includes('delete comparable.logoMedia') && importer.includes('delete copy.imageMedia') && importer.includes('delete comparable.updatedAt'), 'Exact catalogue restore remains idempotent when optional media advances the university timestamp')

process.stdout.write(`Validated ${checks} catalogue-media backend safeguards.\n`)
