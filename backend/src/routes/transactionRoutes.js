import { Router } from 'express';
import { validate } from '../validators/validation.js';
import { listTransactionsSchema, transactionIdParamSchema } from '../validators/validation.js';
import * as transactionController from '../controllers/transactionController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', validate(listTransactionsSchema), transactionController.getTransactions);
router.get('/:id', validate(transactionIdParamSchema), transactionController.getTransactionById);

export default router;