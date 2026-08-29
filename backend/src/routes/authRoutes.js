import { Router } from 'express';
import { validate, registerSchema, loginSchema } from '../validators/authValidator.js';
import * as authController from '../controllers/authController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = Router();

// Public
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected — identity is derived from the verified JWT.
router.get('/me', authenticateUser, authController.getProfile);

export default router;
