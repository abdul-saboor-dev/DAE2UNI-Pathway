import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'

function removeSensitiveFields(_document, returnedObject) {
  delete returnedObject.passwordHash
  return returnedObject
}

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
      enum: ['student', 'admin'],
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
  },
  {
    ...baseSchemaOptions,
    toJSON: { virtuals: true, transform: removeSensitiveFields },
    toObject: { virtuals: true, transform: removeSensitiveFields },
  },
)

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ role: 1, accountStatus: 1 })
userSchema.virtual('studentProfile', {
  ref: 'StudentProfile',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
})

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
