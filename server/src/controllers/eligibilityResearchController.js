import asyncHandler from '../utils/asyncHandler.js'
import {
  createEligibilityResearch,
  getEligibilityResearch,
  getEligibilityResearchOptions,
  listEligibilityResearch,
  updateEligibilityResearch,
} from '../services/eligibilityResearchService.js'

export const getEligibilityResearchRecords = asyncHandler(async (request, response) => {
  response.json({ status: 'success', data: await listEligibilityResearch(request.validated.query) })
})

export const getEligibilityResearchRecord = asyncHandler(async (request, response) => {
  const record = await getEligibilityResearch(request.validated.params.researchId)
  response.json({ status: 'success', data: { record } })
})

export const getEligibilityResearchOptionRecords = asyncHandler(async (request, response) => {
  response.json({
    status: 'success',
    data: await getEligibilityResearchOptions(request.validated.query),
  })
})

export const postEligibilityResearchRecord = asyncHandler(async (request, response) => {
  const record = await createEligibilityResearch(request.validated.body, request.user._id)
  response.status(201).json({ status: 'success', data: { record } })
})

export const putEligibilityResearchRecord = asyncHandler(async (request, response) => {
  const record = await updateEligibilityResearch(
    request.validated.params.researchId,
    request.validated.body,
    request.user._id,
  )
  response.json({ status: 'success', data: { record } })
})
