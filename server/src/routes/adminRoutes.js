import { Router } from 'express'
import { getAdminPing } from '../controllers/adminController.js'
import { authenticate, authorize } from '../middleware/authMiddleware.js'
import validateRequest from '../middleware/validateRequest.js'
import { emptyRequestSchema } from '../validation/commonValidation.js'

const router = Router()

router.get(
  '/ping',
  authenticate,
  authorize('admin'),
  validateRequest(emptyRequestSchema),
  getAdminPing,
)

export default router
