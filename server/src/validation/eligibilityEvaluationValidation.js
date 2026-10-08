import { z } from 'zod'
import { emptyObjectSchema } from './commonValidation.js'

const objectId = z.string().trim().toLowerCase().regex(/^[a-f\d]{24}$/i, 'Enter a valid program identifier.')

const query = z.object({
  programId: objectId.optional(),
}).strict()

export const studentEligibilityRequestSchema = z.object({
  body: emptyObjectSchema,
  params: emptyObjectSchema,
  query,
})

export const eligibilityEvaluationSchemas = { query }
