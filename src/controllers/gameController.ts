import { Request, Response } from 'express';
import User from '../models/user.model';
import GameHistory from '../models/history.model';

// простая логика слотов
const SLOT_SYMBOLS = ['🍒', '🍋', '⭐', '7️⃣', '💎'];
const spinReel = () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];

export const playGame = async (req: any, res: Response) => {
  const user = req.user;
  const { game, bet } = req.body;
  if (!game || !bet || bet <= 0) return res.status(400).json({ message: 'Invalid payload' });

  if (user.balance < bet) return res.status(400).json({ message: 'Insufficient funds' });

  if (game === 'slots') {
    const r1 = spinReel();
    const r2 = spinReel();
    const r3 = spinReel();
    let multiplier = 0;
    
    // Логика выигрыша
    if (r1 === r2 && r2 === r3) {
      // Все три одинаковые
      if (r1 === '7️⃣') multiplier = 10;    // 7️⃣7️⃣7️⃣ = x10
      else if (r1 === '💎') multiplier = 7; // 💎💎💎 = x7
      else if (r1 === '⭐') multiplier = 5;  // ⭐⭐⭐ = x5
      else multiplier = 3;                  // 🍒🍒🍒 или 🍋🍋🍋 = x3
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      // Два одинаковых
      const sameSymbol = r1 === r2 ? r1 : r2 === r3 ? r2 : r1;
      if (sameSymbol === '7️⃣') multiplier = 3;
      else if (sameSymbol === '💎') multiplier = 2;
      else multiplier = 1.5;
    }

    const amountWon = Math.floor(bet * multiplier);
    const result = amountWon > 0 ? 'win' : 'lose';

    // update balance
    user.balance = user.balance - bet + amountWon;
    await user.save();

    const entry = new GameHistory({
      userId: user._id,
      game: 'slots',
      bet,
      result,
      amountWon,
      details: { symbols: [r1, r2, r3], multiplier },
    });
    await entry.save();

    return res.json({
      game: 'slots',
      result,
      amountWon,
      newBalance: user.balance,
      details: { symbols: [r1, r2, r3], multiplier },
      historyEntry: entry,
    });
  }

  if (game === 'plinko') {
    // очень упрощённо: случайный multiplier
    const multipliers = [0, 0.5, 1, 2, 5];
    const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
    const amountWon = Math.floor(bet * multiplier);
    const result = amountWon > 0 ? 'win' : 'lose';

    user.balance = user.balance - bet + amountWon;
    await user.save();

    const entry = new GameHistory({
      userId: user._id,
      game: 'plinko',
      bet,
      result,
      amountWon,
      details: { multiplier },
    });
    await entry.save();

    return res.json({ game: 'plinko', result, amountWon, newBalance: user.balance, details: { multiplier }, historyEntry: entry });
  }

  return res.status(400).json({ message: 'Unknown game' });
};

export const getHistory = async (req: any, res: Response) => {
  const user = req.user;
  const bets = await GameHistory.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100);
  return res.json({ bets });
};
