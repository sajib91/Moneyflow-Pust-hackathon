import { Router } from 'express';
import { validate } from '../validators/authValidator.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.getProfile);

export default router;