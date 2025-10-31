import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwtService';
import User from '../models/user.model';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.header('authorization') || '';
  const token = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });

  const payload = verifyToken(token);
  if (!payload || typeof payload === 'string') return res.status(401).json({ message: 'Invalid token' });

  // @ts-ignore
  const userId = (payload as any).id;
  const user = await User.findById(userId);
  if (!user) return res.status(401).json({ message: 'User not found' });

  req.user = user;
  next();
};
