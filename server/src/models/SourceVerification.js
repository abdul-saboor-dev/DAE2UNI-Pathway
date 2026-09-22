import mongoose, { Schema } from 'mongoose'
import {
  baseSchemaOptions,
  isHttpUrl,
  verificationStatuses,
} from './schemas/schemaOptions.js'

const sourceVerificationSchema = new Schema(
  {
    entityModel: {
      type: String,
      enum: [
        'University',
        'Program',
        'EligibilityRule',
        'MeritFormula',
        'EntryTest',
        'AdmissionCycle',
      ],
      required: true,
    },
    entity: {
      type: Schema.Types.ObjectId,
      refPath: 'entityModel',
      required: true,
    },
    sourceUrl: {
      type: String,
      required: true,
      trim: true,
      validate: { validator: isHttpUrl, message: 'Source URL must use HTTP or HTTPS.' },
    },
    sourceTitle: { type: String, required: true, trim: true, maxlength: 240 },
    sourceType: {
      type: String,
      enum: ['official_webpage', 'prospectus', 'admission_notice', 'policy', 'other'],
      required: true,
    },
    documentPublishedAt: Date,
    checkedAt: { type: Date, default: Date.now, required: true },
    verifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: verificationStatuses,
      default: 'pending_review',
      required: true,
    },
    evidence: {
      pageOrSection: { type: String, trim: true, maxlength: 160 },
      excerpt: { type: String, trim: true, maxlength: 1000 },
      archivedUrl: {
        type: String,
        trim: true,
        validate: { validator: isHttpUrl, message: 'Archived URL must use HTTP or HTTPS.' },
      },
    },
    changesDetected: { type: Boolean, default: false },
    changeSummary: { type: String, trim: true, maxlength: 1000 },
    nextReviewAt: Date,
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  baseSchemaOptions,
)

sourceVerificationSchema.index({ entityModel: 1, entity: 1, checkedAt: -1 })
sourceVerificationSchema.index({ status: 1, nextReviewAt: 1 })
sourceVerificationSchema.index({ sourceUrl: 1 })

sourceVerificationSchema.pre('validate', function validateVerification() {
  if (this.status === 'verified' && !this.verifiedAt) {
    this.verifiedAt = new Date()
  }
  if (this.status === 'verified' && !this.verifiedBy) {
    this.invalidate('verifiedBy', 'A verified source requires the administrator who verified it.')
  }
  if (this.verifiedAt && this.checkedAt && this.verifiedAt < this.checkedAt) {
    this.invalidate('verifiedAt', 'Verification time cannot be earlier than the source check.')
  }
})

const SourceVerification =
  mongoose.models.SourceVerification ||
  mongoose.model('SourceVerification', sourceVerificationSchema)

export default SourceVerification
