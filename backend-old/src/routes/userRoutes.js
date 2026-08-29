import { Router } from 'express';
import { validate } from '../validators/authValidator.js';
import { searchUsersSchema } from '../validators/transferValidator.js';
import * as userController from '../controllers/userController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/search', validate(searchUsersSchema), userController.searchUsers);

export default router;
