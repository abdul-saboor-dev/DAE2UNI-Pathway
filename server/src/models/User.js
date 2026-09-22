import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'

const userSchema = new Schema(
  {
    fullName: {
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
    role: {
      type: String,
      enum: ['student', 'administrator'],
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
  baseSchemaOptions,
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
