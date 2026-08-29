import { Router } from 'express';
import { validate } from '../validators/validation.js';
import { sendMoneySchema, searchUsersSchema } from '../validators/validation.js';
import * as transferController from '../controllers/transferController.js';
import * as userController from '../controllers/userController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { idempotencyMiddleware } from '../middlewares/idempotency.js';

const router = Router();

router.use(authMiddleware);
router.use(idempotencyMiddleware);

router.post('/send', validate(sendMoneySchema), transferController.sendMoney);
router.get('/balance', transferController.getBalance);
router.get('/users/search', validate(searchUsersSchema), userController.searchUsers);

export default router;