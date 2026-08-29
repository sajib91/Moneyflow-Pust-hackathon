import { Router } from 'express';
import { validate } from '../validators/authValidator.js';
import { listTransactionsSchema } from '../validators/transactionValidator.js';
import * as transactionController from '../controllers/transactionController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', validate(listTransactionsSchema), transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);

export default router;