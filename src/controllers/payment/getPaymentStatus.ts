import { Request, Response } from 'express';
import Payment from '../../models/payment.model';

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

    return res.json({
      id: payment._id.toString(),
      status: payment.status,
      amount: payment.amount,
      invoiceId: payment.invoiceId,
      createdAt: payment.createdAt,
      expiresAt: payment.expiresAt
    });

  } catch (err) {
    console.error('Payment status error:', err);
    return res.status(500).json({ message: 'Ошибка проверки статуса' });
  }
};