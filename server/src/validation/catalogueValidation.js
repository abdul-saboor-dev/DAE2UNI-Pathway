import { z } from 'zod'
import { emptyObjectSchema } from './commonValidation.js'
import { CHARTER_AUTHORITIES, HEC_RECOGNITION_STATUSES, PHYSICAL_LOCATIONS } from '../utils/geography.js'

const verificationStatuses = [
  'unverified',
  'pending_review',
  'verified',
  'needs_update',
  'unavailable',
]
const universityStatuses = ['draft', 'published', 'archived']
const programStatuses = ['draft', 'published', 'suspended', 'archived']
const objectIdPattern = /^[a-f\d]{24}$/i
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const trimmedString = (maximum) => z.string().trim().min(1).max(maximum)
const optionalTrimmedString = (maximum) => trimmedString(maximum).optional()
const objectIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(objectIdPattern, 'Enter a valid MongoDB identifier.')
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(slugPattern, 'Slug must be lowercase and hyphenated.')
  .refine((value) => !objectIdPattern.test(value), {
    message: 'Slug cannot be exactly 24 hexadecimal characters.',
  })

const httpUrlSchema = z
  .string()
  .trim()
  .max(2048, 'URL cannot exceed 2048 characters.')
  .refine((value) => {
    try {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
    } catch {
      return false
    }
  }, {
    message: 'Enter an HTTP or HTTPS URL without embedded credentials.',
  })

const sourceCreateSchema = z
  .object({
    officialUrl: httpUrlSchema,
    verificationStatus: z.enum(verificationStatuses).default('unverified'),
    lastVerifiedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .refine(
    (source) => source.verificationStatus !== 'verified' || source.lastVerifiedAt,
    { path: ['lastVerifiedAt'], message: 'A verified source requires a verification date.' },
  )

const sourceUpdateSchema = z
  .object({
    officialUrl: httpUrlSchema.optional(),
    verificationStatus: z.enum(verificationStatuses).optional(),
    lastVerifiedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .refine((source) => Object.keys(source).length > 0, 'Source update cannot be empty.')
  .refine(
    (source) => source.verificationStatus !== 'verified' || source.lastVerifiedAt,
    { path: ['lastVerifiedAt'], message: 'A verified source update requires a verification date.' },
  )

const campusBaseShape = {
  name: trimmedString(160),
  city: trimmedString(100),
  district: optionalTrimmedString(100),
  province: z.enum(PHYSICAL_LOCATIONS).default('Punjab'),
  address: optionalTrimmedString(300),
  isMainCampus: z.boolean().default(false),
  isActive: z.boolean().default(true),
}

const campusCreateSchema = z.object(campusBaseShape).strict()
const campusUpdateSchema = z
  .object({ id: objectIdSchema.optional(), ...campusBaseShape })
  .strict()

const contactCreateSchema = z
  .object({
    websiteUrl: httpUrlSchema.optional(),
    admissionsUrl: httpUrlSchema.optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    phone: optionalTrimmedString(50),
  })
  .strict()

const contactUpdateSchema = contactCreateSchema
  .partial()
  .refine((contact) => Object.keys(contact).length > 0, 'Contact update cannot be empty.')

const universityCreateBodySchema = z
  .object({
    name: trimmedString(200),
    slug: slugSchema,
    abbreviation: trimmedString(30).transform((value) => value.toUpperCase()).optional(),
    sector: z.enum(['public', 'private']),
    provinceOrTerritory: z.enum(PHYSICAL_LOCATIONS).optional(),
    charterAuthority: z.enum(CHARTER_AUTHORITIES).optional(),
    hecRecognitionStatus: z.enum(HEC_RECOGNITION_STATUSES).optional(),
    hecProfileUrl: httpUrlSchema.optional(),
    institutionType: z.enum(['general', 'engineering', 'technology', 'specialized']).default('general'),
    establishedYear: z.number().int().min(1800).max(2100).optional(),
    recognitionBodies: z.array(trimmedString(100)).max(30).optional(),
    campuses: z.array(campusCreateSchema).min(1).max(30),
    contact: contactCreateSchema.optional(),
    source: sourceCreateSchema,
    recordStatus: z.enum(universityStatuses).default('draft'),
  })
  .strict()

const universityUpdateBodySchema = z
  .object({
    name: trimmedString(200).optional(),
    slug: slugSchema.optional(),
    abbreviation: trimmedString(30).transform((value) => value.toUpperCase()).optional(),
    sector: z.enum(['public', 'private']).optional(),
    provinceOrTerritory: z.enum(PHYSICAL_LOCATIONS).optional(),
    charterAuthority: z.enum(CHARTER_AUTHORITIES).optional(),
    hecRecognitionStatus: z.enum(HEC_RECOGNITION_STATUSES).optional(),
    hecProfileUrl: httpUrlSchema.nullable().optional(),
    institutionType: z.enum(['general', 'engineering', 'technology', 'specialized']).optional(),
    establishedYear: z.number().int().min(1800).max(2100).optional(),
    recognitionBodies: z.array(trimmedString(100)).max(30).optional(),
    campuses: z.array(campusUpdateSchema).min(1).max(30).optional(),
    contact: contactUpdateSchema.optional(),
    source: sourceUpdateSchema.optional(),
    recordStatus: z.enum(universityStatuses).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'University update cannot be empty.')

const durationCreateSchema = z
  .object({
    years: z.number().min(1).max(6),
    semesters: z.number().int().min(2).max(12).optional(),
  })
  .strict()

const durationUpdateSchema = durationCreateSchema
  .partial()
  .refine((duration) => Object.keys(duration).length > 0, 'Duration update cannot be empty.')

const uniqueObjectIdArray = z
  .array(objectIdSchema)
  .max(30)
  .refine((values) => new Set(values).size === values.length, 'Campus identifiers must be unique.')

const programCreateBodySchema = z
  .object({
    university: objectIdSchema,
    name: trimmedString(200),
    slug: slugSchema,
    degreeTitle: trimmedString(160),
    credentialType: z.enum(['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other']),
    degreeLevel: z.literal('undergraduate').default('undergraduate'),
    department: optionalTrimmedString(160),
    disciplineCode: trimmedString(40).transform((value) => value.toUpperCase()).optional(),
    duration: durationCreateSchema,
    campusIds: uniqueObjectIdArray.optional(),
    studyMode: z.enum(['morning', 'evening', 'weekend', 'multiple']).default('morning'),
    source: sourceCreateSchema,
    recordStatus: z.enum(programStatuses).default('draft'),
  })
  .strict()

const programUpdateBodySchema = z
  .object({
    university: objectIdSchema.optional(),
    name: trimmedString(200).optional(),
    slug: slugSchema.optional(),
    degreeTitle: trimmedString(160).optional(),
    credentialType: z.enum(['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other']).optional(),
    degreeLevel: z.literal('undergraduate').optional(),
    department: optionalTrimmedString(160),
    disciplineCode: trimmedString(40).transform((value) => value.toUpperCase()).optional(),
    duration: durationUpdateSchema.optional(),
    campusIds: uniqueObjectIdArray.optional(),
    studyMode: z.enum(['morning', 'evening', 'weekend', 'multiple']).optional(),
    source: sourceUpdateSchema.optional(),
    recordStatus: z.enum(programStatuses).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Program update cannot be empty.')

const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}

const searchSchema = trimmedString(100).optional()
const citySchema = trimmedString(100).optional()
const universityIdentifierSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => objectIdPattern.test(value) || slugPattern.test(value), {
    message: 'University identifier must be a valid ID or slug.',
  })

const adminUniversityQuerySchema = z
  .object({
    search: searchSchema,
    city: citySchema,
    sector: z.enum(['public', 'private']).optional(),
    provinceOrTerritory: z.enum(PHYSICAL_LOCATIONS).optional(),
    charterAuthority: z.enum(CHARTER_AUTHORITIES).optional(),
    hecRecognitionStatus: z.enum(HEC_RECOGNITION_STATUSES).optional(),
    institutionType: z.enum(['general', 'engineering', 'technology', 'specialized']).optional(),
    recordStatus: z.enum(universityStatuses).optional(),
    verificationStatus: z.enum(verificationStatuses).optional(),
    sort: z.enum(['name', '-name', 'establishedYear', '-establishedYear', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt']).default('name'),
    ...paginationShape,
  })
  .strict()

const publicUniversityQuerySchema = z
  .object({
    search: searchSchema,
    city: citySchema,
    sector: z.enum(['public', 'private']).optional(),
    provinceOrTerritory: z.enum(PHYSICAL_LOCATIONS).optional(),
    charterAuthority: z.enum(CHARTER_AUTHORITIES).optional(),
    hecRecognitionStatus: z.enum(HEC_RECOGNITION_STATUSES).optional(),
    institutionType: z.enum(['general', 'engineering', 'technology', 'specialized']).optional(),
    sort: z.enum(['name', '-name', 'establishedYear', '-establishedYear']).default('name'),
    ...paginationShape,
  })
  .strict()

const adminProgramQuerySchema = z
  .object({
    search: searchSchema,
    university: universityIdentifierSchema.optional(),
    city: citySchema,
    institutionType: z.enum(['general', 'engineering', 'technology', 'specialized']).optional(),
    credentialType: z.enum(['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other']).optional(),
    degreeLevel: z.literal('undergraduate').optional(),
    studyMode: z.enum(['morning', 'evening', 'weekend', 'multiple']).optional(),
    recordStatus: z.enum(programStatuses).optional(),
    verificationStatus: z.enum(verificationStatuses).optional(),
    sort: z.enum(['name', '-name', 'degreeTitle', '-degreeTitle', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt']).default('name'),
    ...paginationShape,
  })
  .strict()

const publicProgramQuerySchema = z
  .object({
    search: searchSchema,
    university: universityIdentifierSchema.optional(),
    city: citySchema,
    institutionType: z.enum(['general', 'engineering', 'technology', 'specialized']).optional(),
    credentialType: z.enum(['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other']).optional(),
    degreeLevel: z.literal('undergraduate').optional(),
    studyMode: z.enum(['morning', 'evening', 'weekend', 'multiple']).optional(),
    sort: z.enum(['name', '-name', 'degreeTitle', '-degreeTitle']).default('name'),
    ...paginationShape,
  })
  .strict()

function requestSchema({ body = emptyObjectSchema, params = emptyObjectSchema, query = emptyObjectSchema } = {}) {
  return z.object({ body, params, query })
}

const universityIdParams = z.object({ universityId: objectIdSchema }).strict()
const programIdParams = z.object({ programId: objectIdSchema }).strict()
const publicUniversityParams = z.object({ universityIdentifier: universityIdentifierSchema }).strict()
const publicProgramParams = z.object({ programIdentifier: objectIdSchema }).strict()

export const createUniversityRequestSchema = requestSchema({ body: universityCreateBodySchema })
export const listAdminUniversitiesRequestSchema = requestSchema({ query: adminUniversityQuerySchema })
export const getAdminUniversityRequestSchema = requestSchema({ params: universityIdParams })
export const updateUniversityRequestSchema = requestSchema({ body: universityUpdateBodySchema, params: universityIdParams })
export const deleteUniversityRequestSchema = requestSchema({ params: universityIdParams })

export const createProgramRequestSchema = requestSchema({ body: programCreateBodySchema })
export const listAdminProgramsRequestSchema = requestSchema({ query: adminProgramQuerySchema })
export const getAdminProgramRequestSchema = requestSchema({ params: programIdParams })
export const updateProgramRequestSchema = requestSchema({ body: programUpdateBodySchema, params: programIdParams })
export const deleteProgramRequestSchema = requestSchema({ params: programIdParams })

export const listPublicUniversitiesRequestSchema = requestSchema({ query: publicUniversityQuerySchema })
export const getPublicUniversityRequestSchema = requestSchema({ params: publicUniversityParams })
export const listPublicProgramsRequestSchema = requestSchema({ query: publicProgramQuerySchema })
export const getPublicProgramRequestSchema = requestSchema({ params: publicProgramParams })
