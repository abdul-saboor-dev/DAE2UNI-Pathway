import { Router } from 'express'
import { getProgram, listPrograms } from '../controllers/catalogueController.js'
import validateRequest from '../middleware/validateRequest.js'
import {
  getPublicProgramRequestSchema,
  listPublicProgramsRequestSchema,
} from '../validation/catalogueValidation.js'

const router = Router()

router.get('/', validateRequest(listPublicProgramsRequestSchema), listPrograms)
router.get(
  '/:programIdentifier',
  validateRequest(getPublicProgramRequestSchema),
  getProgram,
)

export default router
