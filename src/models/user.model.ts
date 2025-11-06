import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  passwordHash: string;
  phone: string;
  verified: boolean;
  balance: number;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  verified: { type: Boolean, default: false },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default model<IUser>('User', UserSchema);