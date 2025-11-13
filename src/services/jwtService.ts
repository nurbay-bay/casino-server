import jwt from 'jsonwebtoken';
import config from '../config';

interface TokenPayload {
  id: string;
  username: string;
}
export const signToken = (payload: TokenPayload): string => {
  return (jwt.sign as any)(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn || "7d",
  });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch (err) {
    return null;
  }
};