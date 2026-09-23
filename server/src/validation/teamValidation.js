import { z } from 'zod'
import { emailSchema } from './authValidation.js'
import { emptyObjectSchema } from './commonValidation.js'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Enter a valid user identifier.')
const password = z.string({ error: 'Current password is required.' }).min(1, 'Current password is required.').max(72)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password cannot exceed 72 UTF-8 bytes.')
const params = z.object({ userId: objectId }).strict()
const request = (body, requestParams = emptyObjectSchema, query = emptyObjectSchema) =>
  z.object({ body, params: requestParams, query })

export const listTeamSchema = request(emptyObjectSchema, emptyObjectSchema, z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(80).optional(),
  sort: z.enum(['name', '-name', 'createdAt', '-createdAt', 'lastLoginAt', '-lastLoginAt', 'role', '-role']).default('name'),
}).strict())

export const promoteStudentSchema = request(z.object({ email: emailSchema, currentPassword: password }).strict())
export const revokeAdminSchema = request(z.object({ currentPassword: password, confirmed: z.literal(true) }).strict(), params)
export const changeCoOwnerSchema = request(z.object({ currentPassword: password, confirmEmail: emailSchema, confirmed: z.literal(true) }).strict(), params)
