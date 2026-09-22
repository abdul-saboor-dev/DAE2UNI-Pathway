import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions, normalizeUppercaseList } from './schemas/schemaOptions.js'
import sourceInfoSchema from './schemas/sourceInfoSchema.js'

const entryTestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
    },
    conductingBody: { type: String, required: true, trim: true, maxlength: 180 },
    category: {
      type: String,
      enum: ['engineering', 'general', 'university_specific', 'aptitude', 'other'],
      required: true,
    },
    scoring: {
      resultUnit: {
        type: String,
        enum: ['score', 'percentage', 'percentile'],
        default: 'score',
        required: true,
      },
      maximumScore: { type: Number, min: 1 },
      defaultPassingScore: { type: Number, min: 0 },
      negativeMarking: { type: Boolean, default: false },
    },
    applicableQualificationCodes: {
      type: [String],
      default: ['DAE-CIT'],
      set: normalizeUppercaseList,
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

entryTestSchema.path('scoring.defaultPassingScore').validate(function validatePassingScore(value) {
  return value == null || this.scoring?.maximumScore == null || value <= this.scoring.maximumScore
}, 'Default passing score cannot exceed maximum score.')

entryTestSchema.pre('validate', function validateScoring() {
  if (this.scoring?.resultUnit === 'score' && this.scoring.maximumScore == null) {
    this.invalidate('scoring.maximumScore', 'Score-based entry tests require a maximum score.')
  }
})

entryTestSchema.index({ code: 1 }, { unique: true })
entryTestSchema.index({ name: 'text', conductingBody: 'text' })

const EntryTest = mongoose.models.EntryTest || mongoose.model('EntryTest', entryTestSchema)

export default EntryTest
