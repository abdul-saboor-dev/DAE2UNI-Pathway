import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'

function removeSensitiveFields(_document, returnedObject) {
  delete returnedObject.emailHash
  delete returnedObject.tokenHash
  return returnedObject
}

const passwordResetTokenSchema = new Schema({
  emailHash: { type: String, required: true, select: false, minlength: 64, maxlength: 64 },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  tokenHash: { type: String, select: false, minlength: 64, maxlength: 64 },
  expiresAt: Date,
  sentAt: Date,
  lastAttemptAt: { type: Date, required: true },
  windowStartedAt: { type: Date, required: true },
  requestCount: { type: Number, required: true, min: 1, max: 5 },
  consumedAt: Date,
  purgeAt: { type: Date, required: true },
}, {
  ...baseSchemaOptions,
  toJSON: { transform: removeSensitiveFields },
  toObject: { transform: removeSensitiveFields },
})

passwordResetTokenSchema.index({ emailHash: 1 }, { unique: true })
passwordResetTokenSchema.index({ tokenHash: 1 }, { unique: true, sparse: true })
passwordResetTokenSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 })

const PasswordResetToken = mongoose.models.PasswordResetToken ||
  mongoose.model('PasswordResetToken', passwordResetTokenSchema)

export default PasswordResetToken
