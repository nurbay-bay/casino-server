import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getUserPayments, getPaymentByToken } from '../controllers/payment/paymentController';
import { createPayment } from '../controllers/payment/createPayment';
import { handleWebhook } from '../controllers/payment/webhookHandler';
import { renderPaymentPage } from '../controllers/payment/renderPage';

const router = Router();

router.post('/create', authMiddleware, createPayment);
router.get('/user/:userId', authMiddleware, getUserPayments);
router.post('/webhook', handleWebhook);

// Публичные маршруты для платежной страницы
router.get('/token/:token', getPaymentByToken);
router.get('/page/:token', renderPaymentPage);

export default router;