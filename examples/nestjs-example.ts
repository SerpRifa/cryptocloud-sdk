/**
 * Пример использования CryptocloudModule в NestJS приложении
 */

import { Body, Controller, Get, Headers, HttpCode, Injectable, Module, Param, Post } from '@nestjs/common';
import { CryptocloudModule, CryptocloudService, WebhookPayload } from '../dist/index.js';

// Пример сервиса для работы с платежами
@Injectable()
export class PaymentService {
  constructor(private readonly cryptocloud: CryptocloudService) {}

  async createPayment(amount: number, currency: string, description: string) {
    const invoice = await this.cryptocloud.createInvoice({
      amount,
      currency,
      description,
      orderId: `order-${Date.now()}`,
      callbackUrl: 'https://your-domain.com/webhooks/cryptocloud',
      successUrl: 'https://your-domain.com/payment/success',
      failUrl: 'https://your-domain.com/payment/failed'
    });

    return {
      invoiceId: invoice.id,
      checkoutUrl: invoice.checkoutUrl,
      status: invoice.status,
      amount: invoice.amount,
      currency: invoice.currency
    };
  }

  async getPaymentStatus(invoiceId: string) {
    const invoice = await this.cryptocloud.getInvoice(invoiceId);
    
    return {
      invoiceId: invoice.id,
      status: invoice.status,
      amount: invoice.amount,
      currency: invoice.currency,
      createdAt: invoice.createdAt,
      isPaid: this.cryptocloud.isInvoicePaid(invoice),
      isFailed: this.cryptocloud.isInvoiceFailed(invoice),
      isPending: this.cryptocloud.isInvoicePending(invoice)
    };
  }

  async cancelPayment(uuid: string) {
    const invoice = await this.cryptocloud.cancelInvoice(uuid);
    return {
      invoiceId: invoice.id,
      status: invoice.status,
      message: 'Платеж отменен'
    };
  }

  async getPaymentStatistics(startDate: string, endDate: string) {
    const statistics = await this.cryptocloud.getStatistics({
      startDate,
      endDate
    });

    return {
      period: { startDate, endDate },
      totalInvoices: statistics.totalInvoices,
      paidInvoices: statistics.paidInvoices,
      successRate: statistics.totalInvoices > 0 
        ? (statistics.paidInvoices / statistics.totalInvoices * 100).toFixed(2) + '%'
        : '0%',
      totalAmount: statistics.totalAmount,
      paidAmount: statistics.paidAmount,
      currencies: statistics.currencies
    };
  }

  async getBalance() {
    const balance = await this.cryptocloud.getBalance();
    return balance.balances.map(b => ({
      currency: b.currency,
      amount: b.amount,
      frozen: b.frozen || 0,
      available: b.amount - (b.frozen || 0)
    }));
  }
}

// Контроллер для работы с платежами
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  async createPayment(@Body() body: { amount: number; currency: string; description: string }) {
    return this.paymentService.createPayment(
      body.amount,
      body.currency,
      body.description
    );
  }

  @Get('status/:invoiceId')
  async getPaymentStatus(@Param('invoiceId') invoiceId: string) {
    return this.paymentService.getPaymentStatus(invoiceId);
  }

  @Post('cancel')
  async cancelPayment(@Body() body: { uuid: string }) {
    return this.paymentService.cancelPayment(body.uuid);
  }

  @Get('statistics')
  async getStatistics(@Body() body: { startDate: string; endDate: string }) {
    return this.paymentService.getPaymentStatistics(body.startDate, body.endDate);
  }

  @Get('balance')
  async getBalance() {
    return this.paymentService.getBalance();
  }
}

// Webhook контроллер
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
    
    // Верификация подписи
    if (!this.cryptocloud.verifyCallback(raw, signature)) {
      console.error('❌ Неверная подпись webhook');
      return { ok: false, error: 'Invalid signature' };
    }

    try {
      const webhookData = this.cryptocloud.parseWebhook(raw);
      console.log('📨 Получен webhook:', {
        event: webhookData.event,
        invoiceId: webhookData.invoiceId,
        status: webhookData.status,
        amount: webhookData.amount,
        currency: webhookData.currency
      });

      // Обработка различных событий
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
        case 'expired':
          await this.handlePaymentExpired(webhookData);
          break;
        default:
          console.log(`ℹ️  Неизвестный статус: ${webhookData.status}`);
      }

      return { ok: true };

    } catch (error) {
      console.error('❌ Ошибка обработки webhook:', error);
      return { ok: false, error: 'Processing error' };
    }
  }

  private async handlePaymentSuccess(payload: WebhookPayload) {
    console.log(`💰 Платеж успешно получен!`);
    console.log(`   Инвойс: ${payload.invoiceId}`);
    console.log(`   Сумма: ${payload.amount} ${payload.currency}`);
    console.log(`   Заказ: ${payload.orderId}`);
    
    // Здесь можно:
    // 1. Обновить статус заказа в базе данных
    // 2. Активировать услуги пользователя
    // 3. Отправить уведомление пользователю
    // 4. Обновить статистику
    
    // Пример:
    // await this.orderService.updateStatus(payload.orderId, 'paid');
    // await this.userService.activateSubscription(payload.orderId);
    // await this.notificationService.sendPaymentSuccess(payload.orderId);
  }

  private async handlePaymentFailed(payload: WebhookPayload) {
    console.log(`❌ Платеж не прошел`);
    console.log(`   Инвойс: ${payload.invoiceId}`);
    console.log(`   Заказ: ${payload.orderId}`);
    
    // Здесь можно:
    // 1. Обновить статус заказа
    // 2. Уведомить пользователя об ошибке
    // 3. Предложить альтернативные способы оплаты
    
    // Пример:
    // await this.orderService.updateStatus(payload.orderId, 'failed');
    // await this.notificationService.sendPaymentFailed(payload.orderId);
  }

  private async handlePaymentCanceled(payload: WebhookPayload) {
    console.log(`🚫 Платеж отменен`);
    console.log(`   Инвойс: ${payload.invoiceId}`);
    console.log(`   Заказ: ${payload.orderId}`);
    
    // Пример:
    // await this.orderService.updateStatus(payload.orderId, 'canceled');
  }

  private async handlePaymentExpired(payload: WebhookPayload) {
    console.log(`⏰ Платеж истек`);
    console.log(`   Инвойс: ${payload.invoiceId}`);
    console.log(`   Заказ: ${payload.orderId}`);
    
    // Пример:
    // await this.orderService.updateStatus(payload.orderId, 'expired');
  }
}

// Основной модуль приложения
@Module({
  imports: [
    CryptocloudModule.register({
      apiKey: process.env.CC_API_KEY!,
      apiSecret: process.env.CC_API_SECRET!,
      baseUrl: process.env.CC_BASE_URL || 'https://api.cryptocloud.plus',
      timeoutMs: parseInt(process.env.CC_TIMEOUT_MS || '10000'),
      logger: {
        info: (msg, meta) => console.log(`[CC-INFO] ${msg}`, meta),
        error: (msg, err) => console.error(`[CC-ERROR] ${msg}`, err),
        warn: (msg, meta) => console.warn(`[CC-WARN] ${msg}`, meta),
        debug: (msg, meta) => console.debug(`[CC-DEBUG] ${msg}`, meta),
      },
      enableMetrics: process.env.CC_ENABLE_METRICS === 'true'
    })
  ],
  controllers: [PaymentController, WebhookController],
  providers: [PaymentService]
})
export class AppModule {}

// Пример использования в main.ts
export const exampleMain = `
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Настройка CORS для webhook'ов
  app.enableCors({
    origin: ['https://api.cryptocloud.plus'],
    methods: ['POST'],
    allowedHeaders: ['Content-Type', 'x-signature']
  });
  
  await app.listen(3000);
  console.log('🚀 Приложение запущено на порту 3000');
}

bootstrap();
`;

// Примеры запросов к API
export const exampleRequests = {
  createPayment: {
    method: 'POST',
    url: '/payments/create',
    body: {
      amount: 10.50,
      currency: 'USDT',
      description: 'Оплата VPN услуг на месяц'
    }
  },
  
  getPaymentStatus: {
    method: 'GET',
    url: '/payments/status/invoice-123'
  },
  
  cancelPayment: {
    method: 'POST',
    url: '/payments/cancel',
    body: {
      uuid: 'invoice-uuid-123'
    }
  },
  
  getStatistics: {
    method: 'GET',
    url: '/payments/statistics',
    body: {
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    }
  },
  
  getBalance: {
    method: 'GET',
    url: '/payments/balance'
  }
};

// Переменные окружения
export const requiredEnvVars = `
# Обязательные переменные
CC_API_KEY=your_cryptocloud_api_key
CC_API_SECRET=your_cryptocloud_api_secret

# Опциональные переменные
CC_BASE_URL=https://api.cryptocloud.plus
CC_TIMEOUT_MS=10000
CC_ENABLE_METRICS=true
`;

export { AppModule, PaymentController, PaymentService, WebhookController };

