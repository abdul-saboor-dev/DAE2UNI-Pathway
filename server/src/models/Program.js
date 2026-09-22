import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'
import sourceInfoSchema from './schemas/sourceInfoSchema.js'

const programSchema = new Schema(
  {
    university: {
      type: Schema.Types.ObjectId,
      ref: 'University',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and hyphenated.'],
    },
    degreeTitle: { type: String, required: true, trim: true, maxlength: 160 },
    credentialType: {
      type: String,
      enum: ['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other'],
      required: true,
    },
    degreeLevel: {
      type: String,
      enum: ['undergraduate'],
      default: 'undergraduate',
      required: true,
    },
    department: { type: String, trim: true, maxlength: 160 },
    disciplineCode: { type: String, trim: true, uppercase: true, maxlength: 40 },
    duration: {
      years: { type: Number, required: true, min: 1, max: 6 },
      semesters: { type: Number, min: 2, max: 12 },
    },
    campusIds: [{ type: Schema.Types.ObjectId }],
    studyMode: {
      type: String,
      enum: ['morning', 'evening', 'weekend', 'multiple'],
      default: 'morning',
    },
    source: { type: sourceInfoSchema, required: true },
    recordStatus: {
      type: String,
      enum: ['draft', 'published', 'suspended', 'archived'],
      default: 'draft',
      required: true,
    },
  },
  baseSchemaOptions,
)

programSchema.index({ university: 1, slug: 1 }, { unique: true })
programSchema.index({ name: 'text', degreeTitle: 'text', department: 'text' })
programSchema.index({ university: 1, recordStatus: 1 })

const Program = mongoose.models.Program || mongoose.model('Program', programSchema)

export default Program
