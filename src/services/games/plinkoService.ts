export interface PlinkoResult {
  multiplier: number;
  amountWon: number;
  cell: number;
  path: number[]; // 0 = влево, 1 = вправо
}

export const playPlinko = (bet: number): PlinkoResult => {
  const rows = 10;
  const bins = 9;
  const path = Array.from({ length: rows }, () => (Math.random() < 0.5 ? 0 : 1));

  // Начало с центра
  let position = (bins - 1) / 2; // 3.5 для 8 ячеек

  // Каждый шаг: 0 = влево, 1 = вправо
  path.forEach((dir) => {
    position += dir === 0 ? -0.5 : 0.5; // смещение на полячейки
  });

  // Округляем к ближайшей ячейке
  const cell = Math.max(0, Math.min(bins - 1, Math.round(position)));

  const multipliers = [5, 2, 1.2, 0.8, 0.5, 0.8, 1.2, 2, 5];
  const multiplier = multipliers[cell] ?? 1;
  const amountWon = Math.floor(bet * multiplier);

  return { multiplier, amountWon, cell, path };
};
