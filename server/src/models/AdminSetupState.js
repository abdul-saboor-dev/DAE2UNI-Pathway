import mongoose, { Schema } from 'mongoose'

// The singleton is a durable claim, not a secret store. A unique User marker
// fences a claimant that resumes after its lease has expired.
const schema = new Schema({
  _id: String,
  state: { type: String, enum: ['claimed', 'completed'], required: true },
  claimId: String,
  leaseUntil: Date,
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  recoveryClaimId: String,
  recoveryLeaseUntil: Date,
}, { timestamps: true, versionKey: false })

export default mongoose.models.AdminSetupState || mongoose.model('AdminSetupState', schema)
