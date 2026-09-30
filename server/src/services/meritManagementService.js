import AdmissionCycle from '../models/AdmissionCycle.js'
import EligibilityRule from '../models/EligibilityRule.js'
import EntryTest from '../models/EntryTest.js'
import MeritFormula from '../models/MeritFormula.js'
import Program from '../models/Program.js'
import University from '../models/University.js'
import ApiError from '../utils/ApiError.js'
import { literalSearch, paginationMeta } from '../utils/catalogueQuery.js'
import { mergeSourceFields, setSimpleFields } from '../utils/catalogueUpdates.js'
import { serializeEntryTest, serializeMeritFormula } from '../utils/meritSerializers.js'

const sortMap = {
  name: { name: 1, _id: 1 },
  '-name': { name: -1, _id: 1 },
  updatedAt: { updatedAt: 1, _id: 1 },
  '-updatedAt': { updatedAt: -1, _id: 1 },
}

function duplicateError(error, label) {
  if (error?.code === 11000) throw new ApiError(409, `${label} code already exists.`, 'DUPLICATE_RECORD')
  throw error
}

function baseFilter(query) {
  const filter = {}
  if (query.search) {
    const search = literalSearch(query.search)
    filter.$or = [{ name: search }, { code: search }]
  }
  if (query.recordStatus) filter.recordStatus = query.recordStatus
  if (query.verificationStatus) filter['source.verificationStatus'] = query.verificationStatus
  if (query.university) filter.university = query.university
  return filter
}

function modelComponents(items) {
  const mapping = {
    matric: ['matric', 'matric_percentage', 'Student Matric percentage multiplied by its configured weight.'],
    dae: ['dae', 'dae_percentage', 'Student DAE percentage multiplied by its configured weight.'],
    entry_test: ['entry_test', 'entry_test_percentage', 'Student entry-test percentage multiplied by its configured weight.'],
  }
  return items.map((item) => {
    const [key, inputSource, explanation] = mapping[item.basis]
    return {
      key,
      label: item.label,
      inputSource,
      operation: 'weighted_percentage',
      weightPercentage: item.weightPercentage,
      required: true,
      explanation,
      ...(item.entryTest ? { entryTest: item.entryTest } : {}),
    }
  })
}

function sameInstant(left, right) {
  if (left == null && right == null) return true
  if (left == null || right == null) return false
  return new Date(left).getTime() === new Date(right).getTime()
}

function mergeChangedSource(record, updates) {
  if (!updates) return
  const changed =
    (updates.officialUrl !== undefined && updates.officialUrl !== record.get('source.officialUrl')) ||
    (updates.verificationStatus !== undefined && updates.verificationStatus !== record.get('source.verificationStatus')) ||
    (updates.lastVerifiedAt !== undefined && !sameInstant(updates.lastVerifiedAt, record.get('source.lastVerifiedAt')))
  if (changed) mergeSourceFields(record, updates)
}

async function verifyFormulaRelations(values) {
  const university = await University.exists({ _id: values.university })
  if (!university) throw new ApiError(400, 'Select an existing university.', 'INVALID_UNIVERSITY')

  if (values.program) {
    const program = await Program.findById(values.program).select('university').lean()
    if (!program || program.university.toString() !== values.university.toString()) {
      throw new ApiError(400, 'The selected program must belong to the selected university.', 'PROGRAM_UNIVERSITY_MISMATCH')
    }
  }

  if (values.admissionCycle) {
    const cycle = await AdmissionCycle.findById(values.admissionCycle).select('university').lean()
    if (!cycle || cycle.university.toString() !== values.university.toString()) {
      throw new ApiError(400, 'The admission cycle must belong to the selected university.', 'CYCLE_UNIVERSITY_MISMATCH')
    }
  }

  const testIds = values.components.filter((item) => item.entryTest).map((item) => item.entryTest)
  if (testIds.length) {
    const count = await EntryTest.countDocuments({ _id: { $in: testIds } })
    if (count !== new Set(testIds).size) {
      throw new ApiError(400, 'Select valid entry tests for all entry-test components.', 'INVALID_ENTRY_TEST')
    }
  }
}

const formulaPopulate = [
  { path: 'university', select: 'name' },
  { path: 'program', select: 'name' },
  { path: 'admissionCycle', select: 'name' },
  { path: 'components.entryTest', select: 'name code' },
]

export async function listEntryTests(query) {
  const filter = baseFilter(query)
  delete filter.university
  const [records, totalRecords] = await Promise.all([
    EntryTest.find(filter).sort(sortMap[query.sort]).skip((query.page - 1) * query.pageSize).limit(query.pageSize),
    EntryTest.countDocuments(filter),
  ])
  return { entryTests: records.map(serializeEntryTest), pagination: paginationMeta(query.page, query.pageSize, totalRecords) }
}

export async function getEntryTest(id) {
  const record = await EntryTest.findById(id)
  if (!record) throw new ApiError(404, 'Entry test not found.', 'ENTRY_TEST_NOT_FOUND')
  return serializeEntryTest(record)
}

export async function createEntryTest(values) {
  try {
    return serializeEntryTest(await EntryTest.create(values))
  } catch (error) {
    duplicateError(error, 'Entry-test')
  }
}

export async function updateEntryTest(id, updates) {
  const record = await EntryTest.findById(id)
  if (!record) throw new ApiError(404, 'Entry test not found.', 'ENTRY_TEST_NOT_FOUND')
  setSimpleFields(record, updates, ['name', 'code', 'conductingBody', 'category', 'scoring', 'applicableQualificationCodes', 'recordStatus'])
  mergeChangedSource(record, updates.source)
  try {
    await record.save()
    return serializeEntryTest(record)
  } catch (error) {
    duplicateError(error, 'Entry-test')
  }
}

export async function deleteEntryTest(id) {
  const record = await EntryTest.findById(id)
  if (!record) throw new ApiError(404, 'Entry test not found.', 'ENTRY_TEST_NOT_FOUND')
  if (await MeritFormula.exists({ 'components.entryTest': record._id }) ||
      await AdmissionCycle.exists({ 'entryTestSchedules.entryTest': record._id }) ||
      await EligibilityRule.exists({ 'entryTestRequirements.entryTest': record._id })) {
    throw new ApiError(409, 'This entry test is used by a merit formula and cannot be deleted.', 'ENTRY_TEST_IN_USE')
  }
  await record.deleteOne()
  return { message: 'Entry test deleted.' }
}

export async function listMeritFormulas(query) {
  const filter = baseFilter(query)
  const [records, totalRecords] = await Promise.all([
    MeritFormula.find(filter).populate(formulaPopulate).sort(sortMap[query.sort]).skip((query.page - 1) * query.pageSize).limit(query.pageSize),
    MeritFormula.countDocuments(filter),
  ])
  return { meritFormulas: records.map(serializeMeritFormula), pagination: paginationMeta(query.page, query.pageSize, totalRecords) }
}

export async function getMeritFormula(id) {
  const record = await MeritFormula.findById(id).populate(formulaPopulate)
  if (!record) throw new ApiError(404, 'Merit formula not found.', 'MERIT_FORMULA_NOT_FOUND')
  return serializeMeritFormula(record)
}

export async function createMeritFormula(values) {
  await verifyFormulaRelations(values)
  try {
    const record = await MeritFormula.create({ ...values, components: modelComponents(values.components) })
    await record.populate(formulaPopulate)
    return serializeMeritFormula(record)
  } catch (error) {
    duplicateError(error, 'Merit-formula')
  }
}

export async function updateMeritFormula(id, updates) {
  const record = await MeritFormula.findById(id)
  if (!record) throw new ApiError(404, 'Merit formula not found.', 'MERIT_FORMULA_NOT_FOUND')
  const merged = {
    university: updates.university ?? record.university,
    program: updates.program !== undefined ? updates.program : record.program,
    admissionCycle: updates.admissionCycle !== undefined ? updates.admissionCycle : record.admissionCycle,
    components: updates.components ?? record.components.map((item) => ({
      basis: item.inputSource.replace('_percentage', '').replace('entry_test', 'entry_test'),
      entryTest: item.entryTest,
    })),
  }
  await verifyFormulaRelations(merged)
  setSimpleFields(record, updates, ['code', 'name', 'university', 'recordStatus'])
  if (updates.program !== undefined) record.set('program', updates.program || undefined)
  if (updates.admissionCycle !== undefined) record.set('admissionCycle', updates.admissionCycle || undefined)
  if (updates.components) record.set('components', modelComponents(updates.components))
  mergeChangedSource(record, updates.source)
  try {
    await record.save()
    await record.populate(formulaPopulate)
    return serializeMeritFormula(record)
  } catch (error) {
    duplicateError(error, 'Merit-formula')
  }
}

export async function deleteMeritFormula(id) {
  const record = await MeritFormula.findById(id)
  if (!record) throw new ApiError(404, 'Merit formula not found.', 'MERIT_FORMULA_NOT_FOUND')
  await record.deleteOne()
  return { message: 'Merit formula deleted.' }
}
