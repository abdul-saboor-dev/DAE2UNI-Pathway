import {
  createProgram,
  deleteProgram,
  getAdminProgram,
  listAdminPrograms,
  updateProgram,
} from '../services/programService.js'
import {
  createUniversity,
  deleteUniversity,
  getAdminUniversity,
  listAdminUniversities,
  updateUniversity,
} from '../services/universityService.js'
import asyncHandler from '../utils/asyncHandler.js'

export const createUniversityRecord = asyncHandler(async (request, response) => {
  const university = await createUniversity(request.validated.body)
  response.status(201).json({ status: 'success', data: { university } })
})

export const listUniversityRecords = asyncHandler(async (request, response) => {
  const result = await listAdminUniversities(request.validated.query)
  response.status(200).json({ status: 'success', data: result })
})

export const getUniversityRecord = asyncHandler(async (request, response) => {
  const university = await getAdminUniversity(request.validated.params.universityId)
  response.status(200).json({ status: 'success', data: { university } })
})

export const updateUniversityRecord = asyncHandler(async (request, response) => {
  const university = await updateUniversity(
    request.validated.params.universityId,
    request.validated.body,
  )
  response.status(200).json({ status: 'success', data: { university } })
})

export const deleteUniversityRecord = asyncHandler(async (request, response) => {
  const result = await deleteUniversity(request.validated.params.universityId)
  response.status(200).json({ status: 'success', data: result })
})

export const createProgramRecord = asyncHandler(async (request, response) => {
  const program = await createProgram(request.validated.body)
  response.status(201).json({ status: 'success', data: { program } })
})

export const listProgramRecords = asyncHandler(async (request, response) => {
  const result = await listAdminPrograms(request.validated.query)
  response.status(200).json({ status: 'success', data: result })
})

export const getProgramRecord = asyncHandler(async (request, response) => {
  const program = await getAdminProgram(request.validated.params.programId)
  response.status(200).json({ status: 'success', data: { program } })
})

export const updateProgramRecord = asyncHandler(async (request, response) => {
  const program = await updateProgram(
    request.validated.params.programId,
    request.validated.body,
  )
  response.status(200).json({ status: 'success', data: { program } })
})

export const deleteProgramRecord = asyncHandler(async (request, response) => {
  const result = await deleteProgram(request.validated.params.programId)
  response.status(200).json({ status: 'success', data: result })
})
