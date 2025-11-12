import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Слишком много попыток, попробуйте позже' }
});