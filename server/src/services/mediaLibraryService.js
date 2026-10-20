import crypto from 'node:crypto'
import mongoose from 'mongoose'
import MediaAsset from '../models/MediaAsset.js'
import MediaUploadIntent from '../models/MediaUploadIntent.js'
import ProgramDiscipline from '../models/ProgramDiscipline.js'
import University from '../models/University.js'
import ApiError from '../utils/ApiError.js'
import { normalizeDisciplineAlias, programDisciplineCandidates } from '../utils/disciplineAliases.js'
import { toAdminDiscipline, toSafeMedia } from '../utils/mediaSerializers.js'
import { cloudinaryMediaProvider as mediaProvider } from './mediaProviderService.js'

async function targetRecord(target, session) {
  if (target.targetType === 'program_discipline') {
    const discipline = await ProgramDiscipline.findById(target.targetId).session(session || null)
    if (!discipline) throw new ApiError(404, 'Program discipline not found.', 'DISCIPLINE_NOT_FOUND')
    return { record: discipline, currentAssetId: discipline.imageMedia, assign(assetId) { discipline.imageMedia = assetId || undefined } }
  }
  const university = await University.findById(target.targetId).session(session || null)
  if (!university) throw new ApiError(404, 'University not found.', 'UNIVERSITY_NOT_FOUND')
  if (target.targetType === 'campus_image') {
    const campus = university.campuses.id(target.campusId)
    if (!campus) throw new ApiError(404, 'Campus not found for this university.', 'CAMPUS_NOT_FOUND')
    return { record: university, currentAssetId: campus.imageMedia, assign(assetId) { campus.imageMedia = assetId || undefined } }
  }
  const field = target.targetType === 'university_logo' ? 'logoMedia' : 'coverMedia'
  return { record: university, currentAssetId: university[field], assign(assetId) { university[field] = assetId || undefined } }
}

function targetFromIntent(intent) {
  return {
    targetType: intent.targetType,
    targetId: intent.targetId.toString(),
    ...(intent.campusId && { campusId: intent.campusId.toString() }),
  }
}

function validateDimensions(targetType, upload) {
  const minimum = targetType === 'university_logo' ? { width: 96, height: 96 } : { width: 480, height: 240 }
  if (upload.width < minimum.width || upload.height < minimum.height) {
    throw new ApiError(400, `Image dimensions must be at least ${minimum.width}×${minimum.height} pixels.`, 'MEDIA_DIMENSIONS_TOO_SMALL')
  }
}

async function referencedAsset(assetId) {
  if (!assetId) return false
  const [university, discipline] = await Promise.all([
    University.exists({ $or: [{ logoMedia: assetId }, { coverMedia: assetId }, { 'campuses.imageMedia': assetId }] }),
    ProgramDiscipline.exists({ imageMedia: assetId }),
  ])
  return Boolean(university || discipline)
}

async function retireAsset(assetId) {
  if (!assetId || await referencedAsset(assetId)) return
  const asset = await MediaAsset.findById(assetId)
  if (!asset) return
  try {
    await mediaProvider.destroyAsset(asset.publicId)
    await asset.deleteOne()
  } catch {
    asset.cleanupStatus = 'pending'
    await asset.save()
  }
}

async function cleanupProviderUpload(intent) {
  try {
    await mediaProvider.destroyAsset(intent.publicId)
    intent.status = 'cancelled'
  } catch {
    intent.status = 'cleanup_pending'
    intent.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
  await intent.save()
}

async function retryPendingCleanup() {
  const [intents, assets] = await Promise.all([
    MediaUploadIntent.find({ status: 'cleanup_pending' }).sort({ updatedAt: 1 }).limit(3),
    MediaAsset.find({ cleanupStatus: 'pending' }).sort({ updatedAt: 1 }).limit(3),
  ])
  for (const intent of intents) await cleanupProviderUpload(intent)
  for (const asset of assets) await retireAsset(asset._id)
}

export async function cleanupDetachedMediaAssets(assetIds = []) {
  for (const assetId of [...new Set(assetIds.filter(Boolean).map(String))]) await retireAsset(assetId)
}

export async function createUploadIntent(userId, target) {
  await retryPendingCleanup()
  await targetRecord(target)
  const publicId = `${mediaProvider.folder()}/${target.targetType}/${crypto.randomUUID()}`
  const intent = await MediaUploadIntent.create({
    requestedBy: userId,
    ...target,
    publicId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  })
  return { intentId: intent._id.toString(), ...mediaProvider.createSignedUpload(publicId, target.targetType) }
}

export async function completeUpload(userId, input) {
  const intent = await MediaUploadIntent.findOne({ _id: input.intentId, requestedBy: userId })
  if (intent?.status === 'completed') {
    const existing = await MediaAsset.findOne({ uploadIntent: intent._id })
    if (existing) return toSafeMedia(existing)
  }
  if (!intent || intent.status !== 'pending' || intent.expiresAt <= new Date()) throw new ApiError(400, 'This upload intent is invalid or expired.', 'INVALID_UPLOAD_INTENT')
  let verifiedUpload
  try {
    verifiedUpload = await mediaProvider.verifyUpload(input, intent.publicId)
    validateDimensions(intent.targetType, verifiedUpload)
  } catch (error) {
    await cleanupProviderUpload(intent)
    throw error
  }
  let oldAssetId
  let createdAsset
  let claimed = false
  try {
    await mongoose.connection.transaction(async (session) => {
      claimed = false
      const activeIntent = await MediaUploadIntent.findOneAndUpdate(
        { _id: intent._id, requestedBy: userId, status: 'pending', expiresAt: { $gt: new Date() } },
        { $set: { status: 'processing' } },
        { new: true, session },
      )
      if (!activeIntent) throw new ApiError(409, 'This upload has already been completed or cancelled.', 'UPLOAD_INTENT_ALREADY_USED')
      claimed = true
      const target = await targetRecord(targetFromIntent(activeIntent), session)
      oldAssetId = target.currentAssetId?.toString()
      ;[createdAsset] = await MediaAsset.create([{
        provider: 'cloudinary', publicId: verifiedUpload.publicId, version: verifiedUpload.version,
        format: verifiedUpload.format, resourceType: verifiedUpload.resourceType, secureUrl: verifiedUpload.secureUrl,
        width: verifiedUpload.width, height: verifiedUpload.height, bytes: verifiedUpload.bytes, checksum: verifiedUpload.checksum,
        uploadIntent: activeIntent._id, uploadedBy: userId,
      }], { session })
      target.assign(createdAsset._id)
      await target.record.save({ session })
      activeIntent.status = 'completed'
      await activeIntent.save({ session })
    })
  } catch (error) {
    const committedIntent = await MediaUploadIntent.findById(intent._id)
    if (committedIntent?.status === 'completed') {
      const existing = await MediaAsset.findOne({ uploadIntent: intent._id })
      if (existing) return toSafeMedia(existing)
    }
    if (claimed) {
      const rolledBackIntent = await MediaUploadIntent.findById(intent._id)
      if (rolledBackIntent?.status === 'pending') await cleanupProviderUpload(rolledBackIntent)
    }
    throw error
  }
  await retireAsset(oldAssetId)
  return toSafeMedia(createdAsset)
}

export async function cancelUpload(userId, intentId) {
  const intent = await MediaUploadIntent.findOne({ _id: intentId, requestedBy: userId, status: 'pending' })
  if (!intent) return
  await cleanupProviderUpload(intent)
}

export async function removeAttachment(target) {
  let oldAssetId
  await mongoose.connection.transaction(async (session) => {
    const resolved = await targetRecord(target, session)
    oldAssetId = resolved.currentAssetId?.toString()
    resolved.assign(null)
    await resolved.record.save({ session })
  })
  await retireAsset(oldAssetId)
}

async function ensureAliasesAvailable(aliases, excludedId) {
  const normalized = [...new Set(aliases.map(normalizeDisciplineAlias).filter(Boolean))]
  const query = { normalizedAliases: { $in: normalized } }
  if (excludedId) query._id = { $ne: excludedId }
  if (await ProgramDiscipline.exists(query)) {
    throw new ApiError(409, 'One or more aliases already belong to another discipline.', 'DISCIPLINE_ALIAS_IN_USE')
  }
}

export async function listProgramDisciplines({ search, page, pageSize }) {
  const query = search ? { $or: [{ name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { aliases: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }] } : {}
  const [records, totalRecords] = await Promise.all([
    ProgramDiscipline.find(query).populate('imageMedia').sort({ name: 1 }).skip((page - 1) * pageSize).limit(pageSize),
    ProgramDiscipline.countDocuments(query),
  ])
  return { disciplines: records.map(toAdminDiscipline), pagination: { page, pageSize, totalRecords, totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)) } }
}

export async function createProgramDiscipline(input) {
  await ensureAliasesAvailable([input.name, ...input.aliases])
  try { return toAdminDiscipline(await ProgramDiscipline.create(input)) }
  catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'The discipline slug or alias is already in use.', 'DISCIPLINE_IN_USE')
    throw error
  }
}

export async function updateProgramDiscipline(id, input) {
  const record = await ProgramDiscipline.findById(id).populate('imageMedia')
  if (!record) throw new ApiError(404, 'Program discipline not found.', 'DISCIPLINE_NOT_FOUND')
  const aliases = [input.name || record.name, ...(input.aliases || record.aliases)]
  await ensureAliasesAvailable(aliases, record._id)
  for (const field of ['name', 'slug', 'aliases']) if (input[field] !== undefined) record[field] = input[field]
  try { await record.save() } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'The discipline slug or alias is already in use.', 'DISCIPLINE_IN_USE')
    throw error
  }
  return toAdminDiscipline(record)
}

export async function deleteProgramDiscipline(id) {
  let assetId
  await mongoose.connection.transaction(async (session) => {
    const record = await ProgramDiscipline.findById(id).session(session)
    if (!record) throw new ApiError(404, 'Program discipline not found.', 'DISCIPLINE_NOT_FOUND')
    assetId = record.imageMedia?.toString()
    await record.deleteOne({ session })
  })
  await retireAsset(assetId)
}

export async function disciplineMediaForPrograms(programs) {
  if (!programs.length) return new Map()
  const keys = [...new Set(programs.flatMap(programDisciplineCandidates))]
  if (!keys.length) return new Map()
  const disciplines = await ProgramDiscipline.find({ normalizedAliases: { $in: keys }, imageMedia: { $exists: true } }).select('+normalizedAliases').populate('imageMedia').lean()
  const aliasMap = new Map()
  for (const discipline of disciplines) for (const alias of discipline.normalizedAliases) aliasMap.set(alias, discipline)
  return new Map(programs.map((program) => {
    const matches = new Map(programDisciplineCandidates(program)
      .map((key) => aliasMap.get(key))
      .filter(Boolean)
      .map((discipline) => [discipline._id.toString(), discipline]))
    // Conflicting explicit identifiers are safer without an image than with a
    // guessed discipline. Administrators can resolve the aliases explicitly.
    const match = matches.size === 1 ? [...matches.values()][0] : null
    return [program._id.toString(), match ? { discipline: match.name, image: toSafeMedia(match.imageMedia) } : null]
  }))
}
