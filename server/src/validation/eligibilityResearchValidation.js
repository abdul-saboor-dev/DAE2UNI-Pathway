import { z } from 'zod'
import { emptyObjectSchema } from './commonValidation.js'

const objectId = z.string().trim().toLowerCase().regex(/^[a-f\d]{24}$/i, 'Enter a valid record ID.')
const statuses = ['not_started', 'researching', 'blocked', 'ready_for_review', 'verified']
const text = (maximum) => z.string().trim().min(1).max(maximum)
const httpUrl = z.string().trim().max(2048).refine((value) => {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
  } catch {
    return false
  }
}, 'Enter an HTTP or HTTPS source URL without embedded credentials.')

const reviewedDate = z.string().date().refine(
  (value) => new Date(`${value}T23:59:59.999Z`).getTime() <= Date.now(),
  'Reviewed date cannot be in the future.',
)

const fields = {
  university: objectId,
  program: objectId,
  admissionCycle: objectId.nullable().optional(),
  researchStatus: z.enum(statuses),
  officialSourceUrl: httpUrl,
  sourceTitle: z.string().trim().min(2).max(240),
  reviewedDate,
  evidenceNotes: text(3000),
  unresolvedItems: z.array(text(500)).max(30).default([]),
}

const body = z.object(fields).strict()
const updateBody = z.object(
  Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, schema.optional()])),
).strict().refine((value) => Object.keys(value).length > 0, 'Research update cannot be empty.')

const listQuery = z.object({
  researchStatus: z.enum(statuses).optional(),
  university: objectId.optional(),
  program: objectId.optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['updatedAt', '-updatedAt', 'reviewedDate', '-reviewedDate']).default('-updatedAt'),
}).strict()

const optionsQuery = z.object({
  university: objectId.optional(),
  program: objectId.optional(),
}).strict().superRefine((value, context) => {
  if (value.program && !value.university) {
    context.addIssue({ code: 'custom', path: ['university'], message: 'Select a university first.' })
  }
})

const idParams = z.object({ researchId: objectId }).strict()
const request = ({ requestBody = emptyObjectSchema, params = emptyObjectSchema, query = emptyObjectSchema }) =>
  z.object({ body: requestBody, params, query })

export const listEligibilityResearchSchema = request({ query: listQuery })
export const eligibilityResearchOptionsSchema = request({ query: optionsQuery })
export const createEligibilityResearchSchema = request({ requestBody: body })
export const getEligibilityResearchSchema = request({ params: idParams })
export const updateEligibilityResearchSchema = request({ requestBody: updateBody, params: idParams })

export const eligibilityResearchSchemas = { body, updateBody, listQuery, optionsQuery }
