import { createFirstOwner, isOwnerSetupRequired } from '../services/adminSetupService.js'
import asyncHandler from '../utils/asyncHandler.js'

function disableCache(response) {
  response.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  response.set('Pragma', 'no-cache')
  response.set('Expires', '0')
}

export const getSetupStatus = asyncHandler(async (_request, response) => {
  disableCache(response)
  const ownerSetupRequired = await isOwnerSetupRequired()
  response.json({ data: { ownerSetupRequired } })
})

export const postSetupAdmin = asyncHandler(async (request, response) => {
  disableCache(response)
  try {
    const user = await createFirstOwner(request.validated.body)
    response.status(201).json({ status: 'success', data: { user } })
  } finally {
    // Strings cannot be zeroized in JS, but avoid retaining request references.
    request.body = undefined
    request.validated = undefined
  }
})
