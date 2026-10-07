import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'

const researchStatuses = [
  'not_started',
  'researching',
  'blocked',
  'ready_for_review',
  'verified',
]

function isSafeHttpUrl(value) {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

const eligibilityResearchSchema = new Schema(
  {
    university: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    program: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
    admissionCycle: { type: Schema.Types.ObjectId, ref: 'AdmissionCycle' },
    researchStatus: {
      type: String,
      enum: researchStatuses,
      default: 'not_started',
      required: true,
    },
    officialSourceUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: isSafeHttpUrl,
        message: 'Official source URL must use HTTP or HTTPS without embedded credentials.',
      },
    },
    sourceTitle: { type: String, required: true, trim: true, minlength: 2, maxlength: 240 },
    reviewedDate: { type: Date, required: true },
    evidenceNotes: { type: String, required: true, trim: true, minlength: 1, maxlength: 3000 },
    unresolvedItems: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: 500 }],
      default: [],
      validate: {
        validator: (items) => items.length <= 30,
        message: 'No more than 30 unresolved items may be recorded.',
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  baseSchemaOptions,
)

eligibilityResearchSchema.index({ program: 1, admissionCycle: 1 }, { unique: true })
eligibilityResearchSchema.index({ researchStatus: 1, updatedAt: -1 })
eligibilityResearchSchema.index({ university: 1, program: 1 })

eligibilityResearchSchema.pre('validate', function validateReviewedDate() {
  if (this.reviewedDate && this.reviewedDate.getTime() > Date.now()) {
    this.invalidate('reviewedDate', 'Reviewed date cannot be in the future.')
  }
})

const EligibilityResearch =
  mongoose.models.EligibilityResearch ||
  mongoose.model('EligibilityResearch', eligibilityResearchSchema)

export { researchStatuses }
export default EligibilityResearch
