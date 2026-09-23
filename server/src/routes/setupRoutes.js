import { Router } from 'express'
import { getSetupStatus, postSetupAdmin } from '../controllers/setupController.js'
import validateRequest from '../middleware/validateRequest.js'
import { setupThrottle } from '../middleware/setupThrottle.js'
import { emptyRequestSchema } from '../validation/commonValidation.js'
import { setupAdminRequestSchema } from '../validation/setupValidation.js'

const router = Router()
router.get('/status', validateRequest(emptyRequestSchema), getSetupStatus)
router.post('/admin', setupThrottle, validateRequest(setupAdminRequestSchema), postSetupAdmin)
export default router
