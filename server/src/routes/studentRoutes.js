import { Router } from 'express'
import {
  getStudentProfile,
  updateStudentProfile,
} from '../controllers/studentProfileController.js'
import { authenticate, authorize } from '../middleware/authMiddleware.js'
import validateRequest from '../middleware/validateRequest.js'
import { emptyRequestSchema } from '../validation/commonValidation.js'
import { updateStudentProfileRequestSchema } from '../validation/studentProfileValidation.js'
import { getMeritCalculatorOptions, postMeritCalculation } from '../controllers/meritCalculatorController.js'
import { calculateMeritRequestSchema, meritCalculatorOptionsRequestSchema } from '../validation/meritCalculatorValidation.js'
import { getStudentEligibility } from '../controllers/eligibilityEvaluationController.js'
import { studentEligibilityRequestSchema } from '../validation/eligibilityEvaluationValidation.js'

const router = Router()

router.use(authenticate, authorize('student'))
router.get('/profile', validateRequest(emptyRequestSchema), getStudentProfile)
router.put('/profile', validateRequest(updateStudentProfileRequestSchema), updateStudentProfile)
router.get('/merit-calculator/options', validateRequest(meritCalculatorOptionsRequestSchema), getMeritCalculatorOptions)
router.post('/merit-calculator/calculate', validateRequest(calculateMeritRequestSchema), postMeritCalculation)
router.get('/eligibility', validateRequest(studentEligibilityRequestSchema), getStudentEligibility)

export default router
