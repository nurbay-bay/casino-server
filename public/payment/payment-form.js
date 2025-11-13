class StripePaymentForm {
  constructor() {
    this.token = window.paymentToken;
    this.timerInterval = null;
    this.init();
  }

  async init() {
    const res = await fetch(`/api/payments/token/${this.token}`);
    const data = await res.json();

    if (!res.ok) {
      this.showError(data.message || 'Платёж недоступен');
      return;
    }

    this.amount = data.amount;
    this.clientSecret = data.clientSecret;
    this.invoiceId = data.invoiceId;
    this.expiresIn = data.expiresIn;

    this.updateUI();
    this.setupStripe();
    this.startTimer(this.expiresIn);
  }

  updateUI() {
    document.getElementById('amount-display').textContent = `${this.amount.toLocaleString('ru')} KZT`;
    document.getElementById('invoice-id').textContent = this.invoiceId;
    document.title = `Оплата ${this.invoiceId}`;
  }

  setupStripe() {
    const stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY);
    const elements = stripe.elements();

    const style = {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        '::placeholder': { color: '#9ca3af' },
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      invalid: { color: '#ef4444' }
    };

    this.cardNumber = elements.create('cardNumber', { style });
    this.cardExpiry = elements.create('cardExpiry', { style });
    this.cardCvc = elements.create('cardCvc', { style });

    this.cardNumber.mount('#card-number');
    this.cardExpiry.mount('#card-expiry');
    this.cardCvc.mount('#card-cvc');

    [this.cardNumber, this.cardExpiry, this.cardCvc].forEach(el => {
      el.on('change', e => this.displayError(e.error));
    });

    const form = document.getElementById('payment-form');
    const btn = document.getElementById('submit-btn');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Обработка...';
      this.hideError();

      const name = document.getElementById('card-holder').value.trim();
      const country = document.getElementById('country').value;

      if (!name || name.split(' ').filter(Boolean).length < 2) {
        this.showError('Введите имя и фамилию');
        btn.disabled = false;
        btn.textContent = 'Оплатить';
        return;
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(this.clientSecret, {
        payment_method: {
          card: this.cardNumber,
          billing_details: { name, address: { country } }
        }
      });

      if (error) {
        this.showError(error.message);
        btn.disabled = false;
        btn.textContent = 'Оплатить';
      } else if (paymentIntent.status === 'succeeded') {
        this.showSuccess();
        this.notifyParentAndClose();
      }
    });

    document.getElementById('close-window').addEventListener('click', () => {
      window.close();
    });
  }

  displayError(error) {
    const el = document.getElementById('card-errors');
    el.textContent = error ? error.message : '';
    el.style.color = error ? '#ef4444' : '';
  }

  showError(msg) {
    const el = document.getElementById('card-errors');
    el.textContent = msg;
    el.style.color = '#ef4444';
  }

  showSuccess() {
    const el = document.getElementById('card-errors');
    el.textContent = 'Оплата прошла успешно!';
    el.style.color = '#10b981';
  }

  hideError() {
    document.getElementById('card-errors').textContent = '';
  }

  startTimer(seconds) {
    const el = document.getElementById('timer');
    this.timerInterval = setInterval(() => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
      if (seconds-- <= 0) {
        clearInterval(this.timerInterval);
        this.showError('Время истекло');
        document.getElementById('submit-btn').disabled = true;
      }
    }, 1000);
  }

  notifyParentAndClose() {
    if (window.opener) {
      // ИСПРАВЛЕНО: передаем paymentToken вместо invoiceId
      window.opener.postMessage({ 
        type: 'PAYMENT_SUCCESS', 
        paymentToken: this.token 
      }, '*');
    }
    setTimeout(() => window.close(), 2000);
  }
}

// ИСПРАВЛЕНО: передаем paymentToken при закрытии окна
window.addEventListener('beforeunload', () => {
  if (window.opener && document.getElementById('submit-btn')?.textContent !== 'Обработка...') {
    const form = new StripePaymentForm();
    window.opener.postMessage({ 
      type: 'PAYMENT_CLOSED', 
      paymentToken: window.paymentToken 
    }, '*');
  }
});

// ИСПРАВЛЕНО: используем paymentToken для отмены
window.addEventListener('message', (e) => {
  if (e.data.type === 'PAYMENT_CLOSED' && e.data.paymentToken) {
    fetch(`/api/payments/cancel/${e.data.paymentToken}`, { method: 'POST' });
  }
});

document.addEventListener('DOMContentLoaded', () => new StripePaymentForm());