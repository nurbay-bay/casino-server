# Документация API для клиентской части

## Базовый URL

```
http://localhost:8000
```

## Аутентификация

Большинство эндпоинтов требуют аутентификации через JWT токен. Токен должен передаваться в заголовке `Authorization`:

```
Authorization: Bearer <your_jwt_token>
```

После успешной регистрации/логина токен сохраняется и используется для всех последующих запросов.

---

## 🔐 API Аутентификации (`/api/auth`)

### 1. Регистрация

**POST** `/api/auth/register`

Создает нового пользователя и отправляет SMS код для верификации.

**Тело запроса:**
```json
{
  "username": "john_doe",
  "phone": "+77001234567",
  "password": "password123",
  "birthDate": "2000-01-15"
}
```

**Валидация:**
- `username`: минимум 3 символа, только латиница, цифры и подчеркивание
- `phone`: валидный номер телефона
- `password`: минимум 6 символов
- `birthDate`: формат ISO8601 (YYYY-MM-DD), пользователь должен быть старше 18 лет

**Успешный ответ (200):**
```json
{
  "message": "Код отправлен",
  "phone": "+77001234567"
}
```

**Ошибки:**
- `400` - Неверные данные или пользователь уже существует
- `403` - Возрастное ограничение (AGE_RESTRICTED)
- `429` - Слишком много запросов (rate limit)

**Пример:**
```javascript
const response = await fetch('http://localhost:8000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'john_doe',
    phone: '+77001234567',
    password: 'password123',
    birthDate: '2000-01-15'
  })
});

const data = await response.json();
```

---

### 2. Верификация телефона

**POST** `/api/auth/verify`

Подтверждает номер телефона SMS кодом и возвращает JWT токен.

**Тело запроса:**
```json
{
  "phone": "+77001234567",
  "code": "123456"
}
```

**Успешный ответ (200):**
```json
{
  "message": "Verified",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "phone": "+77001234567",
    "balance": 0,
    "birthDate": "2000-01-15T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Ошибки:**
- `400` - Неверный или истекший код
- `404` - Пользователь не найден
- `429` - Слишком много запросов

**Пример:**
```javascript
const response = await fetch('http://localhost:8000/api/auth/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phone: '+77001234567',
    code: '123456'
  })
});

const data = await response.json();
// Сохранить токен: localStorage.setItem('token', data.token);
```

---

### 3. Вход в систему

**POST** `/api/auth/login`

Авторизует пользователя и возвращает JWT токен.

**Тело запроса:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Успешный ответ (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "phone": "+77001234567",
    "balance": 1000,
    "birthDate": "2000-01-15T00:00:00.000Z"
  }
}
```

**Ошибки:**
- `400` - Отсутствуют поля
- `401` - Неверные учетные данные
- `403` - Аккаунт не верифицирован (NOT_VERIFIED)
- `404` - Пользователь не найден

**Пример:**
```javascript
const response = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'john_doe',
    password: 'password123'
  })
});

const data = await response.json();
localStorage.setItem('token', data.token);
```

---

### 4. Получить профиль

**GET** `/api/auth/profile`

**Требует аутентификации:** ✅

Возвращает информацию о текущем пользователе.

**Успешный ответ (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "phone": "+77001234567",
    "balance": 1000,
    "birthDate": "2000-01-15T00:00:00.000Z"
  }
}
```

**Пример:**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:8000/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
```

---

### 5. Изменить пароль

**POST** `/api/auth/change-password`

**Требует аутентификации:** ✅

**Тело запроса:**
```json
{
  "oldPassword": "password123",
  "newPassword": "newpassword456"
}
```

**Валидация:**
- `newPassword`: минимум 6 символов

**Успешный ответ (200):**
```json
{
  "message": "Пароль изменён"
}
```

**Ошибки:**
- `400` - Неверные данные
- `401` - Неверный старый пароль

---

### 6. Изменить номер телефона

**POST** `/api/auth/change-phone`

**Требует аутентификации:** ✅

Отправляет SMS код на новый номер телефона.

**Тело запроса:**
```json
{
  "newPhone": "+77009876543"
}
```

**Успешный ответ (200):**
```json
{
  "message": "Код отправлен на новый номер"
}
```

**Ошибки:**
- `400` - Номер уже занят или не указан
- `429` - Слишком много запросов

---

### 7. Подтвердить смену телефона

**POST** `/api/auth/verify-phone-change`

**Требует аутентификации:** ✅

Подтверждает смену телефона SMS кодом.

**Тело запроса:**
```json
{
  "code": "123456"
}
```

**Успешный ответ (200):**
```json
{
  "message": "Телефон обновлён"
}
```

**Ошибки:**
- `400` - Неверный код или запрос истек

---

## 💳 API Платежей (`/api/payments`)

### 1. Создать платеж

**POST** `/api/payments/create`

**Требует аутентификации:** ✅

Создает новый платеж и возвращает URL для оплаты.

**Тело запроса:**
```json
{
  "amount": 5000
}
```

**Валидация:**
- `amount`: должно быть больше 0

**Успешный ответ (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "paymentUrl": "http://localhost:8000/payment/page/abc123...",
  "invoiceId": "INV-20240115-123456",
  "status": "requires_payment_method"
}
```

**Ошибки:**
- `400` - Неверная сумма
- `500` - Ошибка сервера

**Пример:**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:8000/api/payments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    amount: 5000
  })
});

const data = await response.json();
// Открыть окно оплаты: window.open(data.paymentUrl, '_blank');
```

**Обработка успешной оплаты:**
```javascript
// Слушаем сообщения от окна оплаты
window.addEventListener('message', (event) => {
  if (event.data.type === 'PAYMENT_SUCCESS') {
    // Обновить баланс пользователя
    fetchProfile();
    alert('Платеж успешно выполнен!');
  }
});
```

---

### 2. Получить историю платежей

**GET** `/api/payments/user/:userId`

**Требует аутентификации:** ✅

Возвращает историю платежей пользователя. **Важно:** Перед возвратом автоматически проверяет и отменяет истекшие платежи, поэтому всегда возвращает актуальные статусы.

**Параметры URL:**
- `userId` - ID пользователя (должен совпадать с текущим пользователем)

**Успешный ответ (200):**
```json
{
  "payments": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "amount": 5000,
      "status": "success",
      "invoiceId": "INV-20240115-123456",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "expiresAt": "2024-01-15T10:45:00.000Z"
    }
  ]
}
```

**Статусы платежа:**
- `pending` - Ожидает оплаты
- `success` - Успешно оплачен
- `failed` - Ошибка оплаты
- `canceled` - Отменен

**Ошибки:**
- `403` - Нет доступа к чужим платежам

**Пример:**
```javascript
const token = localStorage.getItem('token');
const userId = '507f1f77bcf86cd799439012';
const response = await fetch(`http://localhost:8000/api/payments/user/${userId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
```

---

### 3. Получить статус платежа по ID

**GET** `/api/payments/status/:paymentId`

**Требует аутентификации:** ✅

Возвращает статус конкретного платежа по его ID. **Важно:** Автоматически проверяет и отменяет истекшие pending платежи перед возвратом.

**Параметры URL:**
- `paymentId` - ID платежа

**Успешный ответ (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "status": "success",
  "amount": 5000
}
```

**Статусы:**
- `pending` - Ожидает оплаты
- `success` - Успешно оплачен
- `failed` - Ошибка оплаты
- `canceled` - Отменен (истек или отменен вручную)

**Ошибки:**
- `403` - Доступ запрещен (не ваш платеж)
- `404` - Платеж не найден

**Пример:**
```javascript
const token = localStorage.getItem('token');
const paymentId = '507f1f77bcf86cd799439011';
const response = await fetch(`http://localhost:8000/api/payments/status/${paymentId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
console.log(`Статус платежа: ${data.status}`);
```

**Использование для polling:**
```javascript
// Polling статуса каждые 3 секунды
const checkPaymentStatus = async (paymentId) => {
  const interval = setInterval(async () => {
    const response = await fetch(`http://localhost:8000/api/payments/status/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.status === 'success' || data.status === 'canceled') {
      clearInterval(interval);
      // Обновить UI
    }
  }, 3000);
};
```

---

### 4. Получить данные платежа по токену (публичный)

**GET** `/api/payments/token/:token`

**Публичный эндпоинт** - не требует аутентификации

Используется платежной страницей для получения данных платежа. **Важно:** Если платеж уже завершен (success/failed/canceled), возвращает его статус. Если pending платеж истек, автоматически отменяет его.

**Параметры URL:**
- `token` - Токен платежа

**Успешный ответ (200) для pending платежа:**
```json
{
  "amount": 5000,
  "clientSecret": "pi_xxx_secret_xxx",
  "invoiceId": "INV-20240115-123456",
  "status": "pending",
  "expiresIn": 900
}
```

**Успешный ответ (200) для завершенного платежа:**
```json
{
  "amount": 5000,
  "invoiceId": "INV-20240115-123456",
  "status": "success",
  "expiresIn": 0
}
```

**Ошибки:**
- `400` - Платеж еще не инициализирован
- `404` - Платеж не найден
- `410` - Платеж истек и был отменен (возвращает `status: "canceled"`)

---

### 5. Отменить платеж

**POST** `/api/payments/cancel/:token`

**Публичный эндпоинт** - не требует аутентификации

Отменяет платеж по токену.

**Параметры URL:**
- `token` - Токен платежа

**Успешный ответ (200):**
```json
{
  "message": "Платёж отменён"
}
```

**Ошибки:**
- `404` - Платеж не найден

---

## 🎮 API Игр (`/api/games`)

### 1. Играть

**POST** `/api/games/play`

**Требует аутентификации:** ✅

Выполняет ставку в игре.

**Тело запроса:**
```json
{
  "game": "slots",
  "bet": 100
}
```

**Параметры:**
- `game`: `"slots"` или `"plinko"`
- `bet`: сумма ставки (число > 0)

**Успешный ответ (200) для Slots:**
```json
{
  "game": "slots",
  "result": "win",
  "amountWon": 300,
  "newBalance": 1200,
  "details": {
    "symbols": ["🍒", "🍒", "🍒"],
    "multiplier": 3
  },
  "historyEntry": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "game": "slots",
    "bet": 100,
    "multiplier": 3,
    "result": "win",
    "amountWon": 300,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Успешный ответ (200) для Plinko:**
```json
{
  "game": "plinko",
  "result": "win",
  "amountWon": 120,
  "newBalance": 1020,
  "details": {
    "multiplier": 1.2,
    "cell": 2,
    "path": [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
  },
  "historyEntry": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "game": "plinko",
    "bet": 100,
    "multiplier": 1.2,
    "result": "win",
    "amountWon": 120,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Ошибки:**
- `400` - Неверные данные или недостаточно средств
- `401` - Не авторизован

**Пример:**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:8000/api/games/play', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    game: 'slots',
    bet: 100
  })
});

const data = await response.json();
if (data.result === 'win') {
  console.log(`Выигрыш: ${data.amountWon} KZT`);
} else {
  console.log('Проигрыш');
}
console.log(`Новый баланс: ${data.newBalance} KZT`);
```

---

### 2. Получить историю игр

**GET** `/api/games/history`

**Требует аутентификации:** ✅

Возвращает последние 100 игр пользователя.

**Успешный ответ (200):**
```json
{
  "bets": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "game": "slots",
      "bet": 100,
      "multiplier": 3,
      "result": "win",
      "amountWon": 300,
      "details": {
        "symbols": ["🍒", "🍒", "🍒"],
        "multiplier": 3
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Пример:**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:8000/api/games/history', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
data.bets.forEach(bet => {
  console.log(`${bet.game}: ${bet.bet} KZT, результат: ${bet.result}`);
});
```

---

## 🔍 Дополнительные эндпоинты

### Health Check

**GET** `/api/health`

Проверка работоспособности сервера.

**Успешный ответ (200):**
```json
{
  "status": "ok"
}
```

---

## ⚠️ Обработка ошибок

Все ошибки возвращаются в формате:

```json
{
  "message": "Описание ошибки"
}
```

**Коды статусов:**
- `200` - Успех
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Не найдено
- `410` - Истек (для платежей)
- `429` - Слишком много запросов
- `500` - Ошибка сервера

**Пример обработки ошибок:**
```javascript
async function makeRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Ошибка запроса');
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка:', error.message);
    throw error;
  }
}
```

---

## 📝 Примеры использования

### Полный цикл регистрации и игры

```javascript
// 1. Регистрация
const registerResponse = await fetch('http://localhost:8000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'player1',
    phone: '+77001234567',
    password: 'password123',
    birthDate: '2000-01-15'
  })
});
const registerData = await registerResponse.json();
console.log(registerData.message); // "Код отправлен"

// 2. Верификация (после получения SMS кода)
const verifyResponse = await fetch('http://localhost:8000/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '+77001234567',
    code: '123456' // код из SMS
  })
});
const verifyData = await verifyResponse.json();
const token = verifyData.token;
localStorage.setItem('token', token);

// 3. Пополнение баланса
const paymentResponse = await fetch('http://localhost:8000/api/payments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ amount: 5000 })
});
const paymentData = await paymentResponse.json();
window.open(paymentData.paymentUrl, '_blank');

// 4. Игра после пополнения
const playResponse = await fetch('http://localhost:8000/api/games/play', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    game: 'slots',
    bet: 100
  })
});
const playData = await playResponse.json();
console.log(`Результат: ${playData.result}, Выигрыш: ${playData.amountWon} KZT`);
```

---

## 🔒 Безопасность

1. **Токены**: Храните JWT токены безопасно (localStorage или httpOnly cookies)
2. **HTTPS**: В продакшене используйте HTTPS
3. **Rate Limiting**: Некоторые эндпоинты имеют ограничение запросов (10 запросов в 15 минут)
4. **Валидация**: Всегда валидируйте данные на клиенте перед отправкой

---

## 📌 Важные замечания

1. **Платежи**: Платежи автоматически отменяются через 15 минут, если не были оплачены
2. **Верификация**: Пользователь не может войти в систему без верификации телефона
3. **Баланс**: Баланс обновляется автоматически после успешной оплаты через Stripe webhook
4. **Игры**: Минимальная ставка - 1, максимальная - текущий баланс пользователя

