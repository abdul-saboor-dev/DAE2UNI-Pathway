import { Router } from 'express'
import {
  getUniversity,
  listUniversities,
} from '../controllers/catalogueController.js'
import validateRequest from '../middleware/validateRequest.js'
import {
  getPublicUniversityRequestSchema,
  listPublicUniversitiesRequestSchema,
} from '../validation/catalogueValidation.js'

const router = Router()

router.get('/', validateRequest(listPublicUniversitiesRequestSchema), listUniversities)
router.get(
  '/:universityIdentifier',
  validateRequest(getPublicUniversityRequestSchema),
  getUniversity,
)

export default router
