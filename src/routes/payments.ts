import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createPayment, testStripe, getUserPayments } from '../controllers/paymentController';

const router = Router();

router.post('/create', authMiddleware, createPayment);
router.get('/user/:userId', authMiddleware, getUserPayments);
router.get('/test', testStripe);

export default router;