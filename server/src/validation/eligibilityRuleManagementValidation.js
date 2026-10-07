import { z } from 'zod'
import { emptyObjectSchema } from './commonValidation.js'

const objectId = z.string().trim().toLowerCase().regex(/^[a-f\d]{24}$/i, 'Enter a valid record ID.')
const text = (maximum) => z.string().trim().min(1).max(maximum)
const optionalTextList = z.array(text(160)).max(30).optional()
const finite = z.number().finite()

const httpUrl = z.string().trim().max(2048).refine((value) => {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
  } catch {
    return false
  }
}, 'Enter an HTTP or HTTPS source URL without embedded credentials.')

const qualificationCriterion = z.object({
  qualificationType: z.literal('DAE'),
  technologyCodes: z.array(text(40).transform((value) => value.toUpperCase())).min(1).max(30),
  minimumPercentage: finite.min(0).max(100).nullable().optional(),
  minimumPassingYear: z.number().int().min(1950).max(2100).nullable().optional(),
  acceptedBoards: optionalTextList,
  requiredSubjects: optionalTextList,
  equivalenceRequired: z.boolean(),
  explanation: text(500),
}).strict()

const domicile = z.object({
  allowedProvinces: z.array(text(100)).max(20),
  allowedDistricts: z.array(text(100)).max(100).optional(),
  required: z.boolean(),
  explanation: z.string().trim().max(500).optional(),
}).strict().superRefine((value, context) => {
  if (value.required && value.allowedProvinces.length === 0) {
    context.addIssue({ code: 'custom', path: ['allowedProvinces'], message: 'Add at least one allowed province.' })
  }
})

const entryTestRequirement = z.object({
  entryTest: objectId,
  required: z.boolean(),
  minimumScore: finite.nonnegative().nullable().optional(),
  minimumPercentage: finite.min(0).max(100).nullable().optional(),
  explanation: text(500),
}).strict()

const body = z.object({
  code: text(80).transform((value) => value.toUpperCase()),
  name: text(200),
  university: objectId,
  program: objectId.nullable().optional(),
  admissionCycle: objectId.nullable().optional(),
  eligibilityResearch: objectId.nullable().optional(),
  scope: z.enum(['university', 'program']),
  qualificationMatchLogic: z.enum(['any', 'all']),
  qualificationCriteria: z.array(qualificationCriterion).min(1).max(10),
  domicile,
  entryTestRequirements: z.array(entryTestRequirement).max(10),
  effectiveFrom: z.string().date().nullable().optional(),
  effectiveUntil: z.string().date().nullable().optional(),
  priority: z.number().int().min(-1000).max(1000),
  officialSourceUrl: httpUrl,
}).strict().superRefine((value, context) => {
  if (value.scope === 'program' && !value.program) {
    context.addIssue({ code: 'custom', path: ['program'], message: 'Select a program for a program-scoped rule.' })
  }
  if (value.scope === 'university' && value.program) {
    context.addIssue({ code: 'custom', path: ['program'], message: 'A university-scoped rule cannot select a program.' })
  }
  if (value.eligibilityResearch && !value.program) {
    context.addIssue({ code: 'custom', path: ['eligibilityResearch'], message: 'Linked research requires a selected program.' })
  }
  if (value.effectiveFrom && value.effectiveUntil && value.effectiveUntil < value.effectiveFrom) {
    context.addIssue({ code: 'custom', path: ['effectiveUntil'], message: 'Effective-until date must follow effective-from date.' })
  }
  const tests = value.entryTestRequirements.map((item) => item.entryTest)
  if (new Set(tests).size !== tests.length) {
    context.addIssue({ code: 'custom', path: ['entryTestRequirements'], message: 'An entry test can appear only once.' })
  }
})

const listQuery = z.object({
  search: text(100).optional(),
  recordStatus: z.enum(['draft', 'published', 'archived']).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['name', '-name', 'updatedAt', '-updatedAt']).default('-updatedAt'),
}).strict()

const optionsQuery = z.object({
  university: objectId.optional(),
  program: objectId.optional(),
}).strict().superRefine((value, context) => {
  if (value.program && !value.university) {
    context.addIssue({ code: 'custom', path: ['university'], message: 'Select a university first.' })
  }
})

const idParams = z.object({ ruleId: objectId }).strict()
const request = ({ requestBody = emptyObjectSchema, params = emptyObjectSchema, query = emptyObjectSchema }) =>
  z.object({ body: requestBody, params, query })

export const listEligibilityRulesSchema = request({ query: listQuery })
export const eligibilityRuleOptionsSchema = request({ query: optionsQuery })
export const createEligibilityRuleSchema = request({ requestBody: body })
export const getEligibilityRuleSchema = request({ params: idParams })
export const updateEligibilityRuleSchema = request({ requestBody: body, params: idParams })
export const deleteEligibilityRuleSchema = request({ params: idParams })

export const eligibilityRuleManagementSchemas = { body, listQuery, optionsQuery }
