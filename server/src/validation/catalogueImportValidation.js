import { z } from 'zod'
import { CHARTER_AUTHORITIES, PROVINCES_AND_TERRITORIES } from '../utils/geography.js'
import { emptyObjectSchema } from './commonValidation.js'

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120)
const text = (max) => z.string().trim().min(1).max(max)
const objectId = z.string().regex(/^[a-f\d]{24}$/i)
const url = z.string().trim().max(2048).refine((value) => {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
  } catch { return false }
}, 'Use an HTTP or HTTPS URL without embedded credentials.')

const campus = z.object({
  key: slug,
  id: objectId.optional(),
  name: text(160), city: text(100),
  province: z.enum(PROVINCES_AND_TERRITORIES),
  district: text(100).optional(), address: text(300).optional(),
  isMainCampus: z.boolean().default(false), isActive: z.boolean().default(true),
}).strict()

const program = z.object({
  slug, name: text(200), degreeTitle: text(160),
  credentialType: z.enum(['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other']),
  department: text(160).optional(), disciplineCode: text(40).optional(),
  duration: z.object({ years: z.number().min(1).max(6), semesters: z.number().int().min(2).max(12).optional() }).strict(),
  studyMode: z.enum(['morning', 'evening', 'weekend', 'multiple']).default('morning'),
  campusKeys: z.array(slug).max(30).default([]),
  source: z.object({ officialUrl: url }).strict(),
}).strict()

export const importUniversitySchema = z.object({
  slug, name: text(200), abbreviation: text(30).optional(),
  sector: z.enum(['public', 'private']),
  institutionType: z.enum(['general', 'engineering', 'technology', 'specialized']).default('general'),
  provinceOrTerritory: z.enum(PROVINCES_AND_TERRITORIES),
  charterAuthority: z.enum(CHARTER_AUTHORITIES.filter((value) => value !== 'unknown')),
  hecProfileUrl: url.optional(),
  campuses: z.array(campus).min(1).max(30),
  programs: z.array(program).max(100).default([]),
  source: z.object({ officialUrl: url }).strict(),
}).strict().superRefine((value, context) => {
  if (value.charterAuthority === 'provincial' && !value.campuses.some((item) => item.province === 'Punjab')) {
    context.addIssue({ code: 'custom', path: ['campuses'], message: 'A provincially chartered university needs a Punjab campus for this catalogue.' })
  }
  const campusKeys = new Set()
  const campusIds = new Set()
  for (const [index, item] of value.campuses.entries()) {
    if (campusKeys.has(item.key)) context.addIssue({ code: 'custom', path: ['campuses', index, 'key'], message: 'Campus keys must be unique within a university.' })
    campusKeys.add(item.key)
    if (item.id && campusIds.has(item.id.toLowerCase())) context.addIssue({ code: 'custom', path: ['campuses', index, 'id'], message: 'Campus IDs must be unique.' })
    if (item.id) campusIds.add(item.id.toLowerCase())
  }
  const programSlugs = new Set()
  for (const [index, item] of value.programs.entries()) {
    if (programSlugs.has(item.slug)) context.addIssue({ code: 'custom', path: ['programs', index, 'slug'], message: 'Program slugs must be unique within a university.' })
    programSlugs.add(item.slug)
    if (new Set(item.campusKeys).size !== item.campusKeys.length) context.addIssue({ code: 'custom', path: ['programs', index, 'campusKeys'], message: 'Campus keys must be unique.' })
    for (const key of item.campusKeys) if (!campusKeys.has(key)) context.addIssue({ code: 'custom', path: ['programs', index, 'campusKeys'], message: `Campus key ${key} does not belong to this university.` })
  }
})

const topLevel = (confirmed) => z.object({
  strategy: z.enum(['skip', 'update_drafts']),
  universities: z.array(z.unknown()).min(1).max(50),
  ...(confirmed && { confirmed: z.literal(true) }),
}).strict().superRefine((value, context) => {
  const count = value.universities.reduce((total, item) => total + (Array.isArray(item?.programs) ? item.programs.length : 0), 0)
  if (count > 500) context.addIssue({ code: 'custom', path: ['universities'], message: 'An import can contain at most 500 programs.' })
})

export const previewImportRequestSchema = z.object({ body: topLevel(false), params: emptyObjectSchema, query: emptyObjectSchema })
export const applyImportRequestSchema = z.object({ body: topLevel(true), params: emptyObjectSchema, query: emptyObjectSchema })
