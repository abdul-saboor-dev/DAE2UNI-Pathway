import { z } from 'zod'
import { emptyObjectSchema } from './commonValidation.js'

const objectId = z.string().trim().toLowerCase().regex(/^[a-f\d]{24}$/i, 'Enter a valid MongoDB identifier.')
const text = (maximum) => z.string().trim().min(1).max(maximum)
const finiteNumber = z.number().finite()
const verificationStatuses = ['unverified', 'pending_review', 'verified', 'needs_update', 'unavailable']

const httpUrl = z.string().trim().max(2048).refine((value) => {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
  } catch {
    return false
  }
}, 'Enter an HTTP or HTTPS URL without embedded credentials.')

const sourceCreate = z.object({
  officialUrl: httpUrl,
  verificationStatus: z.enum(verificationStatuses).default('unverified'),
  lastVerifiedAt: z.string().datetime({ offset: true }).optional(),
}).strict().refine((source) => source.verificationStatus !== 'verified' || source.lastVerifiedAt, {
  path: ['lastVerifiedAt'], message: 'A verified source requires a verification date.',
})

const sourceUpdate = z.object({
  officialUrl: httpUrl.optional(),
  verificationStatus: z.enum(verificationStatuses).optional(),
  lastVerifiedAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict().refine((source) => Object.keys(source).length > 0, 'Source update cannot be empty.')
  .refine((source) => source.verificationStatus !== 'verified' || source.lastVerifiedAt, {
    path: ['lastVerifiedAt'], message: 'A verified source update requires a verification date.',
  })

const scoring = z.object({
  resultUnit: z.enum(['score', 'percentage', 'percentile']),
  maximumScore: finiteNumber.positive().optional(),
  defaultPassingScore: finiteNumber.nonnegative().optional(),
  negativeMarking: z.boolean().default(false),
}).strict().superRefine((value, context) => {
  if (value.resultUnit === 'score' && value.maximumScore == null) {
    context.addIssue({ code: 'custom', path: ['maximumScore'], message: 'Score-based tests require maximum marks.' })
  }
  if (value.maximumScore != null && value.defaultPassingScore > value.maximumScore) {
    context.addIssue({ code: 'custom', path: ['defaultPassingScore'], message: 'Passing score cannot exceed maximum marks.' })
  }
})

const entryTestFields = {
  name: text(180),
  code: text(40).transform((value) => value.toUpperCase()),
  conductingBody: text(180),
  category: z.enum(['engineering', 'general', 'university_specific', 'aptitude', 'other']),
  scoring,
  applicableQualificationCodes: z.array(text(40).transform((value) => value.toUpperCase())).max(30).optional(),
  source: sourceCreate,
  recordStatus: z.enum(['draft', 'published', 'archived']).default('draft'),
}

const entryTestCreate = z.object(entryTestFields).strict()
const entryTestUpdate = z.object({
  ...Object.fromEntries(Object.entries(entryTestFields).map(([key, schema]) => [key, schema.optional()])),
  source: sourceUpdate.optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'Entry-test update cannot be empty.')

const component = z.object({
  basis: z.enum(['matric', 'dae', 'entry_test']),
  label: text(120),
  weightPercentage: finiteNumber.min(0).max(100),
  entryTest: objectId.optional(),
}).strict().superRefine((value, context) => {
  if (value.basis === 'entry_test' && !value.entryTest) {
    context.addIssue({ code: 'custom', path: ['entryTest'], message: 'Select an entry test.' })
  }
  if (value.basis !== 'entry_test' && value.entryTest) {
    context.addIssue({ code: 'custom', path: ['entryTest'], message: 'Only entry-test components may link an entry test.' })
  }
})

const components = z.array(component).min(1).max(3).superRefine((items, context) => {
  const bases = items.map((item) => item.basis)
  if (new Set(bases).size !== bases.length) {
    context.addIssue({ code: 'custom', message: 'Component bases must be unique.' })
  }
})

const meritFields = {
  code: text(80).transform((value) => value.toUpperCase()),
  name: text(200),
  university: objectId,
  program: objectId.nullable().optional(),
  admissionCycle: objectId.nullable().optional(),
  components,
  source: sourceCreate,
  recordStatus: z.enum(['draft', 'published', 'archived']).default('draft'),
}

const meritCreate = z.object(meritFields).strict()
const meritUpdate = z.object({
  ...Object.fromEntries(Object.entries(meritFields).map(([key, schema]) => [key, schema.optional()])),
  source: sourceUpdate.optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'Merit-formula update cannot be empty.')

const listQuery = (sortValues) => z.object({
  search: text(100).optional(),
  recordStatus: z.enum(['draft', 'published', 'archived']).optional(),
  verificationStatus: z.enum(verificationStatuses).optional(),
  university: objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(sortValues).default('name'),
}).strict()

const request = ({ body = emptyObjectSchema, params = emptyObjectSchema, query = emptyObjectSchema }) => z.object({ body, params, query })
const idParams = (key) => z.object({ [key]: objectId }).strict()

export const createEntryTestSchema = request({ body: entryTestCreate })
export const updateEntryTestSchema = request({ body: entryTestUpdate, params: idParams('entryTestId') })
export const entryTestByIdSchema = request({ params: idParams('entryTestId') })
export const listEntryTestsSchema = request({ query: listQuery(['name', '-name', 'updatedAt', '-updatedAt']) })
export const createMeritFormulaSchema = request({ body: meritCreate })
export const updateMeritFormulaSchema = request({ body: meritUpdate, params: idParams('meritFormulaId') })
export const meritFormulaByIdSchema = request({ params: idParams('meritFormulaId') })
export const listMeritFormulasSchema = request({ query: listQuery(['name', '-name', 'updatedAt', '-updatedAt']) })

export const meritManagementSchemas = { entryTestCreate, meritCreate, component }
