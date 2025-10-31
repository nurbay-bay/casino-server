import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/user.model';
import { sendCodeToPhone, verifyCode } from '../services/smsService';
import { signToken } from '../services/jwtService';

export const register = async (req: Request, res: Response) => {
  const { username, phone, password } = req.body;
  if (!username || !phone || !password) return res.status(400).json({ message: 'Missing fields' });

  // можем проверить уникальность
  const existing = await User.findOne({ $or: [{ username }, { phone }] });
  if (existing) return res.status(400).json({ message: 'User exists' });

  // генерируем временный код (логируется)
  sendCodeToPhone(phone);

  // Временно сохраняем запись в базе? Для простоты — создаём пользователя с verified=false и passwordHash placeholder.
  // Альтернатива: хранить в separate pending collection. Здесь — сделаем временную запись:
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, phone, passwordHash, verified: false, balance: 0 });
  await user.save();

  return res.json({ message: 'Code sent', phone });
};

export const verify = async (req: Request, res: Response) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ message: 'Missing fields' });

  const ok = verifyCode(phone, code);
  if (!ok) return res.status(400).json({ message: 'Invalid or expired code' });

  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.verified = true;
  await user.save();

  const token = signToken({ id: user._id, username: user.username });
  return res.json({ message: 'Verified', user: { id: user._id, username: user.username, phone: user.phone, balance: user.balance }, token });
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Missing' });

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Bad credentials' });

  const token = signToken({ id: user._id, username: user.username });
  return res.json({ token, user: { id: user._id, username: user.username, phone: user.phone, balance: user.balance } });
};

export const profile = async (req: any, res: Response) => {
  const user = req.user;
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ user: { id: user._id, username: user.username, phone: user.phone, balance: user.balance } });
};
