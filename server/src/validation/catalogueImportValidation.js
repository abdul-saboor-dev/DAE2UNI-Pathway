import { z } from 'zod'
import { CHARTER_AUTHORITIES, HEC_RECOGNITION_STATUSES, PROVINCES_AND_TERRITORIES } from '../utils/geography.js'
import { verificationStatuses } from '../models/schemas/schemaOptions.js'
import { emptyObjectSchema } from './commonValidation.js'

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120)
const text = (max) => z.string().trim().min(1).max(max)
const objectId = z.string().regex(/^[a-f\d]{24}$/i)
const timestamp = z.string().datetime({ offset: true })
const url = z.string().trim().max(2048).refine((value) => {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
  } catch { return false }
}, 'Use an HTTP or HTTPS URL without embedded credentials.')

const campus = z.object({
  key: slug,
  id: objectId.optional(),
  name: text(160), city: text(100),
  province: z.enum(PROVINCES_AND_TERRITORIES),
  district: text(100).optional(), address: text(300).optional(),
  isMainCampus: z.boolean().default(false), isActive: z.boolean().default(true),
}).strict()

const program = z.object({
  slug, name: text(200), degreeTitle: text(160),
  credentialType: z.enum(['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other']),
  department: text(160).optional(), disciplineCode: text(40).optional(),
  duration: z.object({ years: z.number().min(1).max(6), semesters: z.number().int().min(2).max(12).optional() }).strict(),
  studyMode: z.enum(['morning', 'evening', 'weekend', 'multiple']).default('morning'),
  campusKeys: z.array(slug).max(30).default([]),
  source: z.object({ officialUrl: url }).strict(),
}).strict()

export const importUniversitySchema = z.object({
  slug, name: text(200), abbreviation: text(30).optional(),
  sector: z.enum(['public', 'private']),
  institutionType: z.enum(['general', 'engineering', 'technology', 'specialized']).default('general'),
  provinceOrTerritory: z.enum(PROVINCES_AND_TERRITORIES),
  charterAuthority: z.enum(CHARTER_AUTHORITIES.filter((value) => value !== 'unknown')),
  hecProfileUrl: url.optional(),
  campuses: z.array(campus).min(1).max(30),
  programs: z.array(program).max(100).default([]),
  source: z.object({ officialUrl: url }).strict(),
}).strict().superRefine((value, context) => {
  if (value.charterAuthority === 'provincial' && !value.campuses.some((item) => item.province === 'Punjab')) {
    context.addIssue({ code: 'custom', path: ['campuses'], message: 'A provincially chartered university needs a Punjab campus for this catalogue.' })
  }
  const campusKeys = new Set()
  const campusIds = new Set()
  for (const [index, item] of value.campuses.entries()) {
    if (campusKeys.has(item.key)) context.addIssue({ code: 'custom', path: ['campuses', index, 'key'], message: 'Campus keys must be unique within a university.' })
    campusKeys.add(item.key)
    if (item.id && campusIds.has(item.id.toLowerCase())) context.addIssue({ code: 'custom', path: ['campuses', index, 'id'], message: 'Campus IDs must be unique.' })
    if (item.id) campusIds.add(item.id.toLowerCase())
  }
  const programSlugs = new Set()
  for (const [index, item] of value.programs.entries()) {
    if (programSlugs.has(item.slug)) context.addIssue({ code: 'custom', path: ['programs', index, 'slug'], message: 'Program slugs must be unique within a university.' })
    programSlugs.add(item.slug)
    if (new Set(item.campusKeys).size !== item.campusKeys.length) context.addIssue({ code: 'custom', path: ['programs', index, 'campusKeys'], message: 'Campus keys must be unique.' })
    for (const key of item.campusKeys) if (!campusKeys.has(key)) context.addIssue({ code: 'custom', path: ['programs', index, 'campusKeys'], message: `Campus key ${key} does not belong to this university.` })
  }
})

const restoreSource = z.object({
  officialUrl: url,
  verificationStatus: z.enum(verificationStatuses),
  lastVerifiedAt: timestamp.optional(),
  verificationRecord: objectId.optional(),
}).strict().superRefine((value, context) => {
  if (value.verificationStatus === 'verified' && (!value.lastVerifiedAt || !value.verificationRecord)) {
    context.addIssue({ code: 'custom', message: 'Verified restored sources require their original verification timestamp and record.' })
  }
  if (value.verificationStatus !== 'verified' && (value.lastVerifiedAt || value.verificationRecord)) {
    context.addIssue({ code: 'custom', message: 'Only verified restored sources may reference verification history.' })
  }
})

const restoreCampus = z.object({
  id: objectId,
  importKey: slug.optional(),
  name: text(160), city: text(100),
  district: text(100).optional(), province: z.enum(PROVINCES_AND_TERRITORIES),
  address: text(300).optional(),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  isMainCampus: z.boolean(), isActive: z.boolean(),
}).strict().superRefine((value, context) => {
  if ((value.latitude === undefined) !== (value.longitude === undefined)) {
    context.addIssue({ code: 'custom', message: 'Campus latitude and longitude must be supplied together.' })
  }
})

const restoreProgram = z.object({
  id: objectId,
  name: text(200), slug, degreeTitle: text(160),
  credentialType: z.enum(['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other']),
  degreeLevel: z.literal('undergraduate'),
  department: text(160).optional(), disciplineCode: text(40).optional(),
  duration: z.object({ years: z.number().min(1).max(6), semesters: z.number().int().min(2).max(12).optional() }).strict(),
  campusIds: z.array(objectId).max(30),
  studyMode: z.enum(['morning', 'evening', 'weekend', 'multiple']),
  source: restoreSource,
  recordStatus: z.enum(['draft', 'published', 'suspended', 'archived']),
  createdAt: timestamp,
  updatedAt: timestamp,
}).strict()

export const restoreUniversitySchema = z.object({
  id: objectId,
  name: text(200), slug, abbreviation: text(30).optional(),
  sector: z.enum(['public', 'private']),
  institutionType: z.enum(['general', 'engineering', 'technology', 'specialized']),
  establishedYear: z.number().int().min(1800).max(2100).optional(),
  recognitionBodies: z.array(text(120)).max(50).optional(),
  provinceOrTerritory: z.enum(PROVINCES_AND_TERRITORIES),
  charterAuthority: z.enum(CHARTER_AUTHORITIES),
  hecRecognitionStatus: z.enum(HEC_RECOGNITION_STATUSES),
  hecProfileUrl: url.optional(),
  campuses: z.array(restoreCampus).min(1).max(30),
  contact: z.object({
    websiteUrl: url.optional(), admissionsUrl: url.optional(),
    email: z.string().trim().email().max(254).optional(), phone: text(50).optional(),
  }).strict().optional(),
  source: restoreSource,
  recordStatus: z.enum(['draft', 'published', 'archived']),
  createdAt: timestamp,
  updatedAt: timestamp,
  programs: z.array(restoreProgram).max(100),
}).strict().superRefine((value, context) => {
  const campusIds = new Set()
  const importKeys = new Set()
  for (const [index, item] of value.campuses.entries()) {
    const id = item.id.toLowerCase()
    if (campusIds.has(id)) context.addIssue({ code: 'custom', path: ['campuses', index, 'id'], message: 'Campus IDs must be unique within a university.' })
    campusIds.add(id)
    if (item.importKey && importKeys.has(item.importKey)) context.addIssue({ code: 'custom', path: ['campuses', index, 'importKey'], message: 'Campus import keys must be unique within a university.' })
    if (item.importKey) importKeys.add(item.importKey)
  }
  const programIds = new Set()
  const programSlugs = new Set()
  for (const [index, item] of value.programs.entries()) {
    if (programIds.has(item.id.toLowerCase())) context.addIssue({ code: 'custom', path: ['programs', index, 'id'], message: 'Program IDs must be unique.' })
    if (programSlugs.has(item.slug)) context.addIssue({ code: 'custom', path: ['programs', index, 'slug'], message: 'Program slugs must be unique within a university.' })
    programIds.add(item.id.toLowerCase())
    programSlugs.add(item.slug)
    if (new Set(item.campusIds.map((id) => id.toLowerCase())).size !== item.campusIds.length) context.addIssue({ code: 'custom', path: ['programs', index, 'campusIds'], message: 'Program campus IDs must be unique.' })
    for (const id of item.campusIds) if (!campusIds.has(id.toLowerCase())) context.addIssue({ code: 'custom', path: ['programs', index, 'campusIds'], message: 'Program campus IDs must belong to the same university.' })
  }
})

const restoreVerification = z.object({
  id: objectId,
  entityModel: z.enum(['University', 'Program']),
  entity: objectId,
  sourceUrl: url,
  sourceTitle: text(240),
  sourceType: z.enum(['official_webpage', 'prospectus', 'admission_notice', 'policy', 'other']),
  documentPublishedAt: timestamp.optional(), checkedAt: timestamp,
  verifiedAt: timestamp, verifiedBy: objectId,
  status: z.literal('verified'),
  evidence: z.object({
    pageOrSection: text(160).optional(), excerpt: text(1000).optional(), archivedUrl: url.optional(),
  }).strict().optional(),
  changesDetected: z.boolean(), changeSummary: text(1000).optional(),
  nextReviewAt: timestamp.optional(), notes: text(1000).optional(),
  createdAt: timestamp, updatedAt: timestamp,
}).strict().superRefine((value, context) => {
  if (new Date(value.verifiedAt) < new Date(value.checkedAt)) {
    context.addIssue({ code: 'custom', path: ['verifiedAt'], message: 'Verification time cannot be earlier than the source check.' })
  }
})

const regularTopLevel = (confirmed) => z.object({
  strategy: z.enum(['skip', 'update_drafts', 'programs_only']),
  universities: z.array(z.unknown()).min(1).max(50),
  ...(confirmed && { confirmed: z.literal(true) }),
}).strict().superRefine((value, context) => {
  const count = value.universities.reduce((total, item) => total + (Array.isArray(item?.programs) ? item.programs.length : 0), 0)
  if (count > 500) context.addIssue({ code: 'custom', path: ['universities'], message: 'An import can contain at most 500 programs.' })
})

const restoreTopLevel = (confirmed) => z.object({
  strategy: z.literal('catalogue_restore'),
  universities: z.array(restoreUniversitySchema).min(1).max(50),
  sourceVerifications: z.array(restoreVerification).max(500),
  ...(confirmed && { confirmed: z.literal(true) }),
}).strict().superRefine((value, context) => {
  const universityIds = new Set()
  const universitySlugs = new Set()
  const programIds = new Set()
  const entities = new Map()
  for (const [index, university] of value.universities.entries()) {
    if (universityIds.has(university.id.toLowerCase())) context.addIssue({ code: 'custom', path: ['universities', index, 'id'], message: 'University IDs must be globally unique.' })
    if (universitySlugs.has(university.slug)) context.addIssue({ code: 'custom', path: ['universities', index, 'slug'], message: 'University slugs must be globally unique.' })
    universityIds.add(university.id.toLowerCase())
    universitySlugs.add(university.slug)
    entities.set(`University:${university.id.toLowerCase()}`, university.source)
    for (const [programIndex, programItem] of university.programs.entries()) {
      if (programIds.has(programItem.id.toLowerCase())) context.addIssue({ code: 'custom', path: ['universities', index, 'programs', programIndex, 'id'], message: 'Program IDs must be globally unique.' })
      programIds.add(programItem.id.toLowerCase())
      entities.set(`Program:${programItem.id.toLowerCase()}`, programItem.source)
    }
  }
  const verificationIds = new Set()
  const verificationById = new Map()
  for (const [index, verification] of value.sourceVerifications.entries()) {
    const id = verification.id.toLowerCase()
    if (verificationIds.has(id)) context.addIssue({ code: 'custom', path: ['sourceVerifications', index, 'id'], message: 'Verification record IDs must be unique.' })
    verificationIds.add(id)
    verificationById.set(id, verification)
    const source = entities.get(`${verification.entityModel}:${verification.entity.toLowerCase()}`)
    if (!source) context.addIssue({ code: 'custom', path: ['sourceVerifications', index, 'entity'], message: 'Verification history must reference a restored university or program.' })
    else if (source.verificationRecord?.toLowerCase() !== id || source.officialUrl !== verification.sourceUrl || source.lastVerifiedAt !== verification.verifiedAt) {
      context.addIssue({ code: 'custom', path: ['sourceVerifications', index], message: 'Verification history must exactly match the restored entity source metadata.' })
    }
  }
  for (const [key, source] of entities) {
    if (source.verificationStatus === 'verified' && !verificationById.has(source.verificationRecord.toLowerCase())) {
      context.addIssue({ code: 'custom', path: ['sourceVerifications'], message: `${key} is verified but its exact verification record is missing.` })
    }
  }
})

const topLevel = (confirmed) => z.union([regularTopLevel(confirmed), restoreTopLevel(confirmed)])

export const previewImportRequestSchema = z.object({ body: topLevel(false), params: emptyObjectSchema, query: emptyObjectSchema })
export const applyImportRequestSchema = z.object({ body: topLevel(true), params: emptyObjectSchema, query: emptyObjectSchema })
