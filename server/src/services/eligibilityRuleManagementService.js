import AdmissionCycle from '../models/AdmissionCycle.js'
import EligibilityResearch from '../models/EligibilityResearch.js'
import EligibilityRule from '../models/EligibilityRule.js'
import EntryTest from '../models/EntryTest.js'
import Program from '../models/Program.js'
import University from '../models/University.js'
import ApiError from '../utils/ApiError.js'
import { literalSearch, paginationMeta } from '../utils/catalogueQuery.js'

const populate = [
  { path: 'university', select: 'name slug' },
  { path: 'program', select: 'name slug university' },
  { path: 'admissionCycle', select: 'name academicYear intake university' },
  { path: 'eligibilityResearch', select: 'sourceTitle officialSourceUrl reviewedDate researchStatus university program admissionCycle' },
  { path: 'entryTestRequirements.entryTest', select: 'name code scoring source recordStatus' },
]

const sortMap = {
  name: { name: 1, _id: 1 },
  '-name': { name: -1, _id: 1 },
  updatedAt: { updatedAt: 1, _id: 1 },
  '-updatedAt': { updatedAt: -1, _id: 1 },
}

function reference(value) {
  if (!value) return null
  return { id: value._id.toString(), name: value.name, ...(value.slug && { slug: value.slug }) }
}

function serializeSource(source) {
  return {
    officialUrl: source.officialUrl,
    verificationStatus: source.verificationStatus,
    lastVerifiedAt: source.lastVerifiedAt || null,
  }
}

function serializeResearch(research) {
  if (!research) return null
  return {
    id: research._id.toString(),
    sourceTitle: research.sourceTitle,
    officialSourceUrl: research.officialSourceUrl,
    reviewedDate: research.reviewedDate,
    researchStatus: research.researchStatus,
  }
}

function serializeRule(record) {
  return {
    id: record._id.toString(),
    code: record.code,
    name: record.name,
    university: reference(record.university),
    program: reference(record.program),
    admissionCycle: reference(record.admissionCycle),
    eligibilityResearch: serializeResearch(record.eligibilityResearch),
    scope: record.scope,
    applicantCategory: record.applicantCategory,
    qualificationMatchLogic: record.qualificationMatchLogic,
    qualificationCriteria: record.qualificationCriteria.map((item) => ({
      qualificationType: item.qualificationType,
      technologyCodes: item.technologyCodes,
      minimumPercentage: item.minimumPercentage ?? null,
      minimumPassingYear: item.minimumPassingYear ?? null,
      acceptedBoards: item.acceptedBoards || [],
      requiredSubjects: item.requiredSubjects || [],
      equivalenceRequired: item.equivalenceRequired,
      explanation: item.explanation,
    })),
    domicile: {
      allowedProvinces: record.domicile?.allowedProvinces || [],
      allowedDistricts: record.domicile?.allowedDistricts || [],
      required: record.domicile?.required || false,
      explanation: record.domicile?.explanation || '',
    },
    entryTestRequirements: (record.entryTestRequirements || []).map((item) => ({
      id: item._id?.toString(),
      entryTest: item.entryTest ? {
        id: item.entryTest._id.toString(),
        name: item.entryTest.name,
        code: item.entryTest.code,
      } : null,
      required: item.required,
      minimumScore: item.minimumScore ?? null,
      minimumPercentage: item.minimumPercentage ?? null,
      explanation: item.explanation,
    })),
    effectiveFrom: record.effectiveFrom || null,
    effectiveUntil: record.effectiveUntil || null,
    priority: record.priority,
    source: serializeSource(record.source),
    recordStatus: record.recordStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function sameId(left, right) {
  if (!left && !right) return true
  if (!left || !right) return false
  return left.toString() === right.toString()
}

async function validateRelationships(values) {
  if (!await University.exists({ _id: values.university })) {
    throw new ApiError(400, 'Select an existing university.', 'INVALID_UNIVERSITY')
  }
  if (values.scope === 'program') {
    const program = await Program.exists({ _id: values.program, university: values.university })
    if (!program) throw new ApiError(400, 'The selected program must belong to the selected university.', 'PROGRAM_UNIVERSITY_MISMATCH')
  }
  if (values.admissionCycle) {
    const cycleQuery = { _id: values.admissionCycle, university: values.university }
    if (values.scope === 'program') cycleQuery['programOfferings.program'] = values.program
    if (!await AdmissionCycle.exists(cycleQuery)) {
      throw new ApiError(400, 'The admission cycle does not match the selected university and program.', 'ADMISSION_CYCLE_MISMATCH')
    }
  }
  if (values.eligibilityResearch) {
    const research = await EligibilityResearch.findById(values.eligibilityResearch)
      .select('university program admissionCycle researchStatus')
      .lean()
    if (!research || research.researchStatus !== 'verified' ||
        !sameId(research.university, values.university) ||
        !sameId(research.program, values.program) ||
        !sameId(research.admissionCycle, values.admissionCycle)) {
      throw new ApiError(400, 'Linked research must be verified and match the selected university, program, and cycle.', 'ELIGIBILITY_RESEARCH_MISMATCH')
    }
  }
  const testIds = values.entryTestRequirements.map((item) => item.entryTest)
  if (testIds.length) {
    const count = await EntryTest.countDocuments({ _id: { $in: testIds } })
    if (count !== testIds.length) {
      throw new ApiError(400, 'Select valid entry tests.', 'INVALID_ENTRY_TEST')
    }
  }
}

function modelValues(values) {
  return {
    code: values.code,
    name: values.name,
    university: values.university,
    program: values.scope === 'program' ? values.program : undefined,
    admissionCycle: values.admissionCycle || undefined,
    eligibilityResearch: values.eligibilityResearch || undefined,
    scope: values.scope,
    applicantCategory: 'DAE-CIT',
    qualificationMatchLogic: values.qualificationMatchLogic,
    qualificationCriteria: values.qualificationCriteria.map((item) => ({
      ...item,
      minimumPercentage: item.minimumPercentage ?? undefined,
      minimumPassingYear: item.minimumPassingYear ?? undefined,
      acceptedBoards: item.acceptedBoards?.length ? item.acceptedBoards : undefined,
      requiredSubjects: item.requiredSubjects?.length ? item.requiredSubjects : undefined,
    })),
    domicile: {
      ...values.domicile,
      allowedDistricts: values.domicile.allowedDistricts?.length ? values.domicile.allowedDistricts : undefined,
    },
    entryTestRequirements: values.entryTestRequirements.map((item) => ({
      ...item,
      minimumScore: item.minimumScore ?? undefined,
      minimumPercentage: item.minimumPercentage ?? undefined,
    })),
    effectiveFrom: values.effectiveFrom || undefined,
    effectiveUntil: values.effectiveUntil || undefined,
    priority: values.priority,
  }
}

function duplicateError(error) {
  if (error?.code === 11000) throw new ApiError(409, 'Eligibility rule code already exists.', 'DUPLICATE_RULE_CODE')
  throw error
}

export async function listEligibilityRules(query) {
  const filter = {}
  if (query.search) {
    const search = literalSearch(query.search)
    filter.$or = [{ name: search }, { code: search }]
  }
  if (query.recordStatus) filter.recordStatus = query.recordStatus
  const [records, totalRecords] = await Promise.all([
    EligibilityRule.find(filter).populate(populate).sort(sortMap[query.sort])
      .skip((query.page - 1) * query.pageSize).limit(query.pageSize),
    EligibilityRule.countDocuments(filter),
  ])
  return { rules: records.map(serializeRule), pagination: paginationMeta(query.page, query.pageSize, totalRecords) }
}

export async function getEligibilityRule(id) {
  const record = await EligibilityRule.findById(id).populate(populate)
  if (!record) throw new ApiError(404, 'Eligibility rule not found.', 'ELIGIBILITY_RULE_NOT_FOUND')
  return serializeRule(record)
}

export async function getEligibilityRuleOptions(query) {
  const universities = await University.find({}).select('name slug').sort({ name: 1 }).limit(100).lean()
  const programs = query.university
    ? await Program.find({ university: query.university }).select('name slug').sort({ name: 1 }).limit(100).lean()
    : []
  const cycleFilter = query.university ? { university: query.university } : null
  if (cycleFilter && query.program) cycleFilter['programOfferings.program'] = query.program
  const cycles = cycleFilter
    ? await AdmissionCycle.find(cycleFilter).select('name academicYear intake').sort({ academicYear: -1 }).limit(50).lean()
    : []
  const researchFilter = query.university
    ? { university: query.university, researchStatus: 'verified', ...(query.program && { program: query.program }) }
    : null
  const research = researchFilter
    ? await EligibilityResearch.find(researchFilter).select('sourceTitle officialSourceUrl reviewedDate program admissionCycle').sort({ reviewedDate: -1 }).limit(100).lean()
    : []
  const entryTests = await EntryTest.find({}).select('name code source recordStatus scoring').sort({ name: 1 }).limit(100).lean()
  return {
    universities: universities.map(reference),
    programs: programs.map(reference),
    admissionCycles: cycles.map((item) => ({ id: item._id.toString(), name: item.name, academicYear: item.academicYear, intake: item.intake })),
    research: research.map((item) => ({ id: item._id.toString(), sourceTitle: item.sourceTitle, officialSourceUrl: item.officialSourceUrl, reviewedDate: item.reviewedDate, program: item.program.toString(), admissionCycle: item.admissionCycle?.toString() || null })),
    entryTests: entryTests.map((item) => ({ id: item._id.toString(), name: item.name, code: item.code, recordStatus: item.recordStatus, verificationStatus: item.source.verificationStatus, maximumScore: item.scoring?.maximumScore ?? null })),
  }
}

export async function createEligibilityRule(values) {
  await validateRelationships(values)
  try {
    const record = await EligibilityRule.create({
      ...modelValues(values),
      source: { officialUrl: values.officialSourceUrl, verificationStatus: 'pending_review' },
      recordStatus: 'draft',
    })
    await record.populate(populate)
    return serializeRule(record)
  } catch (error) { duplicateError(error) }
}

export async function updateEligibilityRule(id, values) {
  const record = await EligibilityRule.findById(id)
  if (!record) throw new ApiError(404, 'Eligibility rule not found.', 'ELIGIBILITY_RULE_NOT_FOUND')
  if (record.recordStatus !== 'draft') throw new ApiError(409, 'Only draft eligibility rules can be edited.', 'RULE_NOT_DRAFT')
  await validateRelationships(values)
  record.set(modelValues(values))
  record.source.officialUrl = values.officialSourceUrl
  record.source.verificationStatus = 'pending_review'
  record.source.lastVerifiedAt = undefined
  record.source.verificationRecord = undefined
  record.recordStatus = 'draft'
  try {
    await record.save()
    await record.populate(populate)
    return serializeRule(record)
  } catch (error) { duplicateError(error) }
}

export async function deleteEligibilityRule(id) {
  const record = await EligibilityRule.findById(id)
  if (!record) throw new ApiError(404, 'Eligibility rule not found.', 'ELIGIBILITY_RULE_NOT_FOUND')
  if (record.recordStatus !== 'draft') throw new ApiError(409, 'Only draft eligibility rules can be deleted.', 'RULE_NOT_DRAFT')
  await record.deleteOne()
  return { message: 'Draft eligibility rule deleted.' }
}
