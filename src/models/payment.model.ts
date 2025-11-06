import { Schema, model, Document, Types } from 'mongoose';

// Определяем тип для статуса платежа
export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  status: PaymentStatus;
  providerId?: string;
  paymentToken: string;
  createdAt: Date;
  expiresAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'] as PaymentStatus[],
    default: 'pending',
  },
  providerId: { type: String },
  paymentToken: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default model<IPayment>('Payment', PaymentSchema);