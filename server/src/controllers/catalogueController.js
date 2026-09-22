import { getPublicProgram, listPublicPrograms } from '../services/programService.js'
import {
  getPublicUniversity,
  listPublicUniversities,
} from '../services/universityService.js'
import asyncHandler from '../utils/asyncHandler.js'

export const listUniversities = asyncHandler(async (request, response) => {
  const result = await listPublicUniversities(request.validated.query)
  response.status(200).json({ status: 'success', data: result })
})

export const getUniversity = asyncHandler(async (request, response) => {
  const university = await getPublicUniversity(
    request.validated.params.universityIdentifier,
  )
  response.status(200).json({ status: 'success', data: { university } })
})

export const listPrograms = asyncHandler(async (request, response) => {
  const result = await listPublicPrograms(request.validated.query)
  response.status(200).json({ status: 'success', data: result })
})

export const getProgram = asyncHandler(async (request, response) => {
  const program = await getPublicProgram(request.validated.params.programIdentifier)
  response.status(200).json({ status: 'success', data: { program } })
})
