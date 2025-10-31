import jwt from 'jsonwebtoken';
import config from '../config';

export const signToken = (payload: object): string => {
  return (jwt.sign as any)(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn || "7d",
  });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
};
