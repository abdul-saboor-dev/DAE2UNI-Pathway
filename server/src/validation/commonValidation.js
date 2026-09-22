import { z } from 'zod'

export const emptyObjectSchema = z.object({}).strict()

export function requestSchema(bodySchema = emptyObjectSchema) {
  return z.object({
    body: bodySchema,
    params: emptyObjectSchema,
    query: emptyObjectSchema,
  })
}

export const emptyRequestSchema = requestSchema()
