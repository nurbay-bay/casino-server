import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/user.model';
import { sendCodeToPhone, verifyCode } from '../services/smsService';
import { signToken } from '../services/jwtService';
import { body } from 'express-validator';

const isAdult = (date: string) => {
  const birth = new Date(date);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

export const register = async (req: Request, res: Response) => {
  const { username, phone, password, birthDate } = req.body;

  if (!username || !phone || !password || !birthDate)
    return res.status(400).json({ message: 'Заполните все поля' });

  if (!isAdult(birthDate)) {
    return res.status(403).json({ 
      message: 'Доступ запрещён: вам должно быть 18 лет',
      code: 'AGE_RESTRICTED'
    });
  }

  // проверяем — есть ли уже верифицированный пользователь
  const existing = await User.findOne({ phone });
  if (existing && existing.verified)
    return res.status(400).json({ message: 'Пользователь с таким номером уже существует' });

  // если есть не верифицированный — просто обновляем пароль и логируем код заново
  if (existing && !existing.verified) {
    const passwordHash = await bcrypt.hash(password, 10);
    existing.passwordHash = passwordHash;
    await existing.save();
    sendCodeToPhone(phone);
    return res.json({ message: 'Код повторно отправлен', phone });
  }

  // создаем нового пользователя
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, phone, passwordHash, verified: false, balance: 0, birthDate });
  await user.save();

  sendCodeToPhone(phone);

  return res.json({ message: 'Код отправлен', phone });
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

  const token = signToken({ id: user._id.toString(), username: user.username });
  return res.json({ 
    message: 'Verified', 
    user: { 
      id: user._id.toString(), 
      username: user.username, 
      phone: user.phone, 
      balance: user.balance,
      birthDate: user.birthDate
    }, 
    token 
  });
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Missing' });

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Bad credentials' });

  const token = signToken({ id: user._id.toString(), username: user.username });
  return res.json({ 
    token, 
    user: { 
      id: user._id.toString(), 
      username: user.username, 
      phone: user.phone, 
      balance: user.balance,
      birthDate: user.birthDate
    } 
  });
};

export const profile = async (req: any, res: Response) => {
  const user = req.user;
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ 
    user: { 
      id: user._id.toString(), 
      username: user.username, 
      phone: user.phone, 
      balance: user.balance,
      birthDate: user.birthDate
    } 
  });
};