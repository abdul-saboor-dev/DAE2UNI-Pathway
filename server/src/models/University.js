import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions, isHttpUrl } from './schemas/schemaOptions.js'
import sourceInfoSchema from './schemas/sourceInfoSchema.js'

const campusSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  district: { type: String, trim: true, maxlength: 100 },
  province: { type: String, enum: ['Punjab'], default: 'Punjab', required: true },
  address: { type: String, trim: true, maxlength: 300 },
  isMainCampus: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
})

const universitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase and hyphenated.'],
    },
    abbreviation: { type: String, trim: true, uppercase: true, maxlength: 30 },
    sector: {
      type: String,
      enum: ['public', 'private'],
      required: true,
    },
    institutionType: {
      type: String,
      enum: ['general', 'engineering', 'technology', 'specialized'],
      default: 'general',
      required: true,
    },
    establishedYear: { type: Number, min: 1800, max: 2100 },
    recognitionBodies: { type: [String], default: undefined },
    campuses: {
      type: [campusSchema],
      validate: {
        validator: (campuses) => campuses.length > 0,
        message: 'At least one Punjab campus is required.',
      },
    },
    contact: {
      websiteUrl: {
        type: String,
        trim: true,
        validate: { validator: isHttpUrl, message: 'Website URL must use HTTP or HTTPS.' },
      },
      admissionsUrl: {
        type: String,
        trim: true,
        validate: { validator: isHttpUrl, message: 'Admissions URL must use HTTP or HTTPS.' },
      },
      email: { type: String, trim: true, lowercase: true, maxlength: 254 },
      phone: { type: String, trim: true, maxlength: 50 },
    },
    source: { type: sourceInfoSchema, required: true },
    recordStatus: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      required: true,
    },
  },
  baseSchemaOptions,
)

universitySchema.index({ slug: 1 }, { unique: true })
universitySchema.index({ name: 'text', abbreviation: 'text' })
universitySchema.index({ sector: 1, recordStatus: 1 })
universitySchema.index({ 'campuses.city': 1 })

universitySchema.pre('validate', function validateMainCampus() {
  const mainCampusCount = this.campuses.filter((campus) => campus.isMainCampus).length
  if (this.recordStatus === 'published' && mainCampusCount !== 1) {
    this.invalidate('campuses', 'A published university must have exactly one main campus.')
  }
})

const University =
  mongoose.models.University || mongoose.model('University', universitySchema)

export default University
