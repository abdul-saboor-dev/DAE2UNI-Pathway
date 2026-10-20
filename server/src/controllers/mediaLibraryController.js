import asyncHandler from '../utils/asyncHandler.js'
import {
  cancelUpload,
  completeUpload,
  createProgramDiscipline,
  createUploadIntent,
  deleteProgramDiscipline,
  listProgramDisciplines,
  removeAttachment,
  updateProgramDiscipline,
} from '../services/mediaLibraryService.js'

export const postUploadIntent = asyncHandler(async (request, response) => {
  const upload = await createUploadIntent(request.user._id, request.validated.body)
  response.status(201).json({ status: 'success', data: { upload } })
})

export const postUploadCompletion = asyncHandler(async (request, response) => {
  const media = await completeUpload(request.user._id, request.validated.body)
  response.status(201).json({ status: 'success', data: { media } })
})

export const deleteUploadIntent = asyncHandler(async (request, response) => {
  await cancelUpload(request.user._id, request.validated.params.intentId)
  response.status(204).end()
})

export const deleteMediaAttachment = asyncHandler(async (request, response) => {
  await removeAttachment(request.validated.body)
  response.status(204).end()
})

export const getProgramDisciplines = asyncHandler(async (request, response) => {
  const result = await listProgramDisciplines(request.validated.query)
  response.status(200).json({ status: 'success', data: result })
})

export const postProgramDiscipline = asyncHandler(async (request, response) => {
  const discipline = await createProgramDiscipline(request.validated.body)
  response.status(201).json({ status: 'success', data: { discipline } })
})

export const putProgramDiscipline = asyncHandler(async (request, response) => {
  const discipline = await updateProgramDiscipline(request.validated.params.disciplineId, request.validated.body)
  response.status(200).json({ status: 'success', data: { discipline } })
})

export const removeProgramDiscipline = asyncHandler(async (request, response) => {
  await deleteProgramDiscipline(request.validated.params.disciplineId)
  response.status(204).end()
})
