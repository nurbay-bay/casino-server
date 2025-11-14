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

// Получение данных платежа по токену (публичный доступ)
export const getPaymentByToken = async (req: Request, res: Response) => {
  const { token } = req.params;
  // Ищем платеж по токену, не ограничиваясь статусом pending
  const payment = await Payment.findOne({ paymentToken: token });

  if (!payment) return res.status(404).json({ message: 'Платёж не найден' });

  // Если платеж уже завершен (success, failed, canceled), возвращаем его статус
  if (payment.status !== 'pending') {
    return res.json({
      amount: payment.amount,
      invoiceId: payment.invoiceId,
      status: payment.status,
      expiresIn: 0
    });
  }

  // Проверяем, не истек ли pending платеж
  if (payment.expiresAt < new Date()) {
    // Автоматически отменяем истекший платеж
    await cancelPaymentInternal(payment);
    return res.status(410).json({ 
      message: 'Платёж истёк и был отменён', 
      expired: true,
      status: 'canceled'
    });
  }

  if (!payment.providerId) {
    return res.status(400).json({ message: 'Платёж ещё не инициализирован' });
  }

  const intent = await stripe.paymentIntents.retrieve(payment.providerId);
  const expiresIn = Math.floor((payment.expiresAt.getTime() - Date.now()) / 1000);

  res.json({
    amount: payment.amount,
    clientSecret: intent.client_secret,
    invoiceId: payment.invoiceId,
    status: 'pending',
    expiresIn: Math.max(expiresIn, 0)
  });
};

// Вспомогательная функция для проверки и отмены истекших платежей
const checkAndCancelExpiredPayments = async (payments: any[]) => {
  const now = new Date();
  const stripe = new Stripe(config.stripeKey, { apiVersion: '2022-11-15' as any });
  
  for (const payment of payments) {
    // Проверяем только pending платежи
    if (payment.status === 'pending' && payment.expiresAt < now) {
      try {
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
      } catch (err) {
        console.error(`Ошибка при отмене истекшего платежа ${payment._id}:`, err);
      }
    }
  }
};

// Получение истории платежей пользователя
export const getUserPayments = async (req: any, res: Response) => {
  const { userId } = req.params;
  
  if (req.user._id.toString() !== userId) {
    return res.status(403).json({ message: 'Нет доступа к чужим платежам' });
  }

  const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
  
  // Проверяем и автоматически отменяем истекшие платежи перед возвратом
  await checkAndCancelExpiredPayments(payments);
  
  // Обновляем список платежей после возможных изменений
  const updatedPayments = await Payment.find({ userId }).sort({ createdAt: -1 });
  
  return res.json({ payments: updatedPayments });
};

// Получение статуса платежа по ID
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

    // Проверяем и автоматически отменяем истекший pending платеж
    if (payment.status === 'pending' && payment.expiresAt < new Date()) {
      await cancelPaymentInternal(payment);
      // Обновляем платеж из БД
      const updatedPayment = await Payment.findById(paymentId);
      return res.json({
        id: updatedPayment!._id.toString(),
        status: updatedPayment!.status,
        amount: updatedPayment!.amount
      });
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
