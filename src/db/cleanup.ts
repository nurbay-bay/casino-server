import phoneChangeRequestModel from '../models/phoneChangeRequest.model';
import User from '../models/user.model';
import Payment from '../models/payment.model';
import Stripe from 'stripe';
import config from '../config';

const stripe = new Stripe(config.stripeKey, { apiVersion: '2022-11-15' as any });

export const cleanupUnverifiedUsers = async () => {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 час назад
  const res = await User.deleteMany({ verified: false, createdAt: { $lt: cutoff } });
  if (res.deletedCount > 0) {
    console.log(`[CLEANUP] Удалено ${res.deletedCount} неподтвержденных пользователей`);
  }
};

export const cleanupPhoneChangeRequests = async () => {
  const res = await phoneChangeRequestModel.deleteMany({ expiresAt: { $lt: new Date() } });
  if (res.deletedCount > 0) {
    console.log(`[CLEANUP] Удалено ${res.deletedCount} истёкших запросов смены телефона`);
  }
};

export const cleanupExpiredPayments = async () => {
  const now = new Date();
  const expiredPayments = await Payment.find({
    status: 'pending',
    expiresAt: { $lt: now }
  });

  if (expiredPayments.length === 0) return;

  let canceledCount = 0;
  for (const payment of expiredPayments) {
    try {
      // Отменяем PaymentIntent в Stripe, если он существует
      if (payment.providerId) {
        try {
          await stripe.paymentIntents.cancel(payment.providerId);
        } catch (err: any) {
          // Игнорируем ошибки, если PaymentIntent уже отменен или завершен
          if (!err.message?.includes('already') && !err.message?.includes('canceled')) {
            console.error(`[CLEANUP] Ошибка отмены PaymentIntent ${payment.providerId}:`, err.message);
          }
        }
      }

      payment.status = 'canceled';
      await payment.save();
      canceledCount++;
    } catch (err) {
      console.error(`[CLEANUP] Ошибка при отмене платежа ${payment._id}:`, err);
    }
  }

  if (canceledCount > 0) {
    console.log(`[CLEANUP] Отменено ${canceledCount} истёкших платежей`);
  }
};