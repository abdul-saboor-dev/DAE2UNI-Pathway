import { processCatalogueImport } from '../services/catalogueImportService.js'
import asyncHandler from '../utils/asyncHandler.js'

export const previewCatalogueImport = asyncHandler(async (request, response) => {
  const result = await processCatalogueImport(request.validated.body, request.user._id, true)
  response.json({ status: 'success', data: result })
})

export const applyCatalogueImport = asyncHandler(async (request, response) => {
  const result = await processCatalogueImport(request.validated.body, request.user._id, false)
  response.json({ status: 'success', data: result })
})
