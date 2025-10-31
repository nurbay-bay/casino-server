import { Router } from 'express';
import { register, verify, login, profile } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/verify', verify);
router.post('/login', login);
router.get('/profile', authMiddleware, profile);

export default router;
