import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  providerId?: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
  providerId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default model<IPayment>('Payment', PaymentSchema);
