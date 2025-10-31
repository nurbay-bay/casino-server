import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  phone: string;
  verified: boolean;
  balance: number; // integer, например cents
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
