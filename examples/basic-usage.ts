/**
 * Пример базового использования CryptocloudClient
 */

import {
    BaseWebhookHandler,
    CachedCryptocloudClient,
    CryptocloudClient,
    CryptocloudConfig,
    MemoryCache,
    WebhookPayload,
    WebhookService
} from '../dist/index.js';

// Пример 1: Базовое использование
async function basicExample() {
  console.log('=== Базовое использование ===');
  
  const client = new CryptocloudClient({
    apiKey: process.env.CC_API_KEY!,
    apiSecret: process.env.CC_API_SECRET!,
    logger: {
      info: (msg, meta) => console.log(`[INFO] ${msg}`, meta),
      error: (msg, err) => console.error(`[ERROR] ${msg}`, err),
      warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta),
      debug: (msg, meta) => console.debug(`[DEBUG] ${msg}`, meta),
    }
  });

  try {
    // Создание инвойса
    const invoice = await client.createInvoice({
      amount: 10.50,
      currency: 'USDT',
      description: 'Оплата VPN услуг',
      orderId: `order-${Date.now()}`
    });

    console.log('Создан инвойс:', {
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      checkoutUrl: invoice.checkoutUrl
    });

    // Получение информации об инвойсе
    const invoiceInfo = await client.getInvoice(invoice.id);
    console.log('Информация об инвойсе:', invoiceInfo);

    // Проверка статуса
    if (client.isInvoicePaid(invoiceInfo)) {
      console.log('✅ Инвойс оплачен!');
    } else if (client.isInvoiceFailed(invoiceInfo)) {
      console.log('❌ Инвойс не оплачен');
    } else {
      console.log('⏳ Инвойс в ожидании');
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

// Пример 2: Использование с кэшированием
async function cachingExample() {
  console.log('\n=== Использование с кэшированием ===');
  
  const client = new CachedCryptocloudClient({
    apiKey: process.env.CC_API_KEY!,
    apiSecret: process.env.CC_API_SECRET!,
    cache: new MemoryCache()
  });

  try {
    // Получение баланса с кэшированием
    const balance = await client.getBalanceWithCache();
    console.log('Баланс:', balance.balances);

    // Получение статистики с кэшированием
    const statistics = await client.getStatisticsWithCache({
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    });

    console.log('Статистика:', {
      totalInvoices: statistics.totalInvoices,
      paidInvoices: statistics.paidInvoices,
      totalAmount: statistics.totalAmount,
      paidAmount: statistics.paidAmount
    });

    // Размер кэша
    const cacheSize = client.getCacheSize();
    console.log('Размер кэша:', cacheSize);

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

// Пример 3: Работа со списком инвойсов
async function listInvoicesExample() {
  console.log('\n=== Работа со списком инвойсов ===');
  
  const client = new CryptocloudClient({
    apiKey: process.env.CC_API_KEY!,
    apiSecret: process.env.CC_API_SECRET!
  });

  try {
    const invoices = await client.listInvoices({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      status: 'paid',
      currency: 'USDT',
      offset: 0,
      limit: 10
    });

    console.log(`Найдено ${invoices.total} инвойсов:`);
    invoices.invoices.forEach(invoice => {
      console.log(`- ${invoice.id}: ${invoice.amount} ${invoice.currency} (${invoice.status})`);
    });

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

// Пример 4: Webhook обработчики
class PaymentWebhookHandler extends BaseWebhookHandler {
  async onInvoicePaid(payload: WebhookPayload): Promise<void> {
    console.log(`💰 Платеж получен: ${payload.amount} ${payload.currency}`);
    console.log(`📄 Инвойс: ${payload.invoiceId}`);
    console.log(`🆔 Заказ: ${payload.orderId}`);
    
    // Здесь можно обновить статус в базе данных
    // await this.updateOrderStatus(payload.orderId, 'paid');
  }

  async onInvoiceFailed(payload: WebhookPayload): Promise<void> {
    console.log(`❌ Платеж не прошел для инвойса: ${payload.invoiceId}`);
    
    // Здесь можно уведомить пользователя об ошибке
    // await this.notifyUser(payload.orderId, 'payment_failed');
  }

  async onInvoiceCanceled(payload: WebhookPayload): Promise<void> {
    console.log(`🚫 Платеж отменен для инвойса: ${payload.invoiceId}`);
  }
}

async function webhookExample() {
  console.log('\n=== Webhook обработчики ===');
  
  const webhookService = new WebhookService();
  const handler = new PaymentWebhookHandler();
  
  // Регистрация обработчика
  webhookService.registerHandler('invoice.paid', handler);
  webhookService.registerHandler('invoice.failed', handler);
  webhookService.registerHandler('invoice.canceled', handler);

  // Симуляция webhook события
  const mockWebhookPayload: WebhookPayload = {
    event: 'invoice.paid',
    invoiceId: 'test-invoice-123',
    uuid: 'test-uuid-123',
    status: 'paid',
    amount: 10.50,
    currency: 'USDT',
    createdAt: new Date().toISOString(),
    orderId: 'order-123'
  };

  await webhookService.processWebhook(mockWebhookPayload);
  
  console.log('Зарегистрированные события:', webhookService.getRegisteredEvents());
}

// Пример 5: Конфигурация из переменных окружения
async function configExample() {
  console.log('\n=== Конфигурация из переменных окружения ===');
  
  try {
    const config = CryptocloudConfig.fromEnv();
    console.log('Конфигурация загружена:', {
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      enableMetrics: config.enableMetrics
    });

    const client = new CryptocloudClient(config);
    console.log('Клиент создан с конфигурацией из env');

  } catch (error) {
    console.error('Ошибка загрузки конфигурации:', error);
  }
}

// Запуск всех примеров
async function runExamples() {
  console.log('🚀 Запуск примеров использования CryptocloudClient\n');
  
  // Проверяем наличие переменных окружения
  if (!process.env.CC_API_KEY || !process.env.CC_API_SECRET) {
    console.log('⚠️  Переменные окружения CC_API_KEY и CC_API_SECRET не установлены');
    console.log('   Примеры будут запущены только для демонстрации API');
  }

  await basicExample();
  await cachingExample();
  await listInvoicesExample();
  await webhookExample();
  await configExample();
  
  console.log('\n✅ Все примеры выполнены!');
}

// Экспорт для использования в других модулях
export {
    basicExample,
    cachingExample, configExample, listInvoicesExample, PaymentWebhookHandler, webhookExample
};

// Запуск если файл выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}
