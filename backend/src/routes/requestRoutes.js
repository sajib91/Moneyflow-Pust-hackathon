import { Router } from 'express';
import { validate } from '../validators/validation.js';
import { createRequestSchema, requestIdParamSchema, cancelRequestSchema } from '../validators/validation.js';
import * as requestController from '../controllers/requestController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { idempotencyMiddleware } from '../middlewares/idempotency.js';

const router = Router();

router.use(authMiddleware);
router.use(idempotencyMiddleware);

router.post('/', validate(createRequestSchema), requestController.createRequest);
router.get('/', requestController.getRequests);
router.get('/pending', requestController.getPendingRequests);
router.post('/:id/approve', validate(requestIdParamSchema), requestController.approveRequest);
router.post('/:id/reject', validate(requestIdParamSchema), requestController.rejectRequest);
router.post('/:id/cancel', validate(cancelRequestSchema), requestController.cancelRequest);

export default router;