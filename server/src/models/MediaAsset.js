import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'

const mediaAssetSchema = new Schema({
  provider: { type: String, enum: ['cloudinary'], required: true },
  publicId: { type: String, required: true, trim: true, maxlength: 255 },
  version: { type: Number, required: true, min: 1 },
  format: { type: String, enum: ['jpg', 'jpeg', 'png', 'webp', 'avif'], required: true },
  resourceType: { type: String, enum: ['image'], default: 'image', required: true },
  secureUrl: { type: String, required: true, trim: true, maxlength: 2048 },
  width: { type: Number, required: true, min: 1, max: 10000 },
  height: { type: Number, required: true, min: 1, max: 10000 },
  bytes: { type: Number, required: true, min: 1, max: 8 * 1024 * 1024 },
  checksum: { type: String, trim: true, maxlength: 128 },
  uploadIntent: { type: Schema.Types.ObjectId, ref: 'MediaUploadIntent', required: true, unique: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cleanupStatus: { type: String, enum: ['active', 'pending'], default: 'active', required: true },
}, baseSchemaOptions)

mediaAssetSchema.index({ provider: 1, publicId: 1 }, { unique: true })

export default mongoose.models.MediaAsset || mongoose.model('MediaAsset', mediaAssetSchema)
