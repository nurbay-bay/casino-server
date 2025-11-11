import { Request, Response } from 'express';
import crypto from 'crypto';
import Payment from '../models/payment.model';
import User from '../models/user.model';
import config from '../config';
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

export const createPayment = async (req: any, res: Response) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Неверная сумма' });

  try {
    const paymentToken = generatePaymentToken();
    const invoiceId = generateInvoiceId();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

    const payment = new Payment({
      userId: req.user._id,
      amount,
      status: 'pending',
      paymentToken,
      invoiceId,
      expiresAt
    });
    await payment.save();

    const intent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'kzt',
      metadata: { paymentId: payment._id.toString(), invoiceId },
      automatic_payment_methods: { enabled: true },
    });

    payment.providerId = intent.id;
    await payment.save();

    const paymentUrl = `${req.protocol}://${req.get('host')}/payment/page/${paymentToken}`;

    res.json({
      id: payment._id.toString(),
      paymentUrl,
      invoiceId,
      status: 'requires_payment_method'
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
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

// Публичная страница оплаты (не требует авторизации)
export const renderPaymentPage = async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const payment = await Payment.findOne({ 
      paymentToken: token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!payment) {
      return res.status(404).send(`
        <h1 style="text-align:center; margin-top:100px; font-family:sans-serif;">
          Платеж не найден или истек
        </h1>
      `);
    }

    const templatePath = path.join(__dirname, '../../public/payment/index.html');
    let html = await fs.promises.readFile(templatePath, 'utf-8');

    html = html
      .replace(/{{stripe_key}}/g, config.stripePublishableKey)
      .replace(/{{token}}/g, token)
      .replace(/{{amount}}/g, payment.amount.toString())

    res.send(html);
  } catch (err) {
    console.error('Render payment page error:', err);
    res.status(500).send('Ошибка загрузки страницы оплаты');
  }
};


// Webhook для обработки результатов платежа от Stripe
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    console.error('No stripe-signature header');
    return res.status(400).send('No stripe-signature header');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripeWebhookSecret || 'whsec_test'
    );
    console.log('Webhook verified:', event.type);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleSuccessfulPayment(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handleFailedPayment(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handleCanceledPayment(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Обработка успешного платежа
const handleSuccessfulPayment = async (paymentIntent: any) => {
  console.log('Payment succeeded:', paymentIntent.id);
  
  const payment = await Payment.findOne({ providerId: paymentIntent.id });
  if (!payment) {
    console.error('Payment not found in DB:', paymentIntent.id);
    return;
  }

  payment.status = 'success';
  await payment.save();

  const user = await User.findById(payment.userId);
  if (user) {
    user.balance += payment.amount;
    await user.save();
    console.log(`Balance updated: User ${user.username} +${payment.amount}, new balance: ${user.balance}`);
  } else {
    console.error('User not found for payment:', payment.userId);
  }
};

// Обработка неудачного платежа
const handleFailedPayment = async (paymentIntent: any) => {
  console.log('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message);
  
  const payment = await Payment.findOne({ providerId: paymentIntent.id });
  if (!payment) {
    console.error('Payment not found for failed payment:', paymentIntent.id);
    return;
  }

  payment.status = 'failed';
  await payment.save();
  
  console.log(`Payment marked as failed: ${paymentIntent.id}`);
};

// Обработка отмененного платежа
const handleCanceledPayment = async (paymentIntent: any) => {
  console.log('Payment canceled:', paymentIntent.id);
  
  const payment = await Payment.findOne({ providerId: paymentIntent.id });
  if (!payment) return;

  payment.status = 'failed';
  await payment.save();
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

// Тест Stripe
export const testStripe = async (req: Request, res: Response) => {
  try {
    const balance = await stripe.balance.retrieve();
    return res.json({
      ok: true,
      balance,
      message: 'Stripe connection successful'
    });
  } catch (err: any) {
    console.error('Stripe test error:', err);
    return res.status(500).json({
      ok: false,
      message: err?.message || 'Stripe connection failed'
    });
  }
};