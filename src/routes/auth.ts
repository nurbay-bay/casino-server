import { Router } from 'express';
import { register, verify, login, profile } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

import { validate } from '../middleware/validate';
import { body } from 'express-validator';

const router = Router();

router.post('/register',
  validate([
    body('username').isLength({ min: 3 }).matches(/^[a-zA-Z0-9_]+$/),
    body('phone').isMobilePhone('any'),
    body('password').isLength({ min: 6 })
  ]),
  register
);
router.post('/verify', verify);
router.post('/login', login);
router.get('/profile', authMiddleware, profile);

export default router;



