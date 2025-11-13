import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/user.model';
import { sendCodeToPhone, verifyCode } from '../services/smsService';
import { signToken } from '../services/jwtService';
import { body } from 'express-validator';
import PhoneChangeRequest from '../models/phoneChangeRequest.model';

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

export const changePassword = async (req: any, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6)
    return res.status(400).json({ message: 'Неверные данные' });

  const ok = await bcrypt.compare(oldPassword, req.user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Неверный старый пароль' });

  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();

  return res.json({ message: 'Пароль изменён' });
};

export const changePhone = async (req: any, res: Response) => {
  const { newPhone } = req.body;
  if (!newPhone) return res.status(400).json({ message: 'Укажите телефон' });

  const existing = await User.findOne({ phone: newPhone, verified: true });
  if (existing) return res.status(400).json({ message: 'Номер уже занят' });

  await PhoneChangeRequest.deleteOne({ userId: req.user._id });

  const code = sendCodeToPhone(newPhone);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const request = new PhoneChangeRequest({
    userId: req.user._id,
    newPhone,
    code,
    expiresAt,
  });
  await request.save();

  return res.json({ message: 'Код отправлен на новый номер' });
};

export const verifyPhoneChange = async (req: any, res: Response) => {
  const { code } = req.body;
  const request = await PhoneChangeRequest.findOne({
    userId: req.user._id,
    expiresAt: { $gt: new Date() }
  });

  if (!request) return res.status(400).json({ message: 'Запрос истёк или не найден' });

  const ok = verifyCode(request.newPhone, code);
  if (!ok) return res.status(400).json({ message: 'Неверный код' });

  req.user.phone = request.newPhone;
  await req.user.save();

  await PhoneChangeRequest.deleteOne({ _id: request._id });

  return res.json({ message: 'Телефон обновлён' });
};