import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import Payment from '../../models/payment.model';
import config from '../../config';

export const renderPaymentPage = async (req: Request, res: Response) => {
  const { token } = req.params;

  const payment = await Payment.findOne({ 
    paymentToken: token,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });

  if (!payment) {
    return res.status(404).send(`<h1 style="text-align:center; margin-top:100px;">Платеж не найден или истек</h1>`);
  }

  const templatePath = path.join(__dirname, '../../../public/payment/index.html');
  const html = await fs.promises.readFile(templatePath, 'utf-8');

  const rendered = html
    .replace(/{{stripe_key}}/g, config.stripePublishableKey)
    .replace(/{{token}}/g, token);
    

  res.send(rendered);
};