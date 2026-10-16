import mongoose from 'mongoose'
import CatalogueImportRun from '../models/CatalogueImportRun.js'
import Program from '../models/Program.js'
import SourceVerification from '../models/SourceVerification.js'
import University from '../models/University.js'
import { importUniversitySchema } from '../validation/catalogueImportValidation.js'
import ApiError from '../utils/ApiError.js'

const blankTotals = () => ({ created: 0, updated: 0, skipped: 0, conflicted: 0, invalid: 0 })
const blankProgramSummary = () => ({ matchedUniversities: 0, programsToCreate: 0,
  existingProgramsSkipped: 0, missingUniversities: 0, campusConflicts: 0, invalidPrograms: 0 })
const source = (officialUrl) => ({ officialUrl, verificationStatus: 'pending_review' })
const universityFields = ['name', 'slug', 'abbreviation', 'sector', 'institutionType', 'provinceOrTerritory', 'charterAuthority', 'hecProfileUrl']
const programFields = ['name', 'slug', 'degreeTitle', 'credentialType', 'department', 'disciplineCode', 'duration', 'studyMode']

function campusDocument(input, id) {
  return { ...(id && { _id: id }), importKey: input.key, name: input.name, city: input.city,
    province: input.province, district: input.district, address: input.address,
    isMainCampus: input.isMainCampus, isActive: input.isActive }
}

function classifyGroup(group, outcome, message, issues = [], programOutcomes, code) {
  return { universitySlug: group?.slug || null, outcome, message, issues, ...(code && { code }),
    programs: Array.isArray(group?.programs) ? group.programs.map((item, index) => ({ slug: item?.slug || null,
      outcome: programOutcomes?.[index] || outcome })) : [] }
}

function countEntry(totals, entry) {
  if (Object.hasOwn(totals, entry.outcome)) totals[entry.outcome] += 1
  for (const program of entry.programs) if (Object.hasOwn(totals, program.outcome)) totals[program.outcome] += 1
}

function summarizeProgramsOnly(entries) {
  const summary = blankProgramSummary()
  for (const entry of entries) {
    if (entry.outcome === 'matched') summary.matchedUniversities += 1
    if (entry.code === 'MISSING_UNIVERSITY') summary.missingUniversities += 1
    if (entry.code === 'CAMPUS_CONFLICT') {
      summary.campusConflicts += Math.max(1, entry.programs.filter((item) => item.outcome === 'conflicted').length)
    }
    for (const program of entry.programs) {
      if (program.outcome === 'created') summary.programsToCreate += 1
      if (program.outcome === 'skipped') summary.existingProgramsSkipped += 1
      if (program.outcome === 'invalid') summary.invalidPrograms += 1
    }
  }
  return summary
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

async function prepareProgramsOnlyGroup(input) {
  const matches = await University.find({ slug: input.slug }).limit(2)
  if (matches.length === 0) {
    return { outcome: 'conflicted', code: 'MISSING_UNIVERSITY',
      message: 'Programs-only import requires an existing university with this slug.' }
  }
  if (matches.length !== 1) {
    return { outcome: 'conflicted', code: 'AMBIGUOUS_UNIVERSITY',
      message: 'University identity is ambiguous; no programs were planned.' }
  }

  const university = matches[0]
  const current = university.campuses.map((item) => item.toObject())
  const byId = new Map(current.map((item) => [item._id.toString(), item]))
  const keyed = current.filter((item) => item.importKey)
  const byKey = new Map(keyed.map((item) => [item.importKey, item]))
  if (byKey.size !== keyed.length) {
    return { outcome: 'conflicted', code: 'CAMPUS_CONFLICT',
      message: 'Existing campus import keys are ambiguous; no programs were planned.' }
  }

  const resolvedCampusIds = new Map()
  for (const item of input.campuses) {
    const keyMatch = byKey.get(item.key)
    const idMatch = item.id ? byId.get(item.id.toLowerCase()) : null
    if ((item.id && !idMatch) || (!item.id && !keyMatch) ||
      (idMatch && keyMatch && idMatch._id.toString() !== keyMatch._id.toString())) {
      return { outcome: 'conflicted', code: 'CAMPUS_CONFLICT',
        message: 'A submitted campus key or ID does not identify a campus on the matched university.' }
    }
    resolvedCampusIds.set(item.key, (idMatch || keyMatch)._id)
  }

  const existingPrograms = await Program.find({ university: university._id,
    slug: { $in: input.programs.map((item) => item.slug) } })
  const bySlug = new Map(existingPrograms.map((item) => [item.slug, item]))
  const programs = []
  try {
    for (const item of input.programs) {
      const existing = bySlug.get(item.slug)
      if (existing) {
        programs.push({ record: existing, existed: true })
        continue
      }
      const record = new Program({ university: university._id })
      for (const key of programFields) if (item[key] !== undefined) record.set(key, item[key])
      record.set('degreeLevel', 'undergraduate')
      record.set('campusIds', item.campusKeys.map((key) => resolvedCampusIds.get(key)))
      record.set('source', source(item.source.officialUrl))
      record.set('recordStatus', 'draft')
      await record.validate()
      programs.push({ record, existed: false })
    }
  } catch (error) {
    return { outcome: 'invalid', code: 'INVALID_PROGRAM', message: 'A program does not satisfy the catalogue model.',
      issues: Object.values(error.errors || {}).map((item) => ({ path: item.path, message: item.message })) }
  }
  return { outcome: 'matched', university, programs,
    message: 'Existing university matched; university and campuses will remain unchanged.' }
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

async function writeProgramsOnlyGroup(plan, session) {
  const options = session ? { session } : {}
  const created = []
  try {
    for (const item of plan.programs.filter((candidate) => !candidate.existed)) {
      await item.record.save(options)
      created.push(item.record._id)
    }
  } catch (error) {
    if (!session) {
      let rollbackIncomplete = false
      for (const id of created.reverse()) {
        try {
          const result = await Program.deleteOne({ _id: id, recordStatus: 'draft',
            'source.verificationStatus': 'pending_review' })
          if (result.deletedCount !== 1) rollbackIncomplete = true
        } catch { rollbackIncomplete = true }
      }
      if (rollbackIncomplete) throw new Error('IMPORT_ROLLBACK_INCOMPLETE')
    }
    throw error
  }
}

const objectId = (value) => new mongoose.Types.ObjectId(value)
const date = (value) => new Date(value)
const optional = (key, value) => (value === undefined ? {} : { [key]: value })

function restoreSourceDocument(input) {
  return {
    officialUrl: input.officialUrl,
    verificationStatus: input.verificationStatus,
    ...optional('lastVerifiedAt', input.lastVerifiedAt && date(input.lastVerifiedAt)),
    ...optional('verificationRecord', input.verificationRecord && objectId(input.verificationRecord)),
  }
}

function restoreUniversityDocument(input) {
  const campuses = input.campuses.map((campus) => ({
    _id: objectId(campus.id),
    ...optional('importKey', campus.importKey),
    name: campus.name,
    city: campus.city,
    ...optional('district', campus.district),
    province: campus.province,
    ...optional('address', campus.address),
    ...optional('latitude', campus.latitude),
    ...optional('longitude', campus.longitude),
    isMainCampus: campus.isMainCampus,
    isActive: campus.isActive,
  }))
  return {
    _id: objectId(input.id),
    name: input.name,
    slug: input.slug,
    ...optional('abbreviation', input.abbreviation),
    sector: input.sector,
    institutionType: input.institutionType,
    ...optional('establishedYear', input.establishedYear),
    ...optional('recognitionBodies', input.recognitionBodies),
    provinceOrTerritory: input.provinceOrTerritory,
    charterAuthority: input.charterAuthority,
    hecRecognitionStatus: input.hecRecognitionStatus,
    ...optional('hecProfileUrl', input.hecProfileUrl),
    campuses,
    ...optional('contact', input.contact),
    source: restoreSourceDocument(input.source),
    recordStatus: input.recordStatus,
    createdAt: date(input.createdAt),
    updatedAt: date(input.updatedAt),
  }
}

function restoreProgramDocument(input, universityId) {
  return {
    _id: objectId(input.id),
    university: objectId(universityId),
    name: input.name,
    slug: input.slug,
    degreeTitle: input.degreeTitle,
    credentialType: input.credentialType,
    degreeLevel: input.degreeLevel,
    ...optional('department', input.department),
    ...optional('disciplineCode', input.disciplineCode),
    duration: input.duration,
    campusIds: input.campusIds.map(objectId),
    studyMode: input.studyMode,
    source: restoreSourceDocument(input.source),
    recordStatus: input.recordStatus,
    createdAt: date(input.createdAt),
    updatedAt: date(input.updatedAt),
  }
}

function restoreVerificationDocument(input) {
  return {
    _id: objectId(input.id),
    entityModel: input.entityModel,
    entity: objectId(input.entity),
    sourceUrl: input.sourceUrl,
    sourceTitle: input.sourceTitle,
    sourceType: input.sourceType,
    ...optional('documentPublishedAt', input.documentPublishedAt && date(input.documentPublishedAt)),
    checkedAt: date(input.checkedAt),
    verifiedAt: date(input.verifiedAt),
    verifiedBy: objectId(input.verifiedBy),
    status: input.status,
    ...optional('evidence', input.evidence),
    changesDetected: input.changesDetected,
    ...optional('changeSummary', input.changeSummary),
    ...optional('nextReviewAt', input.nextReviewAt && date(input.nextReviewAt)),
    ...optional('notes', input.notes),
    createdAt: date(input.createdAt),
    updatedAt: date(input.updatedAt),
  }
}

function canonical(value) {
  if (value instanceof Date) return value.toISOString()
  if (value instanceof mongoose.Types.ObjectId) return value.toString()
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)]))
  }
  return value
}

function exactDocumentMatch(existing, expected) {
  return JSON.stringify(canonical(existing)) === JSON.stringify(canonical(expected))
}

async function validateRestoreDocuments(universities, programs, verifications) {
  for (const item of universities) await new University(item.document).validate()
  for (const item of programs) await new Program(item.document).validate()
  for (const item of verifications) await new SourceVerification(item.document).validate()
}

function restoreResult(transactionReady) {
  return {
    dryRun: true,
    strategy: 'catalogue_restore',
    totals: blankTotals(),
    entries: [],
    restoreSummary: {
      universitiesToCreate: 0,
      programsToCreate: 0,
      verificationsToCreate: 0,
      exactRecordsToSkip: 0,
      conflicts: 0,
      transactionReady,
    },
  }
}

async function prepareCatalogueRestore(body, transactionReady, session = null) {
  const result = restoreResult(transactionReady)
  const universities = body.universities.map((input) => ({ input, document: restoreUniversityDocument(input) }))
  const programs = body.universities.flatMap((university) => university.programs
    .map((input) => ({ input, university, document: restoreProgramDocument(input, university.id) })))
  const verifications = body.sourceVerifications
    .map((input) => ({ input, document: restoreVerificationDocument(input) }))
  await validateRestoreDocuments(universities, programs, verifications)

  const queryOptions = session ? { session } : {}
  const campusOwners = new Map()
  for (const university of universities) {
    for (const campus of university.input.campuses) campusOwners.set(campus.id.toLowerCase(), university.input.id.toLowerCase())
  }

  for (const item of universities) {
    const collisions = await University.find({ $or: [{ _id: item.document._id }, { slug: item.document.slug }] }, null, queryOptions).lean()
    const foreignCampus = await University.findOne({
      _id: { $ne: item.document._id },
      'campuses._id': { $in: item.document.campuses.map((campus) => campus._id) },
    }, null, queryOptions).lean()
    let outcome = 'created'
    if (foreignCampus || collisions.length > 1 || (collisions.length === 1 && !exactDocumentMatch(collisions[0], item.document))) {
      outcome = 'conflicted'
    } else if (collisions.length === 1) outcome = 'skipped'
    item.outcome = outcome
    result.entries.push({
      universitySlug: item.input.slug,
      outcome,
      message: outcome === 'created' ? 'Exact university record is ready to restore.'
        : outcome === 'skipped' ? 'An exact university record already exists.'
          : 'University ID, slug, campus identity, or stored content conflicts with production.',
      issues: [],
      programs: [],
    })
  }

  for (const item of programs) {
    const collisions = await Program.find({ $or: [
      { _id: item.document._id },
      { university: item.document.university, slug: item.document.slug },
    ] }, null, queryOptions).lean()
    const campusesValid = item.input.campusIds.every((id) => campusOwners.get(id.toLowerCase()) === item.university.id.toLowerCase())
    let outcome = 'created'
    if (!campusesValid || collisions.length > 1 || (collisions.length === 1 && !exactDocumentMatch(collisions[0], item.document))) {
      outcome = 'conflicted'
    } else if (collisions.length === 1) outcome = 'skipped'
    item.outcome = outcome
    const entry = result.entries.find((candidate) => candidate.universitySlug === item.university.slug)
    entry.programs.push({ slug: item.input.slug, outcome })
    if (outcome === 'conflicted' && entry.outcome !== 'conflicted') {
      entry.outcome = 'conflicted'
      entry.message = 'A nested program conflicts with production; the complete restore is blocked.'
    }
  }

  for (const item of verifications) {
    const collisions = await SourceVerification.find({ $or: [
      { _id: item.document._id },
      { entityModel: item.document.entityModel, entity: item.document.entity,
        sourceUrl: item.document.sourceUrl, checkedAt: item.document.checkedAt },
    ] }, null, queryOptions).lean()
    let outcome = 'created'
    if (collisions.length > 1 || (collisions.length === 1 && !exactDocumentMatch(collisions[0], item.document))) outcome = 'conflicted'
    else if (collisions.length === 1) outcome = 'skipped'
    item.outcome = outcome
  }

  const all = [...universities, ...programs, ...verifications]
  result.totals.created = all.filter((item) => item.outcome === 'created').length
  result.totals.skipped = all.filter((item) => item.outcome === 'skipped').length
  result.totals.conflicted = all.filter((item) => item.outcome === 'conflicted').length
  result.restoreSummary.universitiesToCreate = universities.filter((item) => item.outcome === 'created').length
  result.restoreSummary.programsToCreate = programs.filter((item) => item.outcome === 'created').length
  result.restoreSummary.verificationsToCreate = verifications.filter((item) => item.outcome === 'created').length
  result.restoreSummary.exactRecordsToSkip = result.totals.skipped
  result.restoreSummary.conflicts = result.totals.conflicted
  return { result, universities, programs, verifications }
}

async function processCatalogueRestore(body, actorId, dryRun) {
  const transactionReady = await supportsTransactions()
  let plan = await prepareCatalogueRestore(body, transactionReady)
  plan.result.dryRun = dryRun
  if (dryRun || plan.result.totals.conflicted > 0) return plan.result
  if (!transactionReady) {
    throw new ApiError(409, 'Catalogue restore requires a transaction-capable MongoDB deployment.', 'RESTORE_TRANSACTION_REQUIRED')
  }

  const session = await mongoose.startSession()
  let completed
  try {
    await session.withTransaction(async () => {
      const fresh = await prepareCatalogueRestore(body, true, session)
      if (fresh.result.totals.conflicted > 0) {
        throw new ApiError(409, 'Catalogue changed after preview; the complete restore was aborted.', 'RESTORE_CONFLICT')
      }
      const newUniversities = fresh.universities.filter((item) => item.outcome === 'created').map((item) => item.document)
      const newPrograms = fresh.programs.filter((item) => item.outcome === 'created').map((item) => item.document)
      const newVerifications = fresh.verifications.filter((item) => item.outcome === 'created').map((item) => item.document)
      if (newUniversities.length) await University.collection.insertMany(newUniversities, { session, ordered: true })
      if (newPrograms.length) await Program.collection.insertMany(newPrograms, { session, ordered: true })
      if (newVerifications.length) await SourceVerification.collection.insertMany(newVerifications, { session, ordered: true })
      const [run] = await CatalogueImportRun.create([{
        actor: actorId,
        strategy: 'catalogue_restore',
        totals: fresh.result.totals,
      }], { session })
      fresh.result.importRunId = run.id
      fresh.result.dryRun = false
      completed = fresh.result
    })
  } finally {
    await session.endSession()
  }
  return completed
}

async function supportsTransactions() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 })
  return Boolean(hello.setName || hello.msg === 'isdbgrid')
}

export async function processCatalogueImport(body, actorId, dryRun) {
  if (body.strategy === 'catalogue_restore') return processCatalogueRestore(body, actorId, dryRun)
  const result = { dryRun, strategy: body.strategy, totals: blankTotals(), entries: [] }
  const seenSlugs = new Set()
  const plans = []
  for (const raw of body.universities) {
    const parsed = importUniversitySchema.safeParse(raw)
    let entry
    let plan
    if (!parsed.success) {
      entry = classifyGroup(raw, 'invalid', 'Import record failed strict validation.',
        parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })))
    } else if (seenSlugs.has(parsed.data.slug)) {
      entry = classifyGroup(parsed.data, 'invalid', 'University slug occurs more than once in the import.')
    } else {
      seenSlugs.add(parsed.data.slug)
      plan = body.strategy === 'programs_only'
        ? await prepareProgramsOnlyGroup(parsed.data)
        : await prepareGroup(parsed.data, body.strategy)
      const programOutcomes = plan.programs?.map((item) => item.existed
        ? (body.strategy === 'programs_only' ? 'skipped' : 'updated')
        : 'created')
      entry = classifyGroup(parsed.data, plan.outcome, plan.message || (dryRun ? 'Ready for import.' : 'Imported.'),
        plan.issues || [], programOutcomes, plan.code)
    }
    plans.push({ entry, plan, parsed: parsed.success ? parsed.data : null })
  }

  const transactional = dryRun ? false : await supportsTransactions()
  // A run stores responsibility and counts, never the uploaded JSON or credentials.
  const run = dryRun ? null : await CatalogueImportRun.create({ actor: actorId, strategy: body.strategy, totals: blankTotals() })
  for (const item of plans) {
    let { entry } = item
    const { plan, parsed } = item
    const writable = plan && (body.strategy === 'programs_only'
      ? plan.outcome === 'matched' && plan.programs.some((program) => !program.existed)
      : ['created', 'updated'].includes(plan.outcome))
    if (!dryRun && writable) {
      try {
        const write = body.strategy === 'programs_only' ? writeProgramsOnlyGroup : writeGroup
        if (transactional) {
          const session = await mongoose.startSession()
          try { await session.withTransaction(() => write(plan, session)) }
          finally { await session.endSession() }
        } else await write(plan)
      } catch (error) {
        entry = classifyGroup(parsed, 'conflicted', error.message === 'IMPORT_ROLLBACK_INCOMPLETE'
          ? 'A concurrent change prevented complete rollback. Stop importing and review this group manually.'
          : error.code === 11000 ? 'A matching program or university was created concurrently.'
            : 'This group could not be imported; no other group was removed.', [], undefined, 'WRITE_CONFLICT')
      }
    }
    result.entries.push(entry)
    countEntry(result.totals, entry)
  }
  if (body.strategy === 'programs_only') result.programSummary = summarizeProgramsOnly(result.entries)
  if (run) {
    run.totals = result.totals
    await run.save()
    result.importRunId = run.id
  }
  return result
}
