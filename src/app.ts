import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './db';
import { cleanupPhoneChangeRequests, cleanupUnverifiedUsers } from './db/cleanup';
import { errorHandler } from './middleware/errorHandler';
import config from './config';

import authRoutes from './routes/auth';
import paymentRoutes from './routes/payments';
import gameRoutes from './routes/games';
import { renderPaymentPage } from './controllers/payment/renderPage';


const app = express();

// Webhook должен обрабатываться ДО json парсера
app.use('/api/payments/webhook', express.raw({type: 'application/json'}));

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(errorHandler);

// подключаемся к БД
connectDB();
setInterval(cleanupUnverifiedUsers, 30 * 60 * 1000);
setInterval(cleanupPhoneChangeRequests, 60 * 60 * 1000);

// API роуты
app.use('/payment', express.static('public/payment'));
app.use('/assets', express.static('public/assets'));
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/games', gameRoutes);

// Публичная платежная страница
app.get('/payment/page/:token', renderPaymentPage);

// health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

export default app;