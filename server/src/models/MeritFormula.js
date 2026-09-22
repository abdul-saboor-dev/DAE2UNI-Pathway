import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'
import sourceInfoSchema from './schemas/sourceInfoSchema.js'

const meritComponentSchema = new Schema({
  key: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z][a-z0-9_]*$/, 'Component key must use snake_case.'],
  },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  inputSource: {
    type: String,
    enum: [
      'matric_percentage',
      'dae_percentage',
      'entry_test_percentage',
      'entry_test_score',
      'interview_percentage',
      'fixed_points',
      'custom_percentage',
    ],
    required: true,
  },
  entryTest: { type: Schema.Types.ObjectId, ref: 'EntryTest' },
  operation: {
    type: String,
    enum: ['weighted_percentage', 'add_points', 'subtract_points'],
    default: 'weighted_percentage',
    required: true,
  },
  weightPercentage: { type: Number, min: 0, max: 100 },
  maximumInput: { type: Number, min: 1 },
  fixedValue: { type: Number, min: 0 },
  capContributionAt: { type: Number, min: 0 },
  required: { type: Boolean, default: true },
  explanation: { type: String, required: true, trim: true, maxlength: 500 },
})

const tieBreakerSchema = new Schema(
  {
    priority: { type: Number, required: true, min: 1 },
    field: {
      type: String,
      enum: ['dae_percentage', 'entry_test_percentage', 'matric_percentage', 'age'],
      required: true,
    },
    direction: { type: String, enum: ['higher', 'lower'], default: 'higher' },
  },
  { _id: false },
)

const meritFormulaSchema = new Schema(
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
    components: {
      type: [meritComponentSchema],
      validate: {
        validator: (components) => components.length > 0,
        message: 'At least one merit component is required.',
      },
    },
    scoreScale: { type: Number, default: 100, min: 1 },
    minimumAggregate: { type: Number, min: 0 },
    rounding: {
      decimalPlaces: { type: Number, default: 2, min: 0, max: 6 },
      mode: {
        type: String,
        enum: ['nearest', 'floor', 'ceil'],
        default: 'nearest',
      },
    },
    tieBreakers: { type: [tieBreakerSchema], default: undefined },
    effectiveFrom: Date,
    effectiveUntil: Date,
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

meritFormulaSchema.index({ code: 1 }, { unique: true })
meritFormulaSchema.index({ university: 1, program: 1, admissionCycle: 1, recordStatus: 1 })

meritFormulaSchema.virtual('weightedTotal').get(function getWeightedTotal() {
  return this.components
    .filter((component) => component.operation === 'weighted_percentage')
    .reduce((total, component) => total + (component.weightPercentage || 0), 0)
})

meritFormulaSchema.pre('validate', function validateFormula() {
  const componentKeys = this.components.map((component) => component.key)
  if (new Set(componentKeys).size !== componentKeys.length) {
    this.invalidate('components', 'Merit component keys must be unique within a formula.')
  }

  for (const component of this.components) {
    const usesFixedPoints = component.inputSource === 'fixed_points'
    const usesPointOperation = ['add_points', 'subtract_points'].includes(component.operation)

    if (usesFixedPoints !== usesPointOperation) {
      component.invalidate(
        'operation',
        'Fixed-point inputs must use an add/subtract operation, and add/subtract operations must use fixed points.',
      )
    }
    if (component.operation === 'weighted_percentage' && component.weightPercentage == null) {
      component.invalidate(
        'weightPercentage',
        'Weighted-percentage components require a weight percentage.',
      )
    }
    if (
      ['entry_test_percentage', 'entry_test_score'].includes(component.inputSource) &&
      !component.entryTest
    ) {
      component.invalidate('entryTest', 'Entry-test components require an entry-test reference.')
    }
    if (component.inputSource === 'entry_test_score' && component.maximumInput == null) {
      component.invalidate('maximumInput', 'Entry-test scores require a maximum input.')
    }
    if (usesPointOperation && component.fixedValue == null) {
      component.invalidate('fixedValue', 'Point additions and deductions require a fixed value.')
    }
  }

  if (this.recordStatus === 'published' && Math.abs(this.weightedTotal - 100) > 0.0001) {
    this.invalidate(
      'components',
      'Published formulas must allocate exactly 100% across weighted components.',
    )
  }
  if (this.minimumAggregate != null && this.minimumAggregate > this.scoreScale) {
    this.invalidate('minimumAggregate', 'Minimum aggregate cannot exceed the score scale.')
  }
  if (this.effectiveFrom && this.effectiveUntil && this.effectiveUntil < this.effectiveFrom) {
    this.invalidate('effectiveUntil', 'Effective-until date must follow effective-from date.')
  }
})

const MeritFormula =
  mongoose.models.MeritFormula || mongoose.model('MeritFormula', meritFormulaSchema)

export default MeritFormula
