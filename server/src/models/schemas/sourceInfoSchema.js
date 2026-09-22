import { Schema } from 'mongoose'
import { isHttpUrl, verificationStatuses } from './schemaOptions.js'

const sourceInfoSchema = new Schema(
  {
    officialUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isHttpUrl,
        message: 'Official source URL must use HTTP or HTTPS.',
      },
    },
    verificationStatus: {
      type: String,
      enum: verificationStatuses,
      default: 'unverified',
      required: true,
    },
    lastVerifiedAt: {
      type: Date,
      required() {
        return this.verificationStatus === 'verified'
      },
    },
    verificationRecord: {
      type: Schema.Types.ObjectId,
      ref: 'SourceVerification',
    },
  },
  { _id: false },
)

export default sourceInfoSchema
