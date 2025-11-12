import { Router } from 'express';
import { register, verify, login, profile, changePassword, changePhone, verifyPhoneChange } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

import { body } from 'express-validator';
import { isAdult, validate } from '../middleware/validate';

const router = Router();

router.post('/register',
  validate([
    body('username').isLength({ min: 3 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Только латиница, цифры, _'),
    body('phone').isMobilePhone('any').withMessage('Неверный формат телефона'),
    body('password').isLength({ min: 6 }).withMessage('Пароль от 6 символов'),
    body('birthDate').isISO8601().withMessage('Неверная дата').custom(isAdult).withMessage('Вам должно быть 18+')
  ]),
  register
);
router.post('/verify', verify);
router.post('/login', login);
router.get('/profile', authMiddleware, profile);

router.post('/change-password', authMiddleware, changePassword);
router.post('/change-phone', authMiddleware, changePhone);
router.post('/verify-phone-change', authMiddleware, verifyPhoneChange);

export default router;



