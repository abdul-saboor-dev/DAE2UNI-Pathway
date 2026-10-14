import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'

const marksSchema = new Schema(
  {
    totalMarks: { type: Number, min: 1 },
    obtainedMarks: {
      type: Number,
      min: 0,
      validate: {
        validator(value) {
          return !this.totalMarks || value <= this.totalMarks
        },
        message: 'Obtained marks cannot exceed total marks.',
      },
    },
    percentage: { type: Number, min: 0, max: 100 },
    status: { type: String, enum: ['provisional', 'final'] },
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

export const DAE_ACADEMIC_STAGES = ['first_year', 'second_year', 'third_year', 'pass_out']

function hasValidMarks(marks) {
  return Number.isFinite(marks?.totalMarks) && marks.totalMarks > 0 &&
    Number.isFinite(marks?.obtainedMarks) && marks.obtainedMarks >= 0 &&
    marks.obtainedMarks <= marks.totalMarks
}

export function inferDaeAcademicStage(dae = {}) {
  if (DAE_ACADEMIC_STAGES.includes(dae.academicStage)) return dae.academicStage
  if (dae.marks?.status === 'final' || hasValidMarks(dae.year3)) return 'pass_out'
  if (hasValidMarks(dae.year2)) return 'third_year'
  if (hasValidMarks(dae.year1)) return 'second_year'
  return 'first_year'
}

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
      academicStage: {
        type: String,
        enum: DAE_ACADEMIC_STAGES,
        required: true,
      },
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
      // Retained for backward compatibility only; no longer accepted or returned by the profile API.
      registrationNumber: { type: String, trim: true, maxlength: 80, select: false },
      passingYear: { type: Number, min: 1950, max: 2100 },
      marks: { type: marksSchema },
      year1: { type: marksSchema },
      year2: { type: marksSchema },
      year3: { type: marksSchema },
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
  if (!this.dae.academicStage) this.dae.academicStage = inferDaeAcademicStage(this.dae)
  const stage = this.dae.academicStage
  const year1 = this.dae?.year1
  const year2 = this.dae?.year2
  const year3 = this.dae?.year3
  const validatePair = (year, path, label) => {
    if ((year?.totalMarks == null) !== (year?.obtainedMarks == null)) {
      this.invalidate(path, `${label} obtained and total marks must be provided together.`)
    }
  }
  validatePair(year1, 'dae.year1', 'DAE Year 1')
  validatePair(year2, 'dae.year2', 'DAE Year 2')
  validatePair(year3, 'dae.year3', 'DAE Year 3')

  if (stage === 'pass_out' && hasValidMarks(this.dae.marks)) {
    this.dae.marks.status = 'final'
  } else if (stage === 'pass_out' && hasValidMarks(year1) && hasValidMarks(year2) && hasValidMarks(year3)) {
    this.dae.marks = {
      totalMarks: year1.totalMarks + year2.totalMarks + year3.totalMarks,
      obtainedMarks: year1.obtainedMarks + year2.obtainedMarks + year3.obtainedMarks,
      status: 'final',
    }
  }
  if (this.profileStatus === 'complete') {
    const requiredFields = [
      'dae.academicStage',
      'dae.boardName',
      'dae.instituteName',
      'matric.boardName',
      'matric.group',
      'matric.passingYear',
      'matric.marks.totalMarks',
      'matric.marks.obtainedMarks',
      'domicile.district',
    ]

    if (stage === 'second_year' || stage === 'third_year') {
      requiredFields.push('dae.year1.totalMarks', 'dae.year1.obtainedMarks')
    }
    if (stage === 'third_year') {
      requiredFields.push('dae.year2.totalMarks', 'dae.year2.obtainedMarks')
    }
    if (stage === 'pass_out') {
      requiredFields.push(
        'dae.passingYear',
        'dae.marks.totalMarks',
        'dae.marks.obtainedMarks',
      )
    }

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
