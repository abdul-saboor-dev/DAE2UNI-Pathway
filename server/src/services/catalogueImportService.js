import mongoose from 'mongoose'
import CatalogueImportRun from '../models/CatalogueImportRun.js'
import Program from '../models/Program.js'
import University from '../models/University.js'
import { importUniversitySchema } from '../validation/catalogueImportValidation.js'

const blankTotals = () => ({ created: 0, updated: 0, skipped: 0, conflicted: 0, invalid: 0 })
const source = (officialUrl) => ({ officialUrl, verificationStatus: 'pending_review' })
const universityFields = ['name', 'slug', 'abbreviation', 'sector', 'institutionType', 'provinceOrTerritory', 'charterAuthority', 'hecProfileUrl']
const programFields = ['name', 'slug', 'degreeTitle', 'credentialType', 'department', 'disciplineCode', 'duration', 'studyMode']

function campusDocument(input, id) {
  return { ...(id && { _id: id }), importKey: input.key, name: input.name, city: input.city,
    province: input.province, district: input.district, address: input.address,
    isMainCampus: input.isMainCampus, isActive: input.isActive }
}

function classifyGroup(group, outcome, message, issues = [], programOutcomes) {
  return { universitySlug: group?.slug || null, outcome, message, issues,
    programs: Array.isArray(group?.programs) ? group.programs.map((item, index) => ({ slug: item?.slug || null,
      outcome: programOutcomes?.[index] || outcome })) : [] }
}

function countEntry(totals, entry) {
  totals[entry.outcome] += 1
  for (const program of entry.programs) totals[program.outcome] += 1
}

function safeDraft(record) {
  return record.recordStatus === 'draft' && record.source?.verificationStatus !== 'verified' &&
    record.hecRecognitionStatus !== 'recognized'
}

async function prepareGroup(input, strategy) {
  const existing = await University.findOne({ slug: input.slug })
  if (existing && strategy === 'skip') return { outcome: 'skipped', message: 'Matching university skipped by strategy.' }
  if (existing && !safeDraft(existing)) return { outcome: 'conflicted', message: 'Published or verified university cannot be overwritten by import.' }
  if (!existing && input.campuses.some((item) => item.id)) return { outcome: 'invalid', message: 'New universities cannot supply campus IDs.' }

  const university = existing || new University()
  for (const key of universityFields) if (input[key] !== undefined) university.set(key, input[key])
  if (!existing) university.set('hecRecognitionStatus', 'unverified')
  university.set('source', source(input.source.officialUrl))
  university.set('recordStatus', 'draft')

  const current = existing?.campuses.map((item) => item.toObject()) || []
  const byId = new Map(current.map((item) => [item._id.toString(), item]))
  const byKey = new Map(current.filter((item) => item.importKey).map((item) => [item.importKey, item]))
  if (byKey.size !== current.filter((item) => item.importKey).length) {
    return { outcome: 'conflicted', message: 'Existing campus import keys are ambiguous.' }
  }
  const selectedIds = new Set()
  const merged = [...current]
  for (const item of input.campuses) {
    const byExplicitId = item.id && byId.get(item.id.toLowerCase())
    if (item.id && !byExplicitId) return { outcome: 'invalid', message: 'A campus ID does not belong to the matching university.' }
    const byStableKey = byKey.get(item.key)
    if (byExplicitId && byStableKey && byExplicitId._id.toString() !== byStableKey._id.toString()) {
      return { outcome: 'conflicted', message: 'Campus key and ID identify different existing campuses.' }
    }
    const matched = byExplicitId || byStableKey
    const id = matched?._id || new mongoose.Types.ObjectId()
    if (selectedIds.has(id.toString())) return { outcome: 'invalid', message: 'An existing campus was selected more than once.' }
    selectedIds.add(id.toString())
    const next = campusDocument(item, id)
    const index = merged.findIndex((candidate) => candidate._id.toString() === id.toString())
    if (index < 0) merged.push(next)
    else merged[index] = { ...merged[index], ...next }
  }
  university.set('campuses', merged)
  const campusIds = new Map(university.campuses.filter((item) => item.importKey).map((item) => [item.importKey, item._id]))

  const existingPrograms = existing ? await Program.find({ university: existing._id, slug: { $in: input.programs.map((item) => item.slug) } }) : []
  const bySlug = new Map(existingPrograms.map((item) => [item.slug, item]))
  if (existingPrograms.some((item) => !safeDraft(item))) {
    return { outcome: 'conflicted', message: 'Published or verified program cannot be overwritten by import.' }
  }
  const programs = []
  for (const item of input.programs) {
    const record = bySlug.get(item.slug) || new Program()
    record.set('university', university._id)
    for (const key of programFields) if (item[key] !== undefined) record.set(key, item[key])
    record.set('degreeLevel', 'undergraduate')
    record.set('campusIds', item.campusKeys.map((key) => campusIds.get(key)))
    record.set('source', source(item.source.officialUrl))
    record.set('recordStatus', 'draft')
    programs.push({ record, existed: Boolean(bySlug.get(item.slug)) })
  }
  try {
    await university.validate()
    for (const item of programs) await item.record.validate()
  } catch (error) {
    return { outcome: 'invalid', message: 'Record does not satisfy the catalogue model.',
      issues: Object.values(error.errors || {}).map((item) => ({ path: item.path, message: item.message })) }
  }
  return { outcome: existing ? 'updated' : 'created', university, existed: Boolean(existing), programs }
}

async function writeGroup(plan, session) {
  const options = session ? { session } : {}
  const before = session ? null : {
    university: plan.existed ? await University.collection.findOne({ _id: plan.university._id }) : null,
    programs: await Promise.all(plan.programs.filter((item) => item.existed)
      .map((item) => Program.collection.findOne({ _id: item.record._id }))),
  }
  const saved = []
  async function writeRecord(model, record, existed) {
    if (!existed) {
      await record.save(options)
      saved.push({ model, id: record._id, afterUpdatedAt: record.updatedAt })
      return
    }
    // The database predicate, rather than the earlier preview/plan, prevents a
    // concurrent publisher or verifier from being silently overwritten.
    const filter = { _id: record._id, recordStatus: 'draft', 'source.verificationStatus': { $ne: 'verified' } }
    if (model === University) filter.hecRecognitionStatus = { $ne: 'recognized' }
    const replacement = record.toObject({ virtuals: false })
    replacement.updatedAt = new Date()
    const written = await model.collection.replaceOne(filter, replacement, options)
    if (written.matchedCount !== 1) throw new Error('STALE_IMPORT_TARGET')
    saved.push({ model, id: record._id, afterUpdatedAt: replacement.updatedAt })
  }
  try {
    await writeRecord(University, plan.university, plan.existed)
    for (const item of plan.programs) {
      await writeRecord(Program, item.record, item.existed)
    }
  } catch (error) {
    if (!session) {
      // Standalone MongoDB has no transactions. Restore only this group's exact
      // snapshots, and do not erase a concurrent edit made after our write.
      let rollbackIncomplete = false
      for (const item of saved.reverse()) {
        const snapshot = item.model === University ? before.university : before.programs.find((record) => record?._id.equals(item.id))
        try {
          const guard = { _id: item.id, updatedAt: item.afterUpdatedAt,
            recordStatus: 'draft', 'source.verificationStatus': { $ne: 'verified' } }
          if (item.model === University) guard.hecRecognitionStatus = { $ne: 'recognized' }
          const result = snapshot ? await item.model.collection.replaceOne(guard, snapshot) : await item.model.collection.deleteOne(guard)
          if (!(result.matchedCount || result.deletedCount)) rollbackIncomplete = true
        } catch { rollbackIncomplete = true }
      }
      if (rollbackIncomplete) throw new Error('IMPORT_ROLLBACK_INCOMPLETE')
    }
    throw error
  }
}

async function supportsTransactions() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 })
  return Boolean(hello.setName || hello.msg === 'isdbgrid')
}

export async function processCatalogueImport(body, actorId, dryRun) {
  const result = { dryRun, strategy: body.strategy, totals: blankTotals(), entries: [] }
  const seenSlugs = new Set()
  const transactional = dryRun ? false : await supportsTransactions()
  // A run stores responsibility and counts, never the uploaded JSON or credentials.
  const run = dryRun ? null : await CatalogueImportRun.create({ actor: actorId, strategy: body.strategy, totals: blankTotals() })
  for (const raw of body.universities) {
    const parsed = importUniversitySchema.safeParse(raw)
    let entry
    if (!parsed.success) {
      entry = classifyGroup(raw, 'invalid', 'Import record failed strict validation.',
        parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })))
    } else if (seenSlugs.has(parsed.data.slug)) {
      entry = classifyGroup(parsed.data, 'invalid', 'University slug occurs more than once in the import.')
    } else {
      seenSlugs.add(parsed.data.slug)
      const plan = await prepareGroup(parsed.data, body.strategy)
      entry = classifyGroup(parsed.data, plan.outcome, plan.message || (dryRun ? 'Ready for import.' : 'Imported.'), [],
        plan.programs?.map((item) => item.existed ? 'updated' : 'created'))
      if (!dryRun && ['created', 'updated'].includes(plan.outcome)) {
        try {
          if (transactional) {
            const session = await mongoose.startSession()
            try { await session.withTransaction(() => writeGroup(plan, session)) }
            finally { await session.endSession() }
          } else await writeGroup(plan)
        } catch (error) {
          entry = classifyGroup(parsed.data, 'conflicted', error.message === 'IMPORT_ROLLBACK_INCOMPLETE'
            ? 'A concurrent change prevented complete rollback. Stop importing and review this group manually.'
            : error.code === 11000 ? 'A matching slug was created concurrently.'
              : 'This group could not be imported; no other group was removed.')
        }
      }
    }
    result.entries.push(entry)
    countEntry(result.totals, entry)
  }
  if (run) {
    run.totals = result.totals
    await run.save()
    result.importRunId = run.id
  }
  return result
}
