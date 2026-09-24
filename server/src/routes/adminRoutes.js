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
import { CONTENT_MANAGER_ROLES } from '../utils/roles.js'
import { OWNER_ONLY_ROLES, ROLE_MANAGER_ROLES } from '../utils/roles.js'
import { grantCoOwnerAccess, listAdministrators, promote, revoke, revokeCoOwnerAccess } from '../controllers/teamController.js'
import { teamThrottle } from '../middleware/teamThrottle.js'
import { changeCoOwnerSchema, listTeamSchema, promoteStudentSchema, revokeAdminSchema } from '../validation/teamValidation.js'
import { getVerificationQueue, postVerifySource } from '../controllers/verificationQueueController.js'
import { listVerificationQueueSchema, verifyCatalogueSourceSchema } from '../validation/verificationQueueValidation.js'

const router = Router()

router.use(authenticate, authorize(...CONTENT_MANAGER_ROLES))

router.get('/ping', validateRequest(emptyRequestSchema), getAdminPing)
router.get('/verification-queue', validateRequest(listVerificationQueueSchema), getVerificationQueue)
router.post('/verification-queue/:entityType/:recordId/verify', validateRequest(verifyCatalogueSourceSchema), postVerifySource)

router.get('/administrators', authorize(...ROLE_MANAGER_ROLES), validateRequest(listTeamSchema), listAdministrators)
router.post('/administrators/promote', authorize(...ROLE_MANAGER_ROLES), teamThrottle, validateRequest(promoteStudentSchema), promote)
router.post('/administrators/:userId/revoke', authorize(...ROLE_MANAGER_ROLES), teamThrottle, validateRequest(revokeAdminSchema), revoke)
router.post('/administrators/:userId/grant-co-owner', authorize(...OWNER_ONLY_ROLES), teamThrottle, validateRequest(changeCoOwnerSchema), grantCoOwnerAccess)
router.post('/administrators/:userId/revoke-co-owner', authorize(...OWNER_ONLY_ROLES), teamThrottle, validateRequest(changeCoOwnerSchema), revokeCoOwnerAccess)

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
