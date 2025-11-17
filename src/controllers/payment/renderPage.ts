import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import Payment from '../../models/payment.model';
import config from '../../config';
import Stripe from 'stripe';

const stripe = new Stripe(config.stripeKey, { apiVersion: '2022-11-15' as any });

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

export const renderPaymentPage = async (req: Request, res: Response) => {
  const { token } = req.params;

  const payment = await Payment.findOne({ 
    paymentToken: token,
    status: 'pending'
  });

  if (!payment) {
    return res.status(404).send(`<h1 style="text-align:center; margin-top:100px;">Платеж не найден</h1>`);
  }

  // Проверяем, не истек ли платеж
  if (payment.expiresAt < new Date()) {
    // Автоматически отменяем истекший платеж
    await cancelPaymentInternal(payment);
    return res.status(410).send(`<h1 style="text-align:center; margin-top:100px;">Платеж истек и был отменен</h1>`);
  }

  const templatePath = path.join(__dirname, '../../../public/payment/index.html');
  const html = await fs.promises.readFile(templatePath, 'utf-8');

  const rendered = html
    .replace(/{{stripe_key}}/g, config.stripePublishableKey)
    .replace(/{{token}}/g, token);
    

  res.send(rendered);
};