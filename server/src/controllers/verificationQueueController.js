import { listVerificationQueue, verifyCatalogueSource } from '../services/verificationQueueService.js'
import asyncHandler from '../utils/asyncHandler.js'

export const getVerificationQueue = asyncHandler(async (request, response) => {
  const result = await listVerificationQueue(request.validated.query)
  response.json({ status: 'success', data: result })
})

export const postVerifySource = asyncHandler(async (request, response) => {
  const { entityType, recordId } = request.validated.params
  const record = await verifyCatalogueSource(entityType, recordId, request.validated.body, request.user._id)
  response.json({ status: 'success', data: { record } })
})
