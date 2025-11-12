import { Request, Response } from 'express';
import User from '../models/user.model';
import GameHistory from '../models/history.model';
import { GameResult } from '../services/games/types';
import { playSlots, SlotResult } from '../services/games/slotsService';
import { playPlinko, PlinkoResult } from '../services/games/plinkoService';



export const playGame = async (req: any, res: Response) => {
  const user = req.user;
  const { game, bet } = req.body;

  if (!game || !bet || bet <= 0) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  if (user.balance < bet) {
    return res.status(400).json({ message: 'Insufficient funds' });
  }

  let result: GameResult;
  let amountWon: number = 0;
  let details: any = {};

  if (game === 'slots') {
    const slotResult: SlotResult = playSlots(bet);
    amountWon = slotResult.amountWon;
    result = amountWon > 0 ? 'win' : 'lose';
    details = {
      symbols: slotResult.symbols,
      multiplier: slotResult.multiplier,
    };
  } else if (game === 'plinko') {
    const plinkoResult: PlinkoResult = playPlinko(bet);
    amountWon = plinkoResult.amountWon;
    result = amountWon > 0 ? 'win' : 'lose';
    details = { multiplier: plinkoResult.multiplier };
  } else {
    return res.status(400).json({ message: 'Unknown game' });
  }

  // Обновление баланса
  user.balance = user.balance - bet + amountWon;
  await user.save();

  // Сохранение в историю
  const entry = new GameHistory({
    userId: user._id,
    game,
    bet,
    result,
    amountWon,
    details,
  });
  await entry.save();

  // Ответ
  return res.json({
    game,
    result,
    amountWon,
    newBalance: user.balance,
    details,
    historyEntry: entry,
  });
};

export const getHistory = async (req: any, res: Response) => {
  const user = req.user;
  const bets = await GameHistory.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(100);
  return res.json({ bets });
};