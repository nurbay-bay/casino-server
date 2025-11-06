import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { 
  createPayment, 
  testStripe, 
  getUserPayments, 
  handleWebhook,
  getPaymentByToken,
  renderPaymentPage
} from '../controllers/paymentController';

const router = Router();

router.post('/create', authMiddleware, createPayment);
router.get('/user/:userId', authMiddleware, getUserPayments);
router.get('/test', testStripe);
router.post('/webhook', handleWebhook);

// Публичные маршруты для платежной страницы
router.get('/token/:token', getPaymentByToken);
router.get('/page/:token', renderPaymentPage);

export default router;