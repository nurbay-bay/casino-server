import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 8000,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
};
