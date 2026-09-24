import { Router } from 'express'
import { applyCatalogueImport, previewCatalogueImport } from '../controllers/catalogueImportController.js'
import validateRequest from '../middleware/validateRequest.js'
import { applyImportRequestSchema, previewImportRequestSchema } from '../validation/catalogueImportValidation.js'

const router = Router()
router.post('/preview', validateRequest(previewImportRequestSchema), previewCatalogueImport)
router.post('/apply', validateRequest(applyImportRequestSchema), applyCatalogueImport)
export default router
