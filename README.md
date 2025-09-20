# @freeinet/cryptocloud-sdk

🚀 Полнофункциональный TypeScript SDK и NestJS модуль для интеграции с CryptoCloud.

> **English version**: [README.en.md](./README.en.md)

## ✨ Возможности

- 🔧 **Полный API**: Создание, получение, отмена инвойсов, статистика, баланс, статический кошелек
- 🔄 **Retry логика**: Автоматические повторные попытки с экспоненциальной задержкой
- 📝 **Логирование**: Встроенное логирование всех операций
- 💾 **Кэширование**: Опциональное кэширование для повышения производительности
- 🎯 **Webhook обработчики**: Готовые обработчики для webhook событий
- 🧪 **Тестирование**: Моки и утилиты для тестирования
- 🏗️ **NestJS интеграция**: Готовый модуль для NestJS приложений
- 📚 **TypeScript**: Полная типизация всех API

## 📦 Установка

```bash
# Если используете npm workspaces
npm run -w @freeinet/cryptocloud-sdk build
```

Если пакет опубликован:
```bash
npm i @freeinet/cryptocloud-sdk
```

## 🚀 Быстрый старт

### Базовое использование

```ts
import { CryptocloudClient } from '@freeinet/cryptocloud-sdk';

const client = new CryptocloudClient({
  apiKey: process.env.CC_API_KEY!,
  apiSecret: process.env.CC_API_SECRET!,
  baseUrl: 'https://api.cryptocloud.plus'
});

// Создание инвойса
const invoice = await client.createInvoice({ 
  amount: 10, 
  currency: 'USDT',
  description: 'Оплата услуг',
  orderId: 'order-123'
});

// Получение информации об инвойсе
const invoiceInfo = await client.getInvoice(invoice.id);

// Проверка статуса
if (client.isInvoicePaid(invoiceInfo)) {
  console.log('Инвойс оплачен!');
}
```

### С логированием

```ts
import { CryptocloudClient, CryptocloudLogger } from '@freeinet/cryptocloud-sdk';

const logger: CryptocloudLogger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta),
  debug: (msg, meta) => console.debug(`[DEBUG] ${msg}`, meta),
};

const client = new CryptocloudClient({
  apiKey: process.env.CC_API_KEY!,
  apiSecret: process.env.CC_API_SECRET!,
  logger,
  enableMetrics: true
});
```

### С кэшированием

```ts
import { CachedCryptocloudClient, MemoryCache } from '@freeinet/cryptocloud-sdk';

const client = new CachedCryptocloudClient({
  apiKey: process.env.CC_API_KEY!,
  apiSecret: process.env.CC_API_SECRET!,
  cache: new MemoryCache()
});

// Получение с кэшированием (5 минут)
const invoice = await client.getInvoiceWithCache('invoice-id');

// Получение баланса с кэшированием (1 минута)
const balance = await client.getBalanceWithCache();
```

## 🏗️ NestJS интеграция

### Базовый модуль

```ts
import { Module } from '@nestjs/common';
import { CryptocloudModule } from '@freeinet/cryptocloud-sdk';

@Module({
  imports: [
    CryptocloudModule.register({
      apiKey: process.env.CC_API_KEY!,
      apiSecret: process.env.CC_API_SECRET!,
      logger: {
        info: (msg, meta) => console.log(`[INFO] ${msg}`, meta),
        error: (msg, err) => console.error(`[ERROR] ${msg}`, err),
        warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta),
        debug: (msg, meta) => console.debug(`[DEBUG] ${msg}`, meta),
      }
    })
  ]
})
export class AppModule {}
```

### Использование в сервисе

```ts
import { Injectable } from '@nestjs/common';
import { CryptocloudService } from '@freeinet/cryptocloud-sdk';

@Injectable()
export class PaymentService {
  constructor(private readonly cryptocloud: CryptocloudService) {}

  async createPayment(amount: number, currency: string) {
    const invoice = await this.cryptocloud.createInvoice({
      amount,
      currency,
      description: 'Оплата услуг VPN',
      orderId: `order-${Date.now()}`
    });

    return {
      invoiceId: invoice.id,
      checkoutUrl: invoice.checkoutUrl,
      status: invoice.status
    };
  }

  async getPaymentStatus(invoiceId: string) {
    const invoice = await this.cryptocloud.getInvoice(invoiceId);
    return {
      status: invoice.status,
      isPaid: this.cryptocloud.isInvoicePaid(invoice),
      isFailed: this.cryptocloud.isInvoiceFailed(invoice)
    };
  }
}
```

## 🔗 Webhook обработка

### Базовый webhook контроллер

```ts
import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { CryptocloudService, WebhookPayload } from '@freeinet/cryptocloud-sdk';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly cryptocloud: CryptocloudService) {}

  @Post('cryptocloud')
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: any, 
    @Headers('x-signature') signature?: string
  ) {
    const raw = JSON.stringify(payload);
    
    if (!this.cryptocloud.verifyCallback(raw, signature)) {
      throw new UnauthorizedException('Invalid signature');
    }

    const webhookData = this.cryptocloud.parseWebhook(raw);
    
    // Обработка события
    switch (webhookData.status) {
      case 'paid':
        await this.handlePaymentSuccess(webhookData);
        break;
      case 'failed':
        await this.handlePaymentFailed(webhookData);
        break;
      case 'canceled':
        await this.handlePaymentCanceled(webhookData);
        break;
    }

    return { ok: true };
  }

  private async handlePaymentSuccess(payload: WebhookPayload) {
    console.log(`Payment successful for invoice ${payload.invoiceId}`);
    // Обновление статуса в базе данных
  }
}
```

### Расширенная обработка с обработчиками

```ts
import { BaseWebhookHandler, WebhookService, WebhookPayload } from '@freeinet/cryptocloud-sdk';

class PaymentWebhookHandler extends BaseWebhookHandler {
  async onInvoicePaid(payload: WebhookPayload): Promise<void> {
    console.log(`Payment received: ${payload.amount} ${payload.currency}`);
    // Обновление статуса заказа
    // Отправка уведомления пользователю
  }

  async onInvoiceFailed(payload: WebhookPayload): Promise<void> {
    console.log(`Payment failed for invoice ${payload.invoiceId}`);
    // Уведомление об ошибке
  }
}

// Регистрация обработчика
const webhookService = new WebhookService();
webhookService.registerHandler('invoice.paid', new PaymentWebhookHandler());
```

## 📊 Расширенные возможности

### Получение статистики

```ts
const statistics = await client.getStatistics({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

console.log(`Всего инвойсов: ${statistics.totalInvoices}`);
console.log(`Оплачено: ${statistics.paidInvoices}`);
console.log(`Общая сумма: ${statistics.totalAmount}`);
```

### Работа со списком инвойсов

```ts
const invoices = await client.listInvoices({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  status: 'paid',
  currency: 'USDT',
  offset: 0,
  limit: 50
});

console.log(`Найдено ${invoices.total} инвойсов`);
```

### Получение баланса

```ts
const balance = await client.getBalance();
balance.balances.forEach(b => {
  console.log(`${b.currency}: ${b.amount}`);
});
```

### Работа со статическим кошельком

```ts
// Создание статического кошелька
const wallet = await client.createStaticWallet({
  currency: 'USDT',
  description: 'Кошелек для приема платежей'
});

console.log('Создан кошелек:', {
  id: wallet.id,
  address: wallet.address,
  qrCode: wallet.qrCode
});

// Получение информации о кошельке
const walletInfo = await client.getStaticWallet(wallet.id);

// Список всех статических кошельков
const wallets = await client.listStaticWallets();
console.log(`Найдено ${wallets.total} кошельков`);
```

## 🧪 Тестирование

```ts
import { MockCryptocloudClient, TestDataFactory } from '@freeinet/cryptocloud-sdk';

describe('PaymentService', () => {
  let client: MockCryptocloudClient;

  beforeEach(() => {
    client = new MockCryptocloudClient({
      apiKey: 'test-key',
      apiSecret: 'test-secret'
    });
  });

  it('should create invoice', async () => {
    const invoice = await client.createInvoice({
      amount: 10,
      currency: 'USDT'
    });

    expect(invoice.amount).toBe(10);
    expect(invoice.currency).toBe('USDT');
    expect(invoice.status).toBe('pending');
  });

  it('should handle payment success', async () => {
    const invoice = TestDataFactory.createTestInvoice({ status: 'paid' });
    client.addInvoice(invoice);

    const result = await client.getInvoice(invoice.id);
    expect(client.isInvoicePaid(result)).toBe(true);
  });
});
```

## ⚙️ Конфигурация

### Переменные окружения

```bash
CC_API_KEY=your_api_key
CC_API_SECRET=your_api_secret
CC_BASE_URL=https://api.cryptocloud.plus
CC_TIMEOUT_MS=10000
CC_ENABLE_METRICS=true
```

### Конфигурация из переменных окружения

```ts
import { CryptocloudConfig } from '@freeinet/cryptocloud-sdk';

const config = CryptocloudConfig.fromEnv();
const client = new CryptocloudClient(config);
```

## 📋 API Reference

### CryptocloudClient

- `createInvoice(payload)` - Создание инвойса
- `getInvoice(invoiceId)` - Получение инвойса
- `cancelInvoice(uuid)` - Отмена инвойса
- `listInvoices(request)` - Список инвойсов
- `getInvoiceInfo(request)` - Информация о нескольких инвойсах
- `getBalance()` - Получение баланса
- `getStatistics(request)` - Статистика платежей
- `createStaticWallet(request)` - Создание статического кошелька
- `getStaticWallet(walletId)` - Получение статического кошелька
- `listStaticWallets()` - Список статических кошельков
- `verifyCallback(rawBody, signature)` - Верификация webhook
- `parseWebhook(json)` - Парсинг webhook payload

### Утилитарные методы

- `isInvoicePaid(invoice)` - Проверка оплаты
- `isInvoiceFailed(invoice)` - Проверка ошибки
- `isInvoicePending(invoice)` - Проверка ожидания

## 🔧 Опции конфигурации

- `apiKey` — string (обязательно) - API ключ
- `apiSecret` — string (обязательно) - API секрет
- `baseUrl` — string, по умолчанию официальный API
- `timeoutMs` — number, по умолчанию 10000
- `logger` — CryptocloudLogger, опциональное логирование
- `enableMetrics` — boolean, включение метрик

## 📄 Лицензия

MIT
