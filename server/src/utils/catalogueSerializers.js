function identifier(value) {
  return value?.toString()
}

function dateValue(value) {
  return value instanceof Date ? value.toISOString() : value
}

function publicSource(source) {
  return {
    officialUrl: source.officialUrl,
    verificationStatus: source.verificationStatus,
    lastVerifiedAt: dateValue(source.lastVerifiedAt),
  }
}

function adminSource(source) {
  return {
    ...publicSource(source),
    ...(source.verificationRecord && {
      verificationRecord: identifier(source.verificationRecord),
    }),
  }
}

function campus(campusRecord, includeId = false) {
  return {
    ...(includeId && { id: identifier(campusRecord._id || campusRecord.id) }),
    name: campusRecord.name,
    city: campusRecord.city,
    district: campusRecord.district,
    province: campusRecord.province,
    address: campusRecord.address,
    isMainCampus: campusRecord.isMainCampus,
    isActive: campusRecord.isActive,
  }
}

export function toAdminUniversity(university) {
  const record = university.toObject ? university.toObject() : university
  return {
    id: identifier(record._id || record.id),
    name: record.name,
    slug: record.slug,
    abbreviation: record.abbreviation,
    sector: record.sector,
    institutionType: record.institutionType,
    establishedYear: record.establishedYear,
    recognitionBodies: record.recognitionBodies,
    campuses: record.campuses?.map((item) => campus(item, true)),
    contact: record.contact,
    source: adminSource(record.source),
    recordStatus: record.recordStatus,
    createdAt: dateValue(record.createdAt),
    updatedAt: dateValue(record.updatedAt),
  }
}

export function toPublicUniversity(university) {
  const record = university.toObject ? university.toObject() : university
  return {
    id: identifier(record._id || record.id),
    name: record.name,
    slug: record.slug,
    abbreviation: record.abbreviation,
    sector: record.sector,
    institutionType: record.institutionType,
    establishedYear: record.establishedYear,
    recognitionBodies: record.recognitionBodies,
    campuses: record.campuses
      ?.filter((item) => item.isActive)
      .map((item) => campus(item)),
    contact: record.contact,
    source: publicSource(record.source),
  }
}

function populatedUniversity(university, includeCampuses = false) {
  if (!university || typeof university !== 'object' || !university.name) {
    return { id: identifier(university) }
  }

  return {
    id: identifier(university._id || university.id),
    name: university.name,
    slug: university.slug,
    abbreviation: university.abbreviation,
    sector: university.sector,
    institutionType: university.institutionType,
    ...(includeCampuses && {
      campuses: university.campuses
        ?.filter((item) => item.isActive)
        .map((item) => campus(item, true)),
    }),
  }
}

export function toAdminProgram(program) {
  const record = program.toObject ? program.toObject() : program
  return {
    id: identifier(record._id || record.id),
    university: populatedUniversity(record.university),
    name: record.name,
    slug: record.slug,
    degreeTitle: record.degreeTitle,
    credentialType: record.credentialType,
    degreeLevel: record.degreeLevel,
    department: record.department,
    disciplineCode: record.disciplineCode,
    duration: record.duration,
    campusIds: record.campusIds?.map(identifier),
    studyMode: record.studyMode,
    source: adminSource(record.source),
    recordStatus: record.recordStatus,
    createdAt: dateValue(record.createdAt),
    updatedAt: dateValue(record.updatedAt),
  }
}

export function toPublicProgram(program) {
  const record = program.toObject ? program.toObject() : program
  const university = populatedUniversity(record.university, true)
  const campusIds = new Set(record.campusIds?.map(identifier) || [])
  const selectedCampuses = campusIds.size
    ? university.campuses?.filter((item) => campusIds.has(item.id))
    : university.campuses
  const publicCampuses = selectedCampuses?.map((item) => campus(item))

  delete university.campuses

  return {
    id: identifier(record._id || record.id),
    university,
    name: record.name,
    slug: record.slug,
    degreeTitle: record.degreeTitle,
    credentialType: record.credentialType,
    degreeLevel: record.degreeLevel,
    department: record.department,
    disciplineCode: record.disciplineCode,
    duration: record.duration,
    campuses: publicCampuses,
    studyMode: record.studyMode,
    source: publicSource(record.source),
  }
}
