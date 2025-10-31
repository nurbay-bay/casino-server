import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createPayment, testStripe } from '../controllers/paymentController';

const router = Router();

router.post('/create', authMiddleware, createPayment);
router.get('/test', testStripe);

export default router;