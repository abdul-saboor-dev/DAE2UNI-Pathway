import AdmissionCycle from '../models/AdmissionCycle.js'
import EligibilityRule from '../models/EligibilityRule.js'
import MeritFormula from '../models/MeritFormula.js'
import Program from '../models/Program.js'
import SourceVerification from '../models/SourceVerification.js'
import University from '../models/University.js'
import ApiError from '../utils/ApiError.js'
import {
  activeCampusIdsForCity,
  literalSearch,
  matchingUniversityIds,
  paginationMeta,
  programSort,
} from '../utils/catalogueQuery.js'
import { toAdminProgram, toPublicProgram } from '../utils/catalogueSerializers.js'
import {
  mergeNestedFields,
  mergeSourceFields,
  setSimpleFields,
} from '../utils/catalogueUpdates.js'

const simpleProgramFields = [
  'university',
  'name',
  'slug',
  'degreeTitle',
  'credentialType',
  'degreeLevel',
  'department',
  'disciplineCode',
  'campusIds',
  'studyMode',
  'recordStatus',
]

async function findUniversity(universityId) {
  const university = await University.findById(universityId)
  if (!university) throw new ApiError(404, 'Referenced university not found.', 'UNIVERSITY_NOT_FOUND')
  return university
}

function ensureCampusIdsBelongToUniversity(university, campusIds = []) {
  const availableIds = new Set(university.campuses.map((campus) => campus._id.toString()))
  if (campusIds.some((campusId) => !availableIds.has(campusId))) {
    throw new ApiError(
      400,
      'Every campus identifier must belong to the referenced university.',
      'INVALID_PROGRAM_CAMPUS',
    )
  }
}

async function ensureUniqueProgramSlug(universityId, slug, excludedId) {
  if (!slug) return
  const query = { university: universityId, slug }
  if (excludedId) query._id = { $ne: excludedId }
  if (await Program.exists(query)) {
    throw new ApiError(
      409,
      'A program with this slug already exists for the university.',
      'PROGRAM_SLUG_IN_USE',
    )
  }
}

async function findProgramDependencies(programId) {
  const [rule, formula, cycle, verification] = await Promise.all([
    EligibilityRule.exists({ program: programId }),
    MeritFormula.exists({ program: programId }),
    AdmissionCycle.exists({
      $or: [
        { 'programOfferings.program': programId },
        { 'deadlines.program': programId },
        { 'entryTestSchedules.programs': programId },
      ],
    }),
    SourceVerification.exists({ entityModel: 'Program', entity: programId }),
  ])

  return { rule, formula, cycle, verification }
}

function dependencyNames({ rule, formula, cycle, verification }, includeVerification = true) {
  return [
    rule && 'eligibility rules',
    formula && 'merit formulas',
    cycle && 'admission cycles',
    includeVerification && verification && 'source-verification history',
  ].filter(Boolean)
}

function adminUniversityPopulate(query) {
  return query.populate({ path: 'university', select: 'name slug abbreviation sector institutionType' })
}

function publicUniversityPopulate(query) {
  return query.populate({
    path: 'university',
    select: 'name slug abbreviation sector institutionType campuses',
  })
}

export async function createProgram(input) {
  const university = await findUniversity(input.university)
  ensureCampusIdsBelongToUniversity(university, input.campusIds)
  await ensureUniqueProgramSlug(university._id, input.slug)

  const program = await Program.create(input)
  await program.populate({ path: 'university', select: 'name slug abbreviation sector institutionType' })
  return toAdminProgram(program)
}

async function buildProgramQuery(filters, publicOnly) {
  const query = {}
  if (filters.search) {
    const search = literalSearch(filters.search)
    query.$or = [{ name: search }, { degreeTitle: search }, { department: search }, { slug: search }]
  }
  if (filters.credentialType) query.credentialType = filters.credentialType
  if (filters.degreeLevel) query.degreeLevel = filters.degreeLevel
  if (filters.studyMode) query.studyMode = filters.studyMode
  if (filters.recordStatus) query.recordStatus = filters.recordStatus
  if (filters.verificationStatus) query['source.verificationStatus'] = filters.verificationStatus

  const universityIds = await matchingUniversityIds(filters, publicOnly)
  query.university = { $in: universityIds }

  if (filters.city) {
    const matchingCampusIds = await activeCampusIdsForCity(universityIds, filters.city)
    query.$and = [{
      $or: [
        { campusIds: { $size: 0 } },
        { campusIds: { $in: matchingCampusIds } },
      ],
    }]
  }

  if (publicOnly) {
    query.recordStatus = 'published'
    query['source.verificationStatus'] = 'verified'
  }
  return query
}

export async function listAdminPrograms(filters) {
  const query = await buildProgramQuery(filters, false)
  const skip = (filters.page - 1) * filters.pageSize
  const [records, totalRecords] = await Promise.all([
    adminUniversityPopulate(
      Program.find(query)
        .sort(programSort(filters.sort))
        .skip(skip)
        .limit(filters.pageSize),
    ).lean(),
    Program.countDocuments(query),
  ])

  return {
    programs: records.map(toAdminProgram),
    pagination: paginationMeta(filters.page, filters.pageSize, totalRecords),
  }
}

export async function getAdminProgram(programId) {
  const program = await adminUniversityPopulate(Program.findById(programId))
  if (!program) throw new ApiError(404, 'Program not found.', 'PROGRAM_NOT_FOUND')
  return toAdminProgram(program)
}

export async function updateProgram(programId, updates) {
  const program = await Program.findById(programId)
  if (!program) throw new ApiError(404, 'Program not found.', 'PROGRAM_NOT_FOUND')

  const universityChanged =
    updates.university && updates.university !== program.university.toString()
  if (universityChanged) {
    const dependencies = dependencyNames(
      await findProgramDependencies(program._id),
      false,
    )
    if (dependencies.length) {
      throw new ApiError(
        409,
        `Program cannot change university while it is referenced by ${dependencies.join(', ')}.`,
        'PROGRAM_UNIVERSITY_CHANGE_CONFLICT',
      )
    }
  }

  const universityId = updates.university || program.university
  const university = await findUniversity(universityId)
  const campusIds = updates.campusIds || program.campusIds.map((campusId) => campusId.toString())
  ensureCampusIdsBelongToUniversity(university, campusIds)

  const slug = updates.slug || program.slug
  if (updates.slug || updates.university) {
    await ensureUniqueProgramSlug(university._id, slug, program._id)
  }

  setSimpleFields(program, updates, simpleProgramFields)
  mergeNestedFields(program, 'duration', updates.duration)
  mergeSourceFields(program, updates.source)
  await program.save()
  await program.populate({ path: 'university', select: 'name slug abbreviation sector institutionType' })
  return toAdminProgram(program)
}

export async function deleteProgram(programId) {
  const program = await Program.findById(programId)
  if (!program) throw new ApiError(404, 'Program not found.', 'PROGRAM_NOT_FOUND')

  const dependencies = dependencyNames(await findProgramDependencies(program._id))

  if (dependencies.length) {
    throw new ApiError(
      409,
      `Program cannot be deleted while it is referenced by ${dependencies.join(', ')}.`,
      'PROGRAM_HAS_DEPENDENCIES',
    )
  }

  await program.deleteOne()
  return { id: program._id.toString() }
}

export async function listPublicPrograms(filters) {
  const query = await buildProgramQuery(filters, true)
  const skip = (filters.page - 1) * filters.pageSize
  const [records, totalRecords] = await Promise.all([
    publicUniversityPopulate(
      Program.find(query)
        .sort(programSort(filters.sort))
        .skip(skip)
        .limit(filters.pageSize),
    ).lean(),
    Program.countDocuments(query),
  ])

  return {
    programs: records.map(toPublicProgram),
    pagination: paginationMeta(filters.page, filters.pageSize, totalRecords),
  }
}

export async function getPublicProgram(programId) {
  const eligibleUniversityIds = await matchingUniversityIds({}, true)
  const program = await publicUniversityPopulate(
    Program.findOne({
      _id: programId,
      university: { $in: eligibleUniversityIds },
      recordStatus: 'published',
      'source.verificationStatus': 'verified',
    }),
  )
  if (!program) throw new ApiError(404, 'Program not found.', 'PROGRAM_NOT_FOUND')
  return toPublicProgram(program)
}
