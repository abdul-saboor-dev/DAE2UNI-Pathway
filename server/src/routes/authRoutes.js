import { Router } from 'express'
import { getCurrentUser, loginUser, register, resendVerification, verifyEmail } from '../controllers/authController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import validateRequest from '../middleware/validateRequest.js'
import { loginRequestSchema, registerRequestSchema, resendVerificationRequestSchema, verifyEmailRequestSchema } from '../validation/authValidation.js'
import { emptyRequestSchema } from '../validation/commonValidation.js'

const router = Router()

router.post('/register', validateRequest(registerRequestSchema), register)
router.post('/login', validateRequest(loginRequestSchema), loginUser)
router.post('/verify-email', validateRequest(verifyEmailRequestSchema), verifyEmail)
router.post('/resend-verification', validateRequest(resendVerificationRequestSchema), resendVerification)
router.get('/me', authenticate, validateRequest(emptyRequestSchema), getCurrentUser)

export default router
