import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { playGame, getHistory } from '../controllers/gameController';

const router = Router();

router.post('/play', authMiddleware, playGame);
router.get('/history', authMiddleware, getHistory);

export default router;
