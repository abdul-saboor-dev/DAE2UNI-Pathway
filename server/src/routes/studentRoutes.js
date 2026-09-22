import { Router } from 'express'
import {
  getStudentProfile,
  updateStudentProfile,
} from '../controllers/studentProfileController.js'
import { authenticate, authorize } from '../middleware/authMiddleware.js'
import validateRequest from '../middleware/validateRequest.js'
import { emptyRequestSchema } from '../validation/commonValidation.js'
import { updateStudentProfileRequestSchema } from '../validation/studentProfileValidation.js'

const router = Router()

router.use(authenticate, authorize('student'))
router.get('/profile', validateRequest(emptyRequestSchema), getStudentProfile)
router.put('/profile', validateRequest(updateStudentProfileRequestSchema), updateStudentProfile)

export default router
