import { Router } from 'express'
import { completePasswordReset, forgotPassword, getCurrentUser, loginUser, register, resendVerification, verifyEmail } from '../controllers/authController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import validateRequest from '../middleware/validateRequest.js'
import { forgotPasswordRequestSchema, loginRequestSchema, registerRequestSchema, resendVerificationRequestSchema, resetPasswordRequestSchema, verifyEmailRequestSchema } from '../validation/authValidation.js'
import { emptyRequestSchema } from '../validation/commonValidation.js'
import { passwordResetIpThrottle } from '../middleware/passwordResetThrottle.js'

const router = Router()

router.post('/register', validateRequest(registerRequestSchema), register)
router.post('/login', validateRequest(loginRequestSchema), loginUser)
router.post('/verify-email', validateRequest(verifyEmailRequestSchema), verifyEmail)
router.post('/resend-verification', validateRequest(resendVerificationRequestSchema), resendVerification)
router.post('/forgot-password', validateRequest(forgotPasswordRequestSchema), passwordResetIpThrottle, forgotPassword)
router.post('/reset-password', validateRequest(resetPasswordRequestSchema), completePasswordReset)
router.get('/me', authenticate, validateRequest(emptyRequestSchema), getCurrentUser)

export default router
