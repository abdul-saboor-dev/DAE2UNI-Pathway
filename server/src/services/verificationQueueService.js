import Program from '../models/Program.js'
import SourceVerification from '../models/SourceVerification.js'
import University from '../models/University.js'
import ApiError from '../utils/ApiError.js'
import { literalSearch, paginationMeta } from '../utils/catalogueQuery.js'

const statuses = ['unverified', 'pending_review', 'needs_update', 'unavailable']
const models = { university: University, program: Program }
const modelNames = { university: 'University', program: 'Program' }

function queueItem(record, entityType) {
  return {
    id: record._id.toString(), entityType, name: record.name,
    university: entityType === 'program' ? { id: record.university?._id?.toString(), name: record.university?.name } : undefined,
    slug: record.slug, sourceUrl: record.source?.officialUrl || null,
    verificationStatus: record.source?.verificationStatus || 'unverified',
    lastVerifiedAt: record.source?.lastVerifiedAt || null,
    recordStatus: record.recordStatus, updatedAt: record.updatedAt,
  }
}

export async function listVerificationQueue(filters) {
  const Model = models[filters.entityType]
  const query = { 'source.verificationStatus': filters.verificationStatus || { $in: statuses } }
  if (filters.search) {
    const literal = literalSearch(filters.search)
    query.$or = [{ name: literal }, { slug: literal }]
  }
  const descending = filters.sort.startsWith('-')
  const field = descending ? filters.sort.slice(1) : filters.sort
  const sort = { [field === 'lastVerifiedAt' ? 'source.lastVerifiedAt' : field]: descending ? -1 : 1, _id: 1 }
  let recordsQuery = Model.find(query).sort(sort).skip((filters.page - 1) * filters.pageSize).limit(filters.pageSize)
  if (filters.entityType === 'program') recordsQuery = recordsQuery.populate({ path: 'university', select: 'name' })
  const [records, totalRecords] = await Promise.all([
    recordsQuery.lean(),
    Model.countDocuments(query),
  ])
  return { records: records.map((item) => queueItem(item, filters.entityType)),
    pagination: paginationMeta(filters.page, filters.pageSize, totalRecords) }
}

export async function verifyCatalogueSource(entityType, recordId, input, actorId) {
  try {
    const parsed = new URL(input.officialUrl)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Unsafe URL')
  } catch { throw new ApiError(400, 'A valid official HTTP or HTTPS source is required.', 'INVALID_OFFICIAL_SOURCE') }
  const Model = models[entityType]
  const record = await Model.findById(recordId)
  if (!record) throw new ApiError(404, 'Catalogue record not found.', 'RECORD_NOT_FOUND')
  if (record.source?.verificationStatus === 'verified') {
    throw new ApiError(409, 'This source is already verified. Mark it for review before verifying again.', 'ALREADY_VERIFIED')
  }
  if (record.source?.officialUrl !== input.officialUrl) {
    throw new ApiError(409, 'The official source changed. Refresh the record before verifying.', 'SOURCE_CHANGED')
  }
  const checkedAt = new Date()
  const verification = await SourceVerification.create({
    entityModel: modelNames[entityType], entity: record._id,
    sourceUrl: input.officialUrl, sourceTitle: input.sourceTitle, sourceType: input.sourceType,
    checkedAt, verifiedAt: checkedAt, verifiedBy: actorId, status: 'verified',
  })
  try {
    const updated = await Model.findOneAndUpdate({ _id: record._id,
      'source.officialUrl': input.officialUrl,
      'source.verificationStatus': record.source.verificationStatus },
    { $set: { 'source.verificationStatus': 'verified', 'source.lastVerifiedAt': checkedAt,
      'source.verificationRecord': verification._id } }, { new: true, runValidators: true })
    if (!updated) throw new ApiError(409, 'The source changed during review. Refresh and try again.', 'SOURCE_CHANGED')
    return queueItem(updated, entityType)
  } catch (error) {
    await SourceVerification.deleteOne({ _id: verification._id })
    throw error
  }
}
