import { Schema, model, Document, Types } from 'mongoose';

export interface IGameHistory extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  game: 'slots'|'plinko';
  bet: number;
  multiplier: number,
  result: 'win'|'lose';
  amountWon: number;
  details?: any;
  createdAt: Date;
}

const GameHistorySchema = new Schema<IGameHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  game: { type: String, enum: ['slots','plinko'], required: true },
  bet: { type: Number, required: true },
  multiplier: { type: Number, required: true },
  result: { type: String, enum: ['win','lose'], required: true },
  amountWon: { type: Number, default: 0 },
  details: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

export default model<IGameHistory>('GameHistory', GameHistorySchema);