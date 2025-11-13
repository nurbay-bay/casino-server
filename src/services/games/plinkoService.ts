export interface PlinkoResult {
  multiplier: number;
  amountWon: number;
}

export const playPlinko = (bet: number): PlinkoResult => {
  const multipliers = [0, 0.5, 1, 2, 5] as const;
  const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
  const amountWon = Math.floor(bet * multiplier);

  return { multiplier, amountWon };
};