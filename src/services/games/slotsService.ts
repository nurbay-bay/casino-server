const SLOT_SYMBOLS = ['🍒', '🍋', '⭐', '7️⃣', '💎'] as const;
type SlotSymbol = typeof SLOT_SYMBOLS[number];

export interface SlotResult {
  symbols: [SlotSymbol, SlotSymbol, SlotSymbol];
  multiplier: number;
  amountWon: number;
}

const spinReel = (): SlotSymbol => {
  return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
};

export const playSlots = (bet: number): SlotResult => {
  const r1 = spinReel();
  const r2 = spinReel();
  const r3 = spinReel();

  let multiplier = 0;

  // Все три одинаковые
  if (r1 === r2 && r2 === r3) {
    if (r1 === '7️⃣') multiplier = 10;
    else if (r1 === '💎') multiplier = 7;
    else if (r1 === '⭐') multiplier = 5;
    else multiplier = 3;
  }
  // Два одинаковых
  else if (r1 === r2 || r2 === r3 || r1 === r3) {
    const sameSymbol = r1 === r2 ? r1 : r2 === r3 ? r2 : r1;
    if (sameSymbol === '7️⃣') multiplier = 3;
    else if (sameSymbol === '💎') multiplier = 2;
    else multiplier = 1.5;
  }

  const amountWon = Math.floor(bet * multiplier);

  return {
    symbols: [r1, r2, r3],
    multiplier,
    amountWon,
  };
};