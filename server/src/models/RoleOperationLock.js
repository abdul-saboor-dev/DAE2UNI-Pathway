import mongoose, { Schema } from 'mongoose'

const schema = new Schema({
  _id: String,
  claimId: { type: String, required: true },
  leaseUntil: { type: Date, required: true },
}, { timestamps: true, versionKey: false })

export default mongoose.models.RoleOperationLock || mongoose.model('RoleOperationLock', schema)
