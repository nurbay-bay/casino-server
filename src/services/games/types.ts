export type GameResult = 'win' | 'lose';

export interface PlayResult {
  result: GameResult;
  amountWon: number;
  newBalance: number;
  details: any;
  game: string;
  historyEntry?: any;
}