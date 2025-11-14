import { Request, Response } from 'express';
import crypto from 'crypto';
import Payment from '../../models/payment.model';
import Stripe from 'stripe';
import config from '../../config';
import { customAlphabet } from 'nanoid';

const stripe = new Stripe(config.stripeKey, { apiVersion: '2022-11-15' as any });

const nanoid = customAlphabet('0123456789', 10);

const generatePaymentToken = () => crypto.randomBytes(32).toString('hex');
const generateInvoiceId = () => {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  return `INV-${date}-${nanoid(6)}`;
};

export const createPayment = async (req: any, res: Response) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Неверная сумма' });

  try {
    const paymentToken = generatePaymentToken();
    const invoiceId = generateInvoiceId();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

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

// Вспомогательная функция для отмены платежа
const cancelPaymentInternal = async (payment: any) => {
  // Отменяем PaymentIntent в Stripe, если он существует
  if (payment.providerId) {
    try {
      await stripe.paymentIntents.cancel(payment.providerId);
    } catch (err: any) {
      // Игнорируем ошибки, если PaymentIntent уже отменен или завершен
      if (!err.message?.includes('already') && !err.message?.includes('canceled') && !err.message?.includes('succeeded')) {
        console.error(`Ошибка отмены PaymentIntent ${payment.providerId}:`, err.message);
      }
    }
  }

  payment.status = 'canceled';
  await payment.save();
};

export const cancelPayment = async (req: Request, res: Response) => {
  const { token } = req.params;
  const payment = await Payment.findOne({ paymentToken: token, status: 'pending' });
  if (!payment) return res.status(404).json({ message: 'Платёж не найден' });

  await cancelPaymentInternal(payment);

  res.json({ message: 'Платёж отменён' });
};