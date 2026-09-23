import { z } from 'zod'
import { requestSchema } from './commonValidation.js'
import { emailSchema, nameSchema, passwordSchema } from './authValidation.js'

export const setupAdminRequestSchema = requestSchema(z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  passwordConfirmation: z.string({ error: 'Confirm your password.' }),
  setupSecret: z.string({ error: 'Setup secret is required.' }).min(1, 'Setup secret is required.').max(4096),
}).strict().refine((value) => value.password === value.passwordConfirmation, {
  path: ['passwordConfirmation'], message: 'Passwords do not match.',
}))
