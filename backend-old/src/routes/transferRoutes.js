import { Router } from 'express';
import { validate } from '../validators/authValidator.js';
import { sendMoneySchema } from '../validators/transferValidator.js';
import * as transferController from '../controllers/transferController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { idempotencyMiddleware } from '../middlewares/idempotency.js';

const router = Router();

router.use(authMiddleware);
router.use(idempotencyMiddleware);

router.post('/send', validate(sendMoneySchema), transferController.sendMoney);
router.get('/balance', transferController.getBalance);

export default router;