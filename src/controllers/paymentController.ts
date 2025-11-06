import { Request, Response } from 'express';
import crypto from 'crypto';
import Payment from '../models/payment.model';
import User from '../models/user.model';
import config from '../config';
import Stripe from 'stripe';

const stripe = new Stripe(config.stripeKey, { apiVersion: '2022-11-15' as any });

// Генерация уникального токена
const generatePaymentToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const createPayment = async (req: any, res: Response) => {
  const user = req.user;
  const { amount } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Неверная сумма' });
  }

  try {
    const paymentToken = generatePaymentToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 минут

    // Создаем платеж в нашей БД
    const payment = new Payment({ 
      userId: user._id, 
      amount, 
      status: 'pending',
      paymentToken,
      expiresAt
    });
    await payment.save();

    // Создаем Payment Intent в Stripe
    const intent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'rub',
      metadata: {
        paymentId: payment._id.toString(),
        userId: user._id.toString(),
        paymentToken: paymentToken
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    payment.providerId = intent.id;
    await payment.save();

    // Возвращаем уникальную ссылку для оплаты
    const paymentUrl = `${req.protocol}://${req.get('host')}/payment/${paymentToken}`;
    
    return res.json({ 
      id: payment._id.toString(),
      paymentUrl, // Ссылка для открытия в новой вкладке
      status: 'requires_payment_method'
    });

  } catch (err: any) {
    console.error('Stripe payment creation error:', err);
    return res.status(500).json({ message: 'Ошибка создания платежа: ' + err.message });
  }
};

// Получение данных платежа по токену (публичный доступ)
export const getPaymentByToken = async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const payment = await Payment.findOne({ 
      paymentToken: token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('userId', 'username');

    if (!payment) {
      return res.status(404).json({ message: 'Платеж не найден или истек' });
    }

    // Получаем clientSecret от Stripe
    let clientSecret = '';
    if (payment.providerId) {
      const intent = await stripe.paymentIntents.retrieve(payment.providerId);
      clientSecret = intent.client_secret || '';
    }

    return res.json({
      id: payment._id.toString(),
      amount: payment.amount,
      clientSecret,
      username: (payment.userId as any).username,
      createdAt: payment.createdAt
    });

  } catch (err) {
    console.error('Get payment by token error:', err);
    return res.status(500).json({ message: 'Ошибка загрузки платежа' });
  }
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
        <html>
          <body>
            <h1>Платеж не найден или истек</h1>
            <p>Ссылка для оплаты недействительна.</p>
          </body>
        </html>
      `);
    }

    // Отдаем HTML страницу для оплаты
    res.send(`
      <!DOCTYPE html>
      <html lang="ru">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Оплата ${payment.amount} ₽ - Casino</title>
          <script src="https://js.stripe.com/v3/"></script>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: #f5f5f5; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh; 
            }
            .payment-container { 
              background: white; 
              padding: 30px; 
              border-radius: 12px; 
              box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
              max-width: 500px; 
              width: 100%; 
            }
            .card-element { 
              padding: 12px; 
              border: 1px solid #ddd; 
              border-radius: 8px; 
              margin: 15px 0; 
            }
            button { 
              width: 100%; 
              padding: 15px; 
              background: #0070f3; 
              color: white; 
              border: none; 
              border-radius: 8px; 
              font-size: 16px; 
              cursor: pointer; 
            }
            button:disabled { 
              background: #ccc; 
              cursor: not-allowed; 
            }
            .error { 
              color: red; 
              margin: 10px 0; 
              text-align: center; 
            }
            .success { 
              color: green; 
              margin: 10px 0; 
              text-align: center; 
            }
            .test-info { 
              background: #f8f9fa; 
              padding: 15px; 
              border-radius: 8px; 
              margin-top: 20px; 
              font-size: 14px; 
            }
          </style>
      </head>
      <body>
          <div class="payment-container">
              <h1>💳 Оплата ${payment.amount} ₽</h1>
              <p>Пополнение счета пользователя</p>
              
              <form id="payment-form">
                  <div class="card-element" id="card-element"></div>
                  <button type="submit" id="submit-button">Оплатить ${payment.amount} ₽</button>
                  <div id="error-message" class="error"></div>
                  <div id="success-message" class="success"></div>
              </form>

              <div class="test-info">
                  <h4>💳 Тестовые карты:</h4>
                  <ul>
                      <li><strong>Успешная оплата:</strong> 4242 4242 4242 4242</li>
                      <li><strong>Недостаточно средств:</strong> 4000 0000 0000 9995</li>
                      <li><strong>CVC:</strong> любые 3 цифры</li>
                      <li><strong>Дата:</strong> любая будущая</li>
                  </ul>
              </div>
          </div>

          <script>
            const stripe = Stripe('${process.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_publishable_key'}');
            const paymentToken = '${token}';
            
            let elements;
            let clientSecret;

            async function initialize() {
                // Загружаем данные платежа
                const response = await fetch('/api/payments/token/' + paymentToken);
                const paymentData = await response.json();
                
                if (!response.ok) {
                    document.getElementById('error-message').textContent = paymentData.message;
                    return;
                }

                clientSecret = paymentData.clientSecret;
                
                // Настраиваем Stripe Elements
                elements = stripe.elements();
                const cardElement = elements.create('card');
                cardElement.mount('#card-element');

                // Обработка формы
                const form = document.getElementById('payment-form');
                form.addEventListener('submit', handleSubmit);
            }

            async function handleSubmit(event) {
                event.preventDefault();
                
                const submitButton = document.getElementById('submit-button');
                const errorMessage = document.getElementById('error-message');
                
                submitButton.disabled = true;
                errorMessage.textContent = '';
                submitButton.textContent = 'Обработка...';

                const { error, paymentIntent } = await stripe.confirmCardPayment(
                    clientSecret,
                    {
                        payment_method: {
                            card: elements.getElement('card'),
                        }
                    }
                );

                if (error) {
                    errorMessage.textContent = error.message;
                    submitButton.disabled = false;
                    submitButton.textContent = 'Оплатить ${payment.amount} ₽';
                } else if (paymentIntent.status === 'succeeded') {
                    document.getElementById('success-message').textContent = '✅ Оплата прошла успешно!';
                    submitButton.textContent = 'Оплачено';
                    
                    // Закрываем окно через 2 секунды
                    setTimeout(() => {
                        if (window.opener) {
                            window.opener.postMessage({ type: 'PAYMENT_SUCCESS' }, '*');
                        }
                        window.close();
                    }, 2000);
                }
            }

            initialize();
          </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Render payment page error:', err);
    return res.status(500).send('Ошибка загрузки страницы оплаты');
  }
};

// ... остальные функции (handleWebhook, handleSuccessfulPayment и т.д.) остаются без изменений
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