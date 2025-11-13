import { Request, Response } from 'express';
import crypto from 'crypto';
import Payment from '../../models/payment.model';
import User from '../../models/user.model';
import config from '../../config';
import Stripe from 'stripe';

import fs from 'fs';
import path from 'path';

const stripe = new Stripe(config.stripeKey, { apiVersion: '2022-11-15' as any });

// Генерация уникального токена
const generatePaymentToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const generateInvoiceId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = Math.floor(Math.random() * 9999) + 1;
  return `INV-${year}-${month}-${day}-${seq.toString().padStart(4, '0')}`;
};

// Получение данных платежа по токену (публичный доступ)
export const getPaymentByToken = async (req: Request, res: Response) => {
  const { token } = req.params;
  const payment = await Payment.findOne({ paymentToken: token, status: 'pending', expiresAt: { $gt: new Date() } });

  if (!payment) return res.status(404).json({ message: 'Платёж истёк или недоступен' });

  const intent = await stripe.paymentIntents.retrieve(payment.providerId!);
  const expiresIn = Math.floor((payment.expiresAt.getTime() - Date.now()) / 1000);

  res.json({
    amount: payment.amount,
    clientSecret: intent.client_secret,
    invoiceId: payment.invoiceId,
    expiresIn: Math.max(expiresIn, 0)
  });
};

// Получение истории платежей пользователя
export const getUserPayments = async (req: any, res: Response) => {
  const { userId } = req.params;
  
  if (req.user._id.toString() !== userId) {
    return res.status(403).json({ message: 'Нет доступа к чужим платежам' });
  }

  const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
  return res.json({ payments });
};

// Получение статуса платежа
export const getPaymentStatus = async (req: any, res: Response) => {
  const { paymentId } = req.params;
  
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Платеж не найден' });
    }

    // Проверяем, что пользователь запрашивает свой платеж
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    return res.json({
      id: payment._id.toString(),
      status: payment.status,
      amount: payment.amount
    });

  } catch (err) {
    console.error('Payment status error:', err);
    return res.status(500).json({ message: 'Ошибка проверки статуса' });
  }
};
