import { z } from 'zod'
import { requestSchema } from './commonValidation.js'

export const nameSchema = z
  .string({ error: 'Name is required.' })
  .trim()
  .min(2, 'Name must contain at least 2 characters.')
  .max(120, 'Name cannot exceed 120 characters.')

export const emailSchema = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254, 'Email cannot exceed 254 characters.')

export const passwordSchema = z
  .string({ error: 'Password is required.' })
  .min(8, 'Password must contain at least 8 characters.')
  .max(72, 'Password cannot exceed 72 characters.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password cannot exceed 72 UTF-8 bytes.',
  })

export const registerRequestSchema = requestSchema(
  z
    .object({
      name: nameSchema,
      email: emailSchema,
      password: passwordSchema,
      turnstileToken: z.string({ error: 'Human verification is required.' }).trim()
        .min(1, 'Human verification is required.')
        .max(2048, 'Human verification token is invalid.'),
    })
    .strict(),
)

export const loginRequestSchema = requestSchema(
  z
    .object({
      email: emailSchema,
      password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.'),
    })
    .strict(),
)
