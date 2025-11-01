import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Ошибка сервера',
    details: err.stack && process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
