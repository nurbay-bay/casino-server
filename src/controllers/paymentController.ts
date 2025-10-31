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
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

  // создаём запись payment
  const payment = new Payment({ userId: user._id, amount, status: 'pending' });
  await payment.save();

  // Пример: использовать Stripe Test PaymentIntent (демо) — можно упростить и сразу делать success.
  try {
    // Демонстрационно создаём PaymentIntent (необязательно)
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'usd',
      // payment_method_types: ['card'],
    });

    // Для демонстрации — пометим как success и обновим баланс
    payment.status = 'success';
    payment.providerId = intent.id;
    await payment.save();

    // увеличить баланс пользователя:
    user.balance = (user.balance || 0) + Number(amount);
    await user.save();

    return res.json({ id: payment._id, status: payment.status, amount: payment.amount, newBalance: user.balance });
  } catch (err) {
    console.error('payment error', err);
    payment.status = 'failed';
    await payment.save();
    return res.status(500).json({ message: 'Payment failed' });
  }
};
