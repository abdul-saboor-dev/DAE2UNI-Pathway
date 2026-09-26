import mongoose, { Schema } from 'mongoose'

const emailVerificationTokenSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  tokenHash: { type: String, required: true, select: false, match: /^[a-f0-9]{64}$/ },
  expiresAt: { type: Date, required: true },
  sentAt: Date,
  lastAttemptAt: { type: Date, required: true },
  windowStartedAt: { type: Date, required: true },
  sendCount: { type: Number, required: true, min: 1, max: 5 },
  consumedAt: Date,
  purgeAt: { type: Date, required: true },
}, { timestamps: true, versionKey: false })

emailVerificationTokenSchema.index({ user: 1 }, { unique: true })
emailVerificationTokenSchema.index({ tokenHash: 1 }, { unique: true })
emailVerificationTokenSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 })

const EmailVerificationToken = mongoose.models.EmailVerificationToken ||
  mongoose.model('EmailVerificationToken', emailVerificationTokenSchema)

export default EmailVerificationToken
