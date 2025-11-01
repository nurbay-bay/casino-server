import { Request, Response } from 'express';
import Payment from '../models/payment.model';
import User from '../models/user.model';
import config from '../config';
import Stripe from 'stripe';

// === TEST STRIPE CONNECTION ===
export const testStripe = async (req: any, res: any) => {
  try {
    const account = await stripe.accounts.retrieve(); // Проверяем подключение
    return res.json({
      ok: true,
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
    });
  } catch (err: any) {
    console.error('Stripe test error:', err);
    return res.status(500).json({
      ok: false,
      message: err?.message || 'Stripe connection failed',
    });
  }
};

const stripe = new Stripe(config.stripeKey, { apiVersion: '2022-11-15' as any });

export const createPayment = async (req: any, res: Response) => {
  const user = req.user;
  const { amount } = req.body;
  if (!amount || amount <= 0)
    return res.status(400).json({ message: 'Неверная сумма' });

  const payment = new Payment({ userId: user._id, amount, status: 'pending' });
  await payment.save();

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'usd',
    });

    // имитация задержки/проверки (пример)
    setTimeout(async () => {
      payment.status = 'success';
      payment.providerId = intent.id;
      await payment.save();

      user.balance += Number(amount);
      await user.save();
    }, 2000);

    return res.json({ id: payment._id, status: 'pending', client_secret: intent.client_secret });
  } catch (err) {
    console.error('payment error', err);
    payment.status = 'failed';
    await payment.save();
    return res.status(500).json({ message: 'Ошибка платежа' });
  }
};

export const getUserPayments = async (req: any, res: Response) => {
  const { userId } = req.params;
  if (req.user._id.toString() !== userId)
    return res.status(403).json({ message: 'Нет доступа к чужим платежам' });

  const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
  return res.json({ payments });
};
