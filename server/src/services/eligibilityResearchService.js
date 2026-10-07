import AdmissionCycle from '../models/AdmissionCycle.js'
import EligibilityResearch from '../models/EligibilityResearch.js'
import Program from '../models/Program.js'
import University from '../models/University.js'
import ApiError from '../utils/ApiError.js'
import { paginationMeta } from '../utils/catalogueQuery.js'

const populate = [
  { path: 'university', select: 'name slug' },
  { path: 'program', select: 'name slug university' },
  { path: 'admissionCycle', select: 'name academicYear intake university' },
  { path: 'createdBy', select: 'name email role' },
  { path: 'reviewedBy', select: 'name email role' },
]

const sortMap = {
  updatedAt: { updatedAt: 1, _id: 1 },
  '-updatedAt': { updatedAt: -1, _id: 1 },
  reviewedDate: { reviewedDate: 1, _id: 1 },
  '-reviewedDate': { reviewedDate: -1, _id: 1 },
}

function reference(value) {
  if (!value) return null
  return { id: value._id.toString(), name: value.name, ...(value.slug && { slug: value.slug }) }
}

function actor(value) {
  if (!value) return null
  return { id: value._id.toString(), name: value.name, email: value.email, role: value.role }
}

function serialize(record) {
  return {
    id: record._id.toString(),
    university: reference(record.university),
    program: reference(record.program),
    admissionCycle: reference(record.admissionCycle),
    researchStatus: record.researchStatus,
    officialSourceUrl: record.officialSourceUrl,
    sourceTitle: record.sourceTitle,
    reviewedDate: record.reviewedDate,
    evidenceNotes: record.evidenceNotes,
    unresolvedItems: record.unresolvedItems,
    createdBy: actor(record.createdBy),
    reviewedBy: actor(record.reviewedBy),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

async function validateRelationships(values) {
  const program = await Program.findOne({ _id: values.program, university: values.university })
    .select('_id university')
    .lean()
  if (!program) {
    throw new ApiError(
      400,
      'The selected program must belong to the selected university.',
      'PROGRAM_UNIVERSITY_MISMATCH',
    )
  }

  if (values.admissionCycle) {
    const cycle = await AdmissionCycle.exists({
      _id: values.admissionCycle,
      university: values.university,
      'programOfferings.program': values.program,
    })
    if (!cycle) {
      throw new ApiError(
        400,
        'The admission cycle must belong to the university and include the selected program.',
        'ADMISSION_CYCLE_MISMATCH',
      )
    }
  }
}

function duplicateError(error) {
  if (error?.code === 11000) {
    throw new ApiError(
      409,
      'Research already exists for this program and admission cycle.',
      'DUPLICATE_ELIGIBILITY_RESEARCH',
    )
  }
  throw error
}

export async function listEligibilityResearch(query) {
  const filter = {}
  if (query.researchStatus) filter.researchStatus = query.researchStatus
  if (query.university) filter.university = query.university
  if (query.program) filter.program = query.program
  const [records, totalRecords] = await Promise.all([
    EligibilityResearch.find(filter)
      .populate(populate)
      .sort(sortMap[query.sort])
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize),
    EligibilityResearch.countDocuments(filter),
  ])
  return {
    records: records.map(serialize),
    pagination: paginationMeta(query.page, query.pageSize, totalRecords),
  }
}

export async function getEligibilityResearch(id) {
  const record = await EligibilityResearch.findById(id).populate(populate)
  if (!record) throw new ApiError(404, 'Eligibility research record not found.', 'RESEARCH_NOT_FOUND')
  return serialize(record)
}

export async function getEligibilityResearchOptions(query) {
  const universities = await University.find({})
    .select('name slug')
    .sort({ name: 1, _id: 1 })
    .limit(100)
    .lean()
  let programs = []
  let admissionCycles = []
  if (query.university) {
    programs = await Program.find({ university: query.university })
      .select('name slug university')
      .sort({ name: 1, _id: 1 })
      .limit(100)
      .lean()
    if (query.program) {
      admissionCycles = await AdmissionCycle.find({
        university: query.university,
        'programOfferings.program': query.program,
      })
        .select('name academicYear intake')
        .sort({ academicYear: -1, _id: 1 })
        .limit(50)
        .lean()
    }
  }
  return {
    universities: universities.map(reference),
    programs: programs.map(reference),
    admissionCycles: admissionCycles.map((cycle) => ({
      id: cycle._id.toString(),
      name: cycle.name,
      academicYear: cycle.academicYear,
      intake: cycle.intake,
    })),
  }
}

export async function createEligibilityResearch(values, actorId) {
  await validateRelationships(values)
  try {
    const record = await EligibilityResearch.create({
      ...values,
      admissionCycle: values.admissionCycle || undefined,
      createdBy: actorId,
      reviewedBy: actorId,
    })
    await record.populate(populate)
    return serialize(record)
  } catch (error) {
    duplicateError(error)
  }
}

export async function updateEligibilityResearch(id, updates, actorId) {
  const record = await EligibilityResearch.findById(id)
  if (!record) throw new ApiError(404, 'Eligibility research record not found.', 'RESEARCH_NOT_FOUND')
  const relationships = {
    university: updates.university ?? record.university,
    program: updates.program ?? record.program,
    admissionCycle:
      updates.admissionCycle !== undefined ? updates.admissionCycle : record.admissionCycle,
  }
  await validateRelationships(relationships)
  for (const key of [
    'university',
    'program',
    'researchStatus',
    'officialSourceUrl',
    'sourceTitle',
    'reviewedDate',
    'evidenceNotes',
    'unresolvedItems',
  ]) {
    if (updates[key] !== undefined) record.set(key, updates[key])
  }
  if (updates.admissionCycle !== undefined) {
    record.set('admissionCycle', updates.admissionCycle || undefined)
  }
  record.reviewedBy = actorId
  try {
    await record.save()
    await record.populate(populate)
    return serialize(record)
  } catch (error) {
    duplicateError(error)
  }
}
