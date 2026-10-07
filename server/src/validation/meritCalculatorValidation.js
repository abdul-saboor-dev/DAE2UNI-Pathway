import { z } from 'zod'
import { emptyObjectSchema } from './commonValidation.js'

const objectId = z.string().trim().toLowerCase().regex(/^[a-f\d]{24}$/i, 'Enter a valid record identifier.')
const score = z.object({
  entryTestId: objectId,
  obtainedMarks: z.number().finite().nonnegative(),
}).strict()
const yearMarks = z.object({
  totalMarks: z.number().finite().positive(),
  obtainedMarks: z.number().finite().nonnegative(),
}).strict().refine((marks) => marks.obtainedMarks <= marks.totalMarks, 'Obtained marks cannot exceed total marks.')
const daeMarks = z.object({
  year1: yearMarks,
  year2: yearMarks,
  year3: yearMarks.optional(),
}).strict()

const calculateBody = z.object({
  formulaId: objectId,
  entryTestScores: z.array(score).max(3),
  daeMarks: daeMarks.optional(),
}).strict().superRefine((value, context) => {
  const identifiers = value.entryTestScores.map((item) => item.entryTestId)
  if (new Set(identifiers).size !== identifiers.length) {
    context.addIssue({ code: 'custom', path: ['entryTestScores'], message: 'Each required entry test may be submitted only once.' })
  }
})

const request = ({ body = emptyObjectSchema }) => z.object({
  body,
  params: emptyObjectSchema,
  query: emptyObjectSchema,
})

export const meritCalculatorOptionsRequestSchema = request({})
export const calculateMeritRequestSchema = request({ body: calculateBody })
export const meritCalculatorSchemas = { calculateBody, daeMarks }
