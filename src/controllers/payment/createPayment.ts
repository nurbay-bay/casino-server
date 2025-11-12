import { Request, Response } from 'express';
import crypto from 'crypto';
import Payment from '../../models/payment.model';
import Stripe from 'stripe';
import config from '../../config';

const stripe = new Stripe(config.stripeKey, { apiVersion: '2022-11-15' as any });

const generatePaymentToken = () => crypto.randomBytes(32).toString('hex');
const generateInvoiceId = () => {
  const now = new Date();
  const seq = Math.floor(Math.random() * 9999) + 1;
  return `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${seq.toString().padStart(4, '0')}`;
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

export const cancelPayment = async (req: Request, res: Response) => {
  const { token } = req.params;
  const payment = await Payment.findOne({ paymentToken: token, status: 'pending' });
  if (!payment) return res.status(404).json({ message: 'Платёж не найден' });

  payment.status = 'failed';
  await payment.save();

  res.json({ message: 'Платёж отменён' });
};