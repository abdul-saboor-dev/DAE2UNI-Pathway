import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'

function removeSensitiveFields(_document, returnedObject) {
  delete returnedObject.passwordHash
  delete returnedObject.ownerMarker
  delete returnedObject.roleAudit
  return returnedObject
}

const roleAuditSchema = new Schema({
  operationId: { type: String, required: true },
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, enum: ['owner', 'co_owner'], required: true },
  target: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['admin_promoted', 'admin_access_revoked', 'co_owner_granted', 'co_owner_access_revoked'], required: true },
  previousRole: { type: String, enum: ['student', 'admin', 'co_owner'], required: true },
  newRole: { type: String, enum: ['student', 'admin', 'co_owner'], required: true },
  occurredAt: { type: Date, required: true },
}, { _id: false })

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
      minlength: 60,
      maxlength: 60,
    },
    role: {
      type: String,
      enum: ['owner', 'co_owner', 'admin', 'student'],
      default: 'student',
      required: true,
    },
    accountStatus: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'archived'],
      default: 'active',
      required: true,
    },
    lastLoginAt: Date,
    ownerMarker: { type: String, enum: ['permanent_owner'], select: false },
    roleAudit: { type: [roleAuditSchema], select: false, default: undefined },
  },
  {
    ...baseSchemaOptions,
    toJSON: { virtuals: true, transform: removeSensitiveFields },
    toObject: { virtuals: true, transform: removeSensitiveFields },
  },
)

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ role: 1, accountStatus: 1 })
userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'owner' } })
userSchema.index({ ownerMarker: 1 }, { unique: true, partialFilterExpression: { ownerMarker: 'permanent_owner' } })
userSchema.pre('validate', function protectOwnerShape(next) {
  if (this.role === 'owner' && (this.ownerMarker !== 'permanent_owner' || this.accountStatus !== 'active')) {
    this.invalidate('role', 'The permanent Owner must be active and carry the protected owner marker.')
  }
  if (this.ownerMarker && this.role !== 'owner') {
    this.invalidate('ownerMarker', 'The protected owner marker cannot belong to another role.')
  }
  next()
})
userSchema.pre('save', async function preventOwnerMutation(next) {
  if (!this.isNew && (this.isModified('role') || this.isModified('accountStatus') || this.isModified('ownerMarker'))) {
    const original = await this.constructor.collection.findOne({ _id: this._id }, { projection: { role: 1, accountStatus: 1, ownerMarker: 1 } })
    if (original?.role === 'owner' || original?.ownerMarker === 'permanent_owner') {
      if (this.role !== original.role || this.accountStatus !== original.accountStatus || this.ownerMarker !== original.ownerMarker) {
        return next(new Error('The permanent Owner role and status cannot be changed.'))
      }
    }
  }
  next()
})
userSchema.virtual('studentProfile', {
  ref: 'StudentProfile',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
})

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
