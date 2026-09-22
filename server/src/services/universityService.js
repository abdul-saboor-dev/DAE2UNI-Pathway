import mongoose from 'mongoose'
import AdmissionCycle from '../models/AdmissionCycle.js'
import EligibilityRule from '../models/EligibilityRule.js'
import MeritFormula from '../models/MeritFormula.js'
import Program from '../models/Program.js'
import SourceVerification from '../models/SourceVerification.js'
import University from '../models/University.js'
import ApiError from '../utils/ApiError.js'
import {
  exactCaseInsensitive,
  literalSearch,
  paginationMeta,
  universitySort,
} from '../utils/catalogueQuery.js'
import {
  toAdminUniversity,
  toPublicUniversity,
} from '../utils/catalogueSerializers.js'
import {
  mergeNestedFields,
  mergeSourceFields,
  setSimpleFields,
} from '../utils/catalogueUpdates.js'

const simpleUniversityFields = [
  'name',
  'slug',
  'abbreviation',
  'sector',
  'institutionType',
  'establishedYear',
  'recognitionBodies',
  'recordStatus',
]

async function ensureUniqueSlug(slug, excludedId) {
  if (!slug) return
  const query = { slug }
  if (excludedId) query._id = { $ne: excludedId }
  if (await University.exists(query)) {
    throw new ApiError(409, 'A university with this slug already exists.', 'UNIVERSITY_SLUG_IN_USE')
  }
}

function normalizedCampuses(document, campuses) {
  const existingIds = new Set(document.campuses.map((campus) => campus._id.toString()))
  const suppliedIds = campuses.map((campus) => campus.id).filter(Boolean)

  if (new Set(suppliedIds).size !== suppliedIds.length) {
    throw new ApiError(400, 'Campus identifiers must be unique.', 'INVALID_CAMPUS_LIST')
  }
  for (const campusId of suppliedIds) {
    if (!existingIds.has(campusId)) {
      throw new ApiError(400, 'A supplied campus does not belong to this university.', 'INVALID_CAMPUS')
    }
  }

  return campuses.map(({ id, ...campus }) => ({ ...campus, ...(id && { _id: id }) }))
}

async function ensureRemovedCampusesAreUnused(universityId, currentCampuses, nextCampuses) {
  const nextIds = new Set(nextCampuses.map((campus) => campus._id?.toString()).filter(Boolean))
  const removedIds = currentCampuses
    .map((campus) => campus._id)
    .filter((campusId) => !nextIds.has(campusId.toString()))

  if (removedIds.length && await Program.exists({ university: universityId, campusIds: { $in: removedIds } })) {
    throw new ApiError(
      409,
      'A campus cannot be removed while a program references it.',
      'CAMPUS_HAS_PROGRAMS',
    )
  }
}

export async function createUniversity(input) {
  await ensureUniqueSlug(input.slug)
  const university = await University.create(input)
  return toAdminUniversity(university)
}

export async function listAdminUniversities(filters) {
  const query = {}
  if (filters.search) {
    const search = literalSearch(filters.search)
    query.$or = [{ name: search }, { abbreviation: search }, { slug: search }]
  }
  if (filters.city) query['campuses.city'] = exactCaseInsensitive(filters.city)
  if (filters.sector) query.sector = filters.sector
  if (filters.institutionType) query.institutionType = filters.institutionType
  if (filters.recordStatus) query.recordStatus = filters.recordStatus
  if (filters.verificationStatus) query['source.verificationStatus'] = filters.verificationStatus

  const skip = (filters.page - 1) * filters.pageSize
  const [records, totalRecords] = await Promise.all([
    University.find(query)
      .sort(universitySort(filters.sort))
      .skip(skip)
      .limit(filters.pageSize)
      .lean(),
    University.countDocuments(query),
  ])

  return {
    universities: records.map(toAdminUniversity),
    pagination: paginationMeta(filters.page, filters.pageSize, totalRecords),
  }
}

export async function getAdminUniversity(universityId) {
  const university = await University.findById(universityId)
  if (!university) throw new ApiError(404, 'University not found.', 'UNIVERSITY_NOT_FOUND')
  return toAdminUniversity(university)
}

export async function updateUniversity(universityId, updates) {
  const university = await University.findById(universityId)
  if (!university) throw new ApiError(404, 'University not found.', 'UNIVERSITY_NOT_FOUND')

  if (updates.slug && updates.slug !== university.slug) {
    await ensureUniqueSlug(updates.slug, university._id)
  }

  setSimpleFields(university, updates, simpleUniversityFields)
  mergeNestedFields(university, 'contact', updates.contact)
  mergeSourceFields(university, updates.source)

  if (updates.campuses) {
    const campuses = normalizedCampuses(university, updates.campuses)
    await ensureRemovedCampusesAreUnused(university._id, university.campuses, campuses)
    university.set('campuses', campuses)
  }

  await university.save()
  return toAdminUniversity(university)
}

export async function deleteUniversity(universityId) {
  const university = await University.findById(universityId)
  if (!university) throw new ApiError(404, 'University not found.', 'UNIVERSITY_NOT_FOUND')

  const [program, cycle, rule, formula, verification] = await Promise.all([
    Program.exists({ university: university._id }),
    AdmissionCycle.exists({ university: university._id }),
    EligibilityRule.exists({ university: university._id }),
    MeritFormula.exists({ university: university._id }),
    SourceVerification.exists({ entityModel: 'University', entity: university._id }),
  ])

  const dependencies = [
    program && 'programs',
    cycle && 'admission cycles',
    rule && 'eligibility rules',
    formula && 'merit formulas',
    verification && 'source-verification history',
  ].filter(Boolean)

  if (dependencies.length) {
    throw new ApiError(
      409,
      `University cannot be deleted while it is referenced by ${dependencies.join(', ')}.`,
      'UNIVERSITY_HAS_DEPENDENCIES',
    )
  }

  await university.deleteOne()
  return { id: university._id.toString() }
}

function publicUniversityQuery(filters = {}) {
  const query = {
    recordStatus: 'published',
    'source.verificationStatus': 'verified',
  }
  if (filters.search) {
    const search = literalSearch(filters.search)
    query.$or = [{ name: search }, { abbreviation: search }, { slug: search }]
  }
  if (filters.city) {
    query.campuses = {
      $elemMatch: { city: exactCaseInsensitive(filters.city), isActive: true },
    }
  }
  if (filters.sector) query.sector = filters.sector
  if (filters.institutionType) query.institutionType = filters.institutionType
  return query
}

export async function listPublicUniversities(filters) {
  const query = publicUniversityQuery(filters)
  const skip = (filters.page - 1) * filters.pageSize
  const [records, totalRecords] = await Promise.all([
    University.find(query)
      .sort(universitySort(filters.sort))
      .skip(skip)
      .limit(filters.pageSize)
      .lean(),
    University.countDocuments(query),
  ])

  return {
    universities: records.map(toPublicUniversity),
    pagination: paginationMeta(filters.page, filters.pageSize, totalRecords),
  }
}

export async function getPublicUniversity(universityIdentifier) {
  const identifierQuery = mongoose.isObjectIdOrHexString(universityIdentifier)
    ? { _id: universityIdentifier }
    : { slug: universityIdentifier }
  const university = await University.findOne({
    ...identifierQuery,
    ...publicUniversityQuery(),
  })
  if (!university) throw new ApiError(404, 'University not found.', 'UNIVERSITY_NOT_FOUND')
  return toPublicUniversity(university)
}
