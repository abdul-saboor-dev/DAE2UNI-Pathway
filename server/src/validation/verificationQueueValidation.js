import { z } from 'zod'
import { emptyObjectSchema } from './commonValidation.js'

const entityType = z.enum(['university', 'program'])
const params = z.object({ entityType, recordId: z.string().regex(/^[a-f\d]{24}$/i, 'Enter a valid record ID.') }).strict()
const query = z.object({
  entityType: entityType.default('university'),
  verificationStatus: z.enum(['unverified', 'pending_review', 'needs_update', 'unavailable']).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(['name', '-name', 'updatedAt', '-updatedAt', 'lastVerifiedAt', '-lastVerifiedAt']).default('-updatedAt'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict()

const url = z.string().trim().max(2048).refine((value) => {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
  } catch { return false }
}, 'Enter an HTTP or HTTPS source URL without embedded credentials.')

const verifyBody = z.object({
  officialUrl: url,
  sourceTitle: z.string().trim().min(2).max(240),
  sourceType: z.enum(['official_webpage', 'prospectus', 'admission_notice', 'policy', 'other']),
  confirmed: z.literal(true),
}).strict()

export const listVerificationQueueSchema = z.object({ body: emptyObjectSchema, params: emptyObjectSchema, query })
export const verifyCatalogueSourceSchema = z.object({ body: verifyBody, params, query: emptyObjectSchema })
