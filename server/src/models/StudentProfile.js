import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'

const marksSchema = new Schema(
  {
    totalMarks: { type: Number, required: true, min: 1 },
    obtainedMarks: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          return !this.totalMarks || value <= this.totalMarks
        },
        message: 'Obtained marks cannot exceed total marks.',
      },
    },
    percentage: { type: Number, min: 0, max: 100 },
  },
  { _id: false },
)

marksSchema.pre('validate', function calculatePercentage() {
  if (this.totalMarks > 0 && this.obtainedMarks >= 0) {
    this.percentage = Number(((this.obtainedMarks / this.totalMarks) * 100).toFixed(4))
  }
})

const subjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    totalMarks: { type: Number, min: 1 },
    obtainedMarks: { type: Number, min: 0 },
  },
  { _id: false },
)

subjectSchema.path('obtainedMarks').validate(function validateSubjectMarks(value) {
  return value == null || this.totalMarks == null || value <= this.totalMarks
}, 'Subject obtained marks cannot exceed total marks.')

const studentProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    profileStatus: {
      type: String,
      enum: ['draft', 'complete'],
      default: 'draft',
      required: true,
    },
    dae: {
      technologyCode: {
        type: String,
        enum: ['CIT'],
        default: 'CIT',
        required: true,
      },
      technologyName: {
        type: String,
        default: 'Computer Information Technology',
        required: true,
        trim: true,
      },
      boardName: { type: String, trim: true, maxlength: 160 },
      instituteName: { type: String, trim: true, maxlength: 200 },
      registrationNumber: { type: String, trim: true, maxlength: 80 },
      passingYear: { type: Number, min: 1950, max: 2100 },
      marks: { type: marksSchema },
      subjects: { type: [subjectSchema], default: undefined },
    },
    matric: {
      boardName: { type: String, trim: true, maxlength: 160 },
      group: { type: String, trim: true, maxlength: 100 },
      passingYear: { type: Number, min: 1950, max: 2100 },
      marks: { type: marksSchema },
    },
    domicile: {
      province: {
        type: String,
        enum: ['Punjab'],
        default: 'Punjab',
        required: true,
      },
      district: { type: String, trim: true, maxlength: 100 },
    },
    interests: {
      preferredCities: { type: [String], default: undefined },
      preferredDegreeFields: { type: [String], default: undefined },
      preferredUniversitySectors: {
        type: [String],
        enum: ['public', 'private'],
        default: undefined,
      },
    },
    completedAt: Date,
  },
  baseSchemaOptions,
)

studentProfileSchema.index({ user: 1 }, { unique: true })
studentProfileSchema.index({ 'dae.technologyCode': 1, 'dae.marks.percentage': -1 })
studentProfileSchema.pre('validate', function setCompletionDate() {
  if (this.profileStatus === 'complete') {
    const requiredFields = [
      'dae.boardName',
      'dae.instituteName',
      'dae.passingYear',
      'dae.marks.totalMarks',
      'dae.marks.obtainedMarks',
      'matric.boardName',
      'matric.group',
      'matric.passingYear',
      'matric.marks.totalMarks',
      'matric.marks.obtainedMarks',
      'domicile.district',
    ]

    for (const path of requiredFields) {
      const value = this.get(path)
      if (value == null || value === '') {
        this.invalidate(path, `${path} is required when the profile is complete.`)
      }
    }

    if (!this.completedAt) {
      this.completedAt = new Date()
    }
  }
  if (this.profileStatus === 'draft') {
    this.completedAt = undefined
  }
})

const StudentProfile =
  mongoose.models.StudentProfile || mongoose.model('StudentProfile', studentProfileSchema)

export default StudentProfile
