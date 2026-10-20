import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'

const mediaUploadIntentSchema = new Schema({
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: {
    type: String,
    enum: ['university_logo', 'university_cover', 'campus_image', 'program_discipline'],
    required: true,
  },
  targetId: { type: Schema.Types.ObjectId, required: true },
  campusId: { type: Schema.Types.ObjectId },
  publicId: { type: String, required: true, unique: true, maxlength: 255 },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'processing', 'cleanup_pending', 'completed', 'cancelled'], default: 'pending', required: true },
}, baseSchemaOptions)

mediaUploadIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 })

export default mongoose.models.MediaUploadIntent || mongoose.model('MediaUploadIntent', mediaUploadIntentSchema)
