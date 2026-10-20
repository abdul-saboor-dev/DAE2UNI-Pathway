import { z } from 'zod'
import { emptyObjectSchema } from './commonValidation.js'

const objectId = z.string().trim().toLowerCase().regex(/^[a-f\d]{24}$/i, 'Enter a valid MongoDB identifier.')
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)
const text = (maximum) => z.string().trim().min(1).max(maximum)
const targetType = z.enum(['university_logo', 'university_cover', 'campus_image', 'program_discipline'])
const targetSchema = z.object({
  targetType,
  targetId: objectId,
  campusId: objectId.optional(),
}).strict().superRefine((value, context) => {
  if ((value.targetType === 'campus_image') !== Boolean(value.campusId)) {
    context.addIssue({ code: 'custom', path: ['campusId'], message: 'A campus image requires exactly one campus identifier.' })
  }
})

const request = ({ body = emptyObjectSchema, params = emptyObjectSchema, query = emptyObjectSchema }) => z.object({ body, params, query })

export const createMediaUploadIntentSchema = request({ body: targetSchema })
export const completeMediaUploadSchema = request({ body: z.object({
  intentId: objectId,
  publicId: text(255),
  version: z.number().int().positive(),
  signature: z.string().regex(/^[a-f\d]{40}$/i),
}).strict() })
export const cancelMediaUploadSchema = request({ params: z.object({ intentId: objectId }).strict() })
export const removeMediaAttachmentSchema = request({ body: targetSchema })

const disciplineBody = z.object({
  name: text(120),
  slug,
  aliases: z.array(text(160)).min(1).max(30),
}).strict()
export const listProgramDisciplinesSchema = request({ query: z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
}).strict() })
export const createProgramDisciplineSchema = request({ body: disciplineBody })
export const updateProgramDisciplineSchema = request({
  params: z.object({ disciplineId: objectId }).strict(),
  body: disciplineBody.partial().refine((value) => Object.keys(value).length > 0, 'Discipline update cannot be empty.'),
})
export const deleteProgramDisciplineSchema = request({ params: z.object({ disciplineId: objectId }).strict() })
