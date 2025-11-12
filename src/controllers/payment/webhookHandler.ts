import { Request, Response } from 'express';
import Stripe from 'stripe';
import Payment from '../../models/payment.model';
import User from '../../models/user.model';
import config from '../../config';

const stripe = new Stripe(config.stripeKey, { apiVersion: '2022-11-15' as any });

const handleSuccessfulPayment = async (paymentIntent: any) => {
  const payment = await Payment.findOne({ providerId: paymentIntent.id });
  if (!payment) return;

  payment.status = 'success';
  await payment.save();

  const user = await User.findById(payment.userId);
  if (user) {
    user.balance += payment.amount;
    await user.save();
  }
};

const handleFailedPayment = async (paymentIntent: any) => {
  const payment = await Payment.findOne({ providerId: paymentIntent.id });
  if (!payment) return;
  payment.status = 'failed';
  await payment.save();
};

const handleCanceledPayment = async (paymentIntent: any) => {
  console.log('Payment canceled:', paymentIntent.id);
  
  const payment = await Payment.findOne({ providerId: paymentIntent.id });
  if (!payment) return;

  payment.status = 'failed';
  await payment.save();
};

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('No stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripeWebhookSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleSuccessfulPayment(event.data.object);
        break;
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        await handleFailedPayment(event.data.object);
        break;
    }
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

