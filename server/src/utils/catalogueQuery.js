import mongoose from 'mongoose'
import University from '../models/University.js'

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function exactCaseInsensitive(value) {
  return new RegExp(`^${escapeRegex(value)}$`, 'i')
}

export function literalSearch(value) {
  return new RegExp(escapeRegex(value), 'i')
}

export function paginationMeta(page, pageSize, totalRecords) {
  return {
    page,
    pageSize,
    totalRecords,
    totalPages: Math.ceil(totalRecords / pageSize),
  }
}

const universitySortFields = {
  name: ['name', 1],
  '-name': ['name', -1],
  establishedYear: ['establishedYear', 1],
  '-establishedYear': ['establishedYear', -1],
  createdAt: ['createdAt', 1],
  '-createdAt': ['createdAt', -1],
  updatedAt: ['updatedAt', 1],
  '-updatedAt': ['updatedAt', -1],
}

const programSortFields = {
  name: ['name', 1],
  '-name': ['name', -1],
  degreeTitle: ['degreeTitle', 1],
  '-degreeTitle': ['degreeTitle', -1],
  createdAt: ['createdAt', 1],
  '-createdAt': ['createdAt', -1],
  updatedAt: ['updatedAt', 1],
  '-updatedAt': ['updatedAt', -1],
}

function stableSort(mapping, requested) {
  const [field, direction] = mapping[requested]
  return { [field]: direction, _id: 1 }
}

export function universitySort(requested) {
  return stableSort(universitySortFields, requested)
}

export function programSort(requested) {
  return stableSort(programSortFields, requested)
}

export async function matchingUniversityIds(filters, publicOnly = false) {
  const query = {}

  if (publicOnly) {
    query.recordStatus = 'published'
    query['source.verificationStatus'] = 'verified'
  }

  if (filters.university) {
    if (mongoose.isObjectIdOrHexString(filters.university)) {
      query._id = filters.university
    } else {
      query.slug = filters.university
    }
  }
  if (filters.city) {
    query.campuses = {
      $elemMatch: { city: exactCaseInsensitive(filters.city), isActive: true },
    }
  }
  if (filters.institutionType) query.institutionType = filters.institutionType

  const universities = await University.find(query).select('_id').lean()
  return universities.map((university) => university._id)
}

export async function activeCampusIdsForCity(universityIds, city) {
  if (!city || universityIds.length === 0) return []

  const cityPattern = exactCaseInsensitive(city)
  const universities = await University.find({
    _id: { $in: universityIds },
    campuses: { $elemMatch: { city: cityPattern, isActive: true } },
  }).select('campuses').lean()

  return universities.flatMap((university) => university.campuses
    .filter((campus) => campus.isActive && cityPattern.test(campus.city))
    .map((campus) => campus._id))
}
