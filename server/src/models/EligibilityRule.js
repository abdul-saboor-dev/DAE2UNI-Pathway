import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions, normalizeUppercaseList } from './schemas/schemaOptions.js'
import sourceInfoSchema from './schemas/sourceInfoSchema.js'

const qualificationCriterionSchema = new Schema({
  qualificationType: {
    type: String,
    enum: ['DAE'],
    default: 'DAE',
    required: true,
  },
  technologyCodes: {
    type: [String],
    default: ['CIT'],
    set: normalizeUppercaseList,
    validate: {
      validator: (values) => values.length > 0,
      message: 'At least one accepted DAE technology code is required.',
    },
  },
  minimumPercentage: { type: Number, min: 0, max: 100 },
  minimumPassingYear: { type: Number, min: 1950, max: 2100 },
  acceptedBoards: { type: [String], default: undefined },
  requiredSubjects: { type: [String], default: undefined },
  equivalenceRequired: { type: Boolean, default: false },
  explanation: { type: String, required: true, trim: true, maxlength: 500 },
})

const conditionSchema = new Schema(
  {
    field: { type: String, required: true, trim: true, maxlength: 120 },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'in', 'not_in', 'gte', 'lte', 'between', 'exists'],
      required: true,
    },
    value: { type: Schema.Types.Mixed, required: true },
    explanation: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false },
)

const conditionGroupSchema = new Schema({
  logic: { type: String, enum: ['all', 'any'], default: 'all', required: true },
  conditions: {
    type: [conditionSchema],
    validate: {
      validator: (conditions) => conditions.length > 0,
      message: 'A condition group must contain at least one condition.',
    },
  },
})

const entryTestRequirementSchema = new Schema({
  entryTest: { type: Schema.Types.ObjectId, ref: 'EntryTest', required: true },
  required: { type: Boolean, default: true },
  minimumScore: { type: Number, min: 0 },
  minimumPercentage: { type: Number, min: 0, max: 100 },
  explanation: { type: String, required: true, trim: true, maxlength: 500 },
})

const eligibilityRuleSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 80,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    university: {
      type: Schema.Types.ObjectId,
      ref: 'University',
      required: true,
    },
    program: { type: Schema.Types.ObjectId, ref: 'Program' },
    admissionCycle: { type: Schema.Types.ObjectId, ref: 'AdmissionCycle' },
    scope: {
      type: String,
      enum: ['university', 'program'],
      default: 'program',
      required: true,
    },
    applicantCategory: {
      type: String,
      enum: ['DAE-CIT'],
      default: 'DAE-CIT',
      required: true,
    },
    qualificationMatchLogic: {
      type: String,
      enum: ['any', 'all'],
      default: 'any',
      required: true,
    },
    qualificationCriteria: {
      type: [qualificationCriterionSchema],
      validate: {
        validator: (criteria) => criteria.length > 0,
        message: 'At least one qualification criterion is required.',
      },
    },
    domicile: {
      allowedProvinces: { type: [String], default: ['Punjab'] },
      allowedDistricts: { type: [String], default: undefined },
      required: { type: Boolean, default: false },
      explanation: { type: String, trim: true, maxlength: 500 },
    },
    conditionGroups: { type: [conditionGroupSchema], default: undefined },
    entryTestRequirements: { type: [entryTestRequirementSchema], default: undefined },
    effectiveFrom: Date,
    effectiveUntil: Date,
    priority: { type: Number, default: 0 },
    source: { type: sourceInfoSchema, required: true },
    recordStatus: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      required: true,
    },
  },
  baseSchemaOptions,
)

eligibilityRuleSchema.index({ code: 1 }, { unique: true })
eligibilityRuleSchema.index({ university: 1, program: 1, admissionCycle: 1, recordStatus: 1 })
eligibilityRuleSchema.index({ applicantCategory: 1, recordStatus: 1 })

eligibilityRuleSchema.pre('validate', function validateRuleScope() {
  if (this.scope === 'program' && !this.program) {
    this.invalidate('program', 'A program-scoped eligibility rule requires a program.')
  }
  if (this.effectiveFrom && this.effectiveUntil && this.effectiveUntil < this.effectiveFrom) {
    this.invalidate('effectiveUntil', 'Effective-until date must follow effective-from date.')
  }
})

const EligibilityRule =
  mongoose.models.EligibilityRule || mongoose.model('EligibilityRule', eligibilityRuleSchema)

export default EligibilityRule
