import { Router } from 'express';
import { validate } from '../validators/validation.js';
import { searchUsersSchema } from '../validators/validation.js';
import * as userController from '../controllers/userController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/search', validate(searchUsersSchema), userController.searchUsers);

export default router;