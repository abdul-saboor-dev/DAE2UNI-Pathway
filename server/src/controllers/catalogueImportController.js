import { processCatalogueImport } from '../services/catalogueImportService.js'
import User from '../models/User.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

async function requirePermanentOwnerForRestore(request) {
  if (request.validated.body.strategy !== 'catalogue_restore') return
  const owner = await User.findById(request.user._id).select('+ownerMarker')
  if (owner?.role !== 'owner' || owner.ownerMarker !== 'permanent_owner') {
    throw new ApiError(403, 'Only the permanent Owner can restore protected catalogue records.', 'PERMANENT_OWNER_REQUIRED')
  }
}

export const previewCatalogueImport = asyncHandler(async (request, response) => {
  await requirePermanentOwnerForRestore(request)
  const result = await processCatalogueImport(request.validated.body, request.user._id, true)
  response.json({ status: 'success', data: result })
})

export const applyCatalogueImport = asyncHandler(async (request, response) => {
  await requirePermanentOwnerForRestore(request)
  const result = await processCatalogueImport(request.validated.body, request.user._id, false)
  response.json({ status: 'success', data: result })
})
