import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './db';
import { cleanupUnverifiedUsers } from './db/cleanup';
import { errorHandler } from './middleware/errorHandler';
import config from './config';

import authRoutes from './routes/auth';
import paymentRoutes from './routes/payments';
import gameRoutes from './routes/games';

const app = express();

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' })); // фронт
app.use(morgan('dev'));
app.use(errorHandler);

// подключаемся к БД
connectDB();
// каждые 30 минут чистим
setInterval(cleanupUnverifiedUsers, 30 * 60 * 1000);

// роуты
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/games', gameRoutes);

// health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

export default app;
