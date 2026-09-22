import { z } from 'zod'
import { requestSchema } from './commonValidation.js'

const nonEmptyTrimmedString = (maximum) => z.string().trim().min(1).max(maximum)
const yearSchema = z.number().int().min(1950).max(2100)

const partialMarksSchema = z
  .object({
    totalMarks: z.number().positive().optional(),
    obtainedMarks: z.number().min(0).optional(),
  })
  .strict()
  .refine((marks) => Object.keys(marks).length > 0, 'Marks update cannot be empty.')
  .refine(
    (marks) =>
      marks.totalMarks == null ||
      marks.obtainedMarks == null ||
      marks.obtainedMarks <= marks.totalMarks,
    'Obtained marks cannot exceed total marks.',
  )

const subjectSchema = z
  .object({
    name: nonEmptyTrimmedString(120),
    totalMarks: z.number().positive().optional(),
    obtainedMarks: z.number().min(0).optional(),
  })
  .strict()
  .refine(
    (subject) =>
      subject.totalMarks == null ||
      subject.obtainedMarks == null ||
      subject.obtainedMarks <= subject.totalMarks,
    'Subject obtained marks cannot exceed total marks.',
  )

const daeSchema = z
  .object({
    technologyCode: z.literal('CIT').optional(),
    technologyName: z.literal('Computer Information Technology').optional(),
    boardName: nonEmptyTrimmedString(160).optional(),
    instituteName: nonEmptyTrimmedString(200).optional(),
    registrationNumber: nonEmptyTrimmedString(80).optional(),
    passingYear: yearSchema.optional(),
    marks: partialMarksSchema.optional(),
    subjects: z.array(subjectSchema).max(40).optional(),
  })
  .strict()
  .refine((dae) => Object.keys(dae).length > 0, 'DAE update cannot be empty.')

const matricSchema = z
  .object({
    boardName: nonEmptyTrimmedString(160).optional(),
    group: nonEmptyTrimmedString(100).optional(),
    passingYear: yearSchema.optional(),
    marks: partialMarksSchema.optional(),
  })
  .strict()
  .refine((matric) => Object.keys(matric).length > 0, 'Matric update cannot be empty.')

const domicileSchema = z
  .object({
    province: z.literal('Punjab').optional(),
    district: nonEmptyTrimmedString(100).optional(),
  })
  .strict()
  .refine((domicile) => Object.keys(domicile).length > 0, 'Domicile update cannot be empty.')

const interestsSchema = z
  .object({
    preferredCities: z.array(nonEmptyTrimmedString(100)).max(20).optional(),
    preferredDegreeFields: z.array(nonEmptyTrimmedString(120)).max(20).optional(),
    preferredUniversitySectors: z.array(z.enum(['public', 'private'])).max(2).optional(),
  })
  .strict()
  .refine((interests) => Object.keys(interests).length > 0, 'Interests update cannot be empty.')

const profileUpdateBodySchema = z
  .object({
    profileStatus: z.enum(['draft', 'complete']).optional(),
    dae: daeSchema.optional(),
    matric: matricSchema.optional(),
    domicile: domicileSchema.optional(),
    interests: interestsSchema.optional(),
  })
  .strict()
  .refine((profile) => Object.keys(profile).length > 0, 'Profile update cannot be empty.')

export const updateStudentProfileRequestSchema = requestSchema(profileUpdateBodySchema)
