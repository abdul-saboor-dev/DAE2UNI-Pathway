import { Router } from 'express'
import { getAdminPing } from '../controllers/adminController.js'
import {
  createProgramRecord,
  createUniversityRecord,
  deleteProgramRecord,
  deleteUniversityRecord,
  getProgramRecord,
  getUniversityRecord,
  listProgramRecords,
  listUniversityRecords,
  updateProgramRecord,
  updateUniversityRecord,
} from '../controllers/adminCatalogueController.js'
import { authenticate, authorize } from '../middleware/authMiddleware.js'
import validateRequest from '../middleware/validateRequest.js'
import {
  createProgramRequestSchema,
  createUniversityRequestSchema,
  deleteProgramRequestSchema,
  deleteUniversityRequestSchema,
  getAdminProgramRequestSchema,
  getAdminUniversityRequestSchema,
  listAdminProgramsRequestSchema,
  listAdminUniversitiesRequestSchema,
  updateProgramRequestSchema,
  updateUniversityRequestSchema,
} from '../validation/catalogueValidation.js'
import { emptyRequestSchema } from '../validation/commonValidation.js'

const router = Router()

router.use(authenticate, authorize('admin'))

router.get('/ping', validateRequest(emptyRequestSchema), getAdminPing)

router
  .route('/universities')
  .post(validateRequest(createUniversityRequestSchema), createUniversityRecord)
  .get(validateRequest(listAdminUniversitiesRequestSchema), listUniversityRecords)

router
  .route('/universities/:universityId')
  .get(validateRequest(getAdminUniversityRequestSchema), getUniversityRecord)
  .put(validateRequest(updateUniversityRequestSchema), updateUniversityRecord)
  .delete(validateRequest(deleteUniversityRequestSchema), deleteUniversityRecord)

router
  .route('/programs')
  .post(validateRequest(createProgramRequestSchema), createProgramRecord)
  .get(validateRequest(listAdminProgramsRequestSchema), listProgramRecords)

router
  .route('/programs/:programId')
  .get(validateRequest(getAdminProgramRequestSchema), getProgramRecord)
  .put(validateRequest(updateProgramRequestSchema), updateProgramRecord)
  .delete(validateRequest(deleteProgramRequestSchema), deleteProgramRecord)

export default router
