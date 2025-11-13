import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(v => v.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    res.status(400).json({ message: errors.array()[0].msg });
  };
};

export const isAdult = (value: string): boolean => {
  const birthDate = new Date(value);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    if (age - 1 < 18) throw new Error('Вам должно быть 18+');
  } else {
    if (age < 18) throw new Error('Вам должно быть 18+');
  }

  return true;
};