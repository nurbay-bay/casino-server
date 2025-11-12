import { Schema, model, Document, Types } from 'mongoose';

export interface IPhoneChangeRequest extends Document {
  userId: Types.ObjectId;
  newPhone: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

const PhoneChangeRequestSchema = new Schema<IPhoneChangeRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  newPhone: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: '1d' } },
  createdAt: { type: Date, default: Date.now },
});

export default model<IPhoneChangeRequest>('PhoneChangeRequest', PhoneChangeRequestSchema);