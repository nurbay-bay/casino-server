// Фейковая платежная форма
class FakePaymentForm {
  constructor() {
    this.paymentId = window.paymentId;
    this.init();
  }

  init() {
    this.renderForm();
    this.setupEventListeners();
  }

  renderForm() {
    const root = document.getElementById('root');
    root.innerHTML = `
      <div style="max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ddd; border-radius: 12px; font-family: Arial, sans-serif;">
        <h2 style="text-align: center; color: #333;">💳 Тестовая оплата</h2>
        <p style="text-align: center; color: #666;">Имитация платежного шлюза</p>
        
        <form id="paymentForm">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: bold;">Номер карты</label>
            <input 
              type="text" 
              id="cardNumber" 
              placeholder="1234 5678 9012 3456" 
              maxlength="19"
              style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px;"
              required
            >
            <div id="cardError" style="color: red; font-size: 12px; margin-top: 4px;"></div>
          </div>

          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div style="flex: 1;">
              <label style="display: block; margin-bottom: 4px; font-weight: bold;">Срок действия</label>
              <input 
                type="text" 
                id="expiry" 
                placeholder="ММ/ГГ" 
                maxlength="5"
                style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px;"
                required
              >
              <div id="expiryError" style="color: red; font-size: 12px; margin-top: 4px;"></div>
            </div>
            
            <div style="flex: 1;">
              <label style="display: block; margin-bottom: 4px; font-weight: bold;">CVC</label>
              <input 
                type="text" 
                id="cvc" 
                placeholder="123" 
                maxlength="4"
                style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px;"
                required
              >
              <div id="cvcError" style="color: red; font-size: 12px; margin-top: 4px;"></div>
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: bold;">Тестовый сценарий</label>
            <select id="testAction" style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px;">
              <option value="random">Случайный результат</option>
              <option value="success">Всегда успех</option>
              <option value="insufficient_funds">Недостаточно средств</option>
              <option value="network_error">Ошибка сети</option>
              <option value="fraud">Мошенничество</option>
            </select>
          </div>

          <button 
            type="submit" 
            id="submitBtn"
            style="width: 100%; padding: 14px; background: #0070f3; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;"
          >
            Оплатить
          </button>

          <div id="message" style="margin-top: 16px; text-align: center;"></div>
        </form>

        <div style="margin-top: 20px; padding: 12px; background: #f5f5f5; border-radius: 6px; font-size: 12px;">
          <strong>Тестовые данные:</strong><br>
          💳 Номер карты: любые цифры (13-19 символов)<br>
          📅 Срок: будущая дата в формате ММ/ГГ<br>
          🔒 CVC: 3-4 цифры
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Форматирование номера карты
    document.getElementById('cardNumber').addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
      value = value.replace(/(.{4})/g, '$1 ').trim();
      e.target.value = value.substring(0, 19);
      this.validateCardNumber(value);
    });

    // Форматирование срока действия
    document.getElementById('expiry').addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
      e.target.value = value.substring(0, 5);
      this.validateExpiry(value);
    });

    // Валидация CVC
    document.getElementById('cvc').addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
      this.validateCVC(e.target.value);
    });

    // Отправка формы
    document.getElementById('paymentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.processPayment();
    });
  }

  validateCardNumber(number) {
    const errorEl = document.getElementById('cardError');
    const cleaned = number.replace(/\s/g, '');
    
    if (!cleaned) {
      errorEl.textContent = '';
      return false;
    }

    if (!/^\d+$/.test(cleaned)) {
      errorEl.textContent = 'Только цифры';
      return false;
    }

    if (cleaned.length < 13 || cleaned.length > 19) {
      errorEl.textContent = 'Неверная длина номера карты';
      return false;
    }

    errorEl.textContent = '';
    return true;
  }

  validateExpiry(expiry) {
    const errorEl = document.getElementById('expiryError');
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    
    if (!expiry) {
      errorEl.textContent = '';
      return false;
    }

    if (!match) {
      errorEl.textContent = 'Формат: ММ/ГГ';
      return false;
    }

    errorEl.textContent = '';
    return true;
  }

  validateCVC(cvc) {
    const errorEl = document.getElementById('cvcError');
    
    if (!cvc) {
      errorEl.textContent = '';
      return false;
    }

    if (!/^\d+$/.test(cvc)) {
      errorEl.textContent = 'Только цифры';
      return false;
    }

    if (cvc.length < 3) {
      errorEl.textContent = 'Минимум 3 цифры';
      return false;
    }

    errorEl.textContent = '';
    return true;
  }

  async processPayment() {
    const submitBtn = document.getElementById('submitBtn');
    const messageEl = document.getElementById('message');
    
    const cardNumber = document.getElementById('cardNumber').value;
    const expiry = document.getElementById('expiry').value;
    const cvc = document.getElementById('cvc').value;
    const action = document.getElementById('testAction').value;

    // Валидация
    if (!this.validateCardNumber(cardNumber) || 
        !this.validateExpiry(expiry) || 
        !this.validateCVC(cvc)) {
      messageEl.innerHTML = '<span style="color: red;">❌ Исправьте ошибки в форме</span>';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Обработка...';
    messageEl.innerHTML = '<span style="color: blue;">⏳ Обрабатываем платеж...</span>';

    try {
      const response = await fetch('/api/payments/fake-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: this.paymentId,
          cardNumber,
          expiry,
          cvc,
          action
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        messageEl.innerHTML = `<span style="color: green;">✅ ${data.message}</span>`;
        setTimeout(() => {
          window.opener.postMessage({ 
            type: 'PAYMENT_SUCCESS', 
            newBalance: data.newBalance 
          }, '*');
          window.close();
        }, 2000);
      } else {
        messageEl.innerHTML = `<span style="color: red;">❌ ${data.message}</span>`;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Оплатить';
      }
    } catch (error) {
      messageEl.innerHTML = '<span style="color: red;">❌ Ошибка соединения</span>';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Оплатить';
    }
  }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  new FakePaymentForm();
});