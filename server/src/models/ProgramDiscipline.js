import mongoose, { Schema } from 'mongoose'
import { baseSchemaOptions } from './schemas/schemaOptions.js'
import { normalizeDisciplineAlias } from '../utils/disciplineAliases.js'

const programDisciplineSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  aliases: { type: [String], required: true, validate: (values) => values.length > 0 && values.length <= 30 },
  normalizedAliases: { type: [String], required: true, select: false },
  imageMedia: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
}, baseSchemaOptions)

programDisciplineSchema.pre('validate', function normalizeAliases() {
  const aliases = [...new Set([this.name, ...(this.aliases || [])].map((value) => value?.trim()).filter(Boolean))]
  const normalized = aliases.map(normalizeDisciplineAlias).filter(Boolean)
  this.aliases = aliases
  this.normalizedAliases = normalized
  if (new Set(normalized).size !== normalized.length) {
    this.invalidate('aliases', 'Discipline aliases must be unique after normalization.')
  }
})

programDisciplineSchema.index({ slug: 1 }, { unique: true })
programDisciplineSchema.index({ normalizedAliases: 1 }, { unique: true })

export default mongoose.models.ProgramDiscipline || mongoose.model('ProgramDiscipline', programDisciplineSchema)
