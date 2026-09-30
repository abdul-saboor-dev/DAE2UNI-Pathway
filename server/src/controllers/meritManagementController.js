import asyncHandler from '../utils/asyncHandler.js'
import {
  createEntryTest, createMeritFormula, deleteEntryTest, deleteMeritFormula,
  getEntryTest, getMeritFormula, listEntryTests, listMeritFormulas,
  updateEntryTest, updateMeritFormula,
} from '../services/meritManagementService.js'

const created = (key, service) => asyncHandler(async (request, response) => {
  const record = await service(request.validated.body)
  response.status(201).json({ status: 'success', data: { [key]: record } })
})
const listed = (service) => asyncHandler(async (request, response) => {
  response.status(200).json({ status: 'success', data: await service(request.validated.query) })
})
const fetched = (key, parameter, service) => asyncHandler(async (request, response) => {
  const record = await service(request.validated.params[parameter])
  response.status(200).json({ status: 'success', data: { [key]: record } })
})
const updated = (key, parameter, service) => asyncHandler(async (request, response) => {
  const record = await service(request.validated.params[parameter], request.validated.body)
  response.status(200).json({ status: 'success', data: { [key]: record } })
})
const removed = (parameter, service) => asyncHandler(async (request, response) => {
  response.status(200).json({ status: 'success', data: await service(request.validated.params[parameter]) })
})

export const postEntryTest = created('entryTest', createEntryTest)
export const getEntryTests = listed(listEntryTests)
export const getEntryTestById = fetched('entryTest', 'entryTestId', getEntryTest)
export const putEntryTest = updated('entryTest', 'entryTestId', updateEntryTest)
export const removeEntryTest = removed('entryTestId', deleteEntryTest)
export const postMeritFormula = created('meritFormula', createMeritFormula)
export const getMeritFormulas = listed(listMeritFormulas)
export const getMeritFormulaById = fetched('meritFormula', 'meritFormulaId', getMeritFormula)
export const putMeritFormula = updated('meritFormula', 'meritFormulaId', updateMeritFormula)
export const removeMeritFormula = removed('meritFormulaId', deleteMeritFormula)
