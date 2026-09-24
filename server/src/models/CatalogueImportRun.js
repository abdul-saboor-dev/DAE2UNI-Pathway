import mongoose, { Schema } from 'mongoose'

const schema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  strategy: { type: String, enum: ['skip', 'update_drafts'], required: true },
  totals: {
    created: { type: Number, required: true },
    updated: { type: Number, required: true },
    skipped: { type: Number, required: true },
    conflicted: { type: Number, required: true },
    invalid: { type: Number, required: true },
  },
}, { timestamps: true, versionKey: false })

schema.index({ actor: 1, createdAt: -1 })
export default mongoose.models.CatalogueImportRun || mongoose.model('CatalogueImportRun', schema)
