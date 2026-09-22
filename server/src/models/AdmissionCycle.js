import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions, isHttpUrl } from './schemas/schemaOptions.js'
import sourceInfoSchema from './schemas/sourceInfoSchema.js'

const programOfferingSchema = new Schema({
  program: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  applicationOpensAt: Date,
  applicationDeadlineAt: Date,
  seatCount: { type: Number, min: 0 },
  status: {
    type: String,
    enum: ['announced', 'open', 'closed', 'cancelled'],
    default: 'announced',
  },
})

const deadlineSchema = new Schema({
  type: {
    type: String,
    enum: [
      'application_open',
      'application_close',
      'fee_submission',
      'document_submission',
      'entry_test',
      'merit_list',
      'classes_begin',
      'other',
    ],
    required: true,
  },
  label: { type: String, required: true, trim: true, maxlength: 160 },
  date: { type: Date, required: true },
  program: { type: Schema.Types.ObjectId, ref: 'Program' },
  notes: { type: String, trim: true, maxlength: 500 },
})

const entryTestScheduleSchema = new Schema({
  entryTest: { type: Schema.Types.ObjectId, ref: 'EntryTest', required: true },
  registrationOpensAt: Date,
  registrationDeadlineAt: Date,
  testDate: Date,
  resultDate: Date,
  programs: [{ type: Schema.Types.ObjectId, ref: 'Program' }],
})

const admissionCycleSchema = new Schema(
  {
    university: {
      type: Schema.Types.ObjectId,
      ref: 'University',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}(?:-\d{4})?$/, 'Academic year must be YYYY or YYYY-YYYY.'],
    },
    intake: {
      type: String,
      enum: ['spring', 'summer', 'fall', 'annual'],
      required: true,
    },
    applicationUrl: {
      type: String,
      trim: true,
      validate: { validator: isHttpUrl, message: 'Application URL must use HTTP or HTTPS.' },
    },
    applicationWindow: {
      opensAt: Date,
      closesAt: Date,
    },
    programOfferings: {
      type: [programOfferingSchema],
      validate: {
        validator: (offerings) => offerings.length > 0,
        message: 'At least one program offering is required.',
      },
    },
    deadlines: { type: [deadlineSchema], default: undefined },
    entryTestSchedules: { type: [entryTestScheduleSchema], default: undefined },
    source: { type: sourceInfoSchema, required: true },
    cycleStatus: {
      type: String,
      enum: ['draft', 'upcoming', 'open', 'closed', 'completed', 'cancelled'],
      default: 'draft',
      required: true,
    },
  },
  baseSchemaOptions,
)

admissionCycleSchema.index({ university: 1, academicYear: 1, intake: 1 }, { unique: true })
admissionCycleSchema.index({ cycleStatus: 1, 'applicationWindow.closesAt': 1 })
admissionCycleSchema.index({ 'programOfferings.program': 1, cycleStatus: 1 })

admissionCycleSchema.pre('validate', function validateCycleDates() {
  if (
    this.applicationWindow?.opensAt &&
    this.applicationWindow?.closesAt &&
    this.applicationWindow.closesAt < this.applicationWindow.opensAt
  ) {
    this.invalidate(
      'applicationWindow.closesAt',
      'Application closing date must follow opening date.',
    )
  }

  const programIds = this.programOfferings
    .map((offering) => offering.program?.toString())
    .filter(Boolean)
  if (new Set(programIds).size !== programIds.length) {
    this.invalidate('programOfferings', 'A program can appear only once in an admission cycle.')
  }

  for (const offering of this.programOfferings) {
    if (
      offering.applicationOpensAt &&
      offering.applicationDeadlineAt &&
      offering.applicationDeadlineAt < offering.applicationOpensAt
    ) {
      offering.invalidate(
        'applicationDeadlineAt',
        'Program application deadline must follow its opening date.',
      )
    }
  }

  for (const schedule of this.entryTestSchedules || []) {
    if (
      schedule.registrationOpensAt &&
      schedule.registrationDeadlineAt &&
      schedule.registrationDeadlineAt < schedule.registrationOpensAt
    ) {
      schedule.invalidate(
        'registrationDeadlineAt',
        'Entry-test registration deadline must follow its opening date.',
      )
    }
    if (schedule.testDate && schedule.resultDate && schedule.resultDate < schedule.testDate) {
      schedule.invalidate('resultDate', 'Entry-test result date must follow the test date.')
    }
  }
})

const AdmissionCycle =
  mongoose.models.AdmissionCycle || mongoose.model('AdmissionCycle', admissionCycleSchema)

export default AdmissionCycle
