# @freeinet/cryptocloud-sdk

🚀 Full-featured TypeScript SDK and NestJS module for CryptoCloud integration.

> **Русская версия**: [README.md](./README.md)

## ✨ Features

- 🔧 **Complete API**: Create, retrieve, cancel invoices, statistics, balance, static wallet
- 🔄 **Retry Logic**: Automatic retries with exponential backoff
- 📝 **Logging**: Built-in logging for all operations
- 💾 **Caching**: Optional caching for improved performance
- 🎯 **Webhook Handlers**: Ready-to-use webhook event handlers
- 🧪 **Testing**: Mocks and utilities for testing
- 🏗️ **NestJS Integration**: Ready-to-use module for NestJS applications
- 📚 **TypeScript**: Full typing for all APIs

## 📦 Installation

```bash
# If using npm workspaces
npm run -w @freeinet/cryptocloud-sdk build
```

If the package is published:
```bash
npm i @freeinet/cryptocloud-sdk
```

## 🚀 Quick Start

### Basic Usage

```ts
import { CryptocloudClient } from '@freeinet/cryptocloud-sdk';

const client = new CryptocloudClient({
  apiKey: process.env.CC_API_KEY!,
  apiSecret: process.env.CC_API_SECRET!,
  baseUrl: 'https://api.cryptocloud.plus'
});

// Create invoice
const invoice = await client.createInvoice({ 
  amount: 10, 
  currency: 'USDT',
  description: 'Service payment',
  orderId: 'order-123'
});

// Get invoice information
const invoiceInfo = await client.getInvoice(invoice.id);

// Check status
if (client.isInvoicePaid(invoiceInfo)) {
  console.log('Invoice paid!');
}
```

### With Logging

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

### With Caching

```ts
import { CachedCryptocloudClient, MemoryCache } from '@freeinet/cryptocloud-sdk';

const client = new CachedCryptocloudClient({
  apiKey: process.env.CC_API_KEY!,
  apiSecret: process.env.CC_API_SECRET!,
  cache: new MemoryCache()
});

// Get with caching (5 minutes)
const invoice = await client.getInvoiceWithCache('invoice-id');

// Get balance with caching (1 minute)
const balance = await client.getBalanceWithCache();
```

## 🏗️ NestJS Integration

### Basic Module

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

### Using in Service

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
      description: 'VPN service payment',
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

## 🔗 Webhook Handling

### Basic Webhook Controller

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
    
    // Handle event
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
    // Update order status in database
  }
}
```

### Advanced Handling with Handlers

```ts
import { BaseWebhookHandler, WebhookService, WebhookPayload } from '@freeinet/cryptocloud-sdk';

class PaymentWebhookHandler extends BaseWebhookHandler {
  async onInvoicePaid(payload: WebhookPayload): Promise<void> {
    console.log(`Payment received: ${payload.amount} ${payload.currency}`);
    // Update order status
    // Send notification to user
  }

  async onInvoiceFailed(payload: WebhookPayload): Promise<void> {
    console.log(`Payment failed for invoice ${payload.invoiceId}`);
    // Send error notification
  }
}

// Register handler
const webhookService = new WebhookService();
webhookService.registerHandler('invoice.paid', new PaymentWebhookHandler());
```

## 📊 Advanced Features

### Get Statistics

```ts
const statistics = await client.getStatistics({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

console.log(`Total invoices: ${statistics.totalInvoices}`);
console.log(`Paid invoices: ${statistics.paidInvoices}`);
console.log(`Total amount: ${statistics.totalAmount}`);
```

### Work with Invoice Lists

```ts
const invoices = await client.listInvoices({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  status: 'paid',
  currency: 'USDT',
  offset: 0,
  limit: 50
});

console.log(`Found ${invoices.total} invoices`);
```

### Get Balance

```ts
const balance = await client.getBalance();
balance.balances.forEach(b => {
  console.log(`${b.currency}: ${b.amount}`);
});
```

### Static Wallet Management

```ts
// Create static wallet
const wallet = await client.createStaticWallet({
  currency: 'USDT',
  description: 'Wallet for receiving payments'
});

console.log('Wallet created:', {
  id: wallet.id,
  address: wallet.address,
  qrCode: wallet.qrCode
});

// Get wallet information
const walletInfo = await client.getStaticWallet(wallet.id);

// List all static wallets
const wallets = await client.listStaticWallets();
console.log(`Found ${wallets.total} wallets`);
```

## 🧪 Testing

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

## ⚙️ Configuration

### Environment Variables

```bash
CC_API_KEY=your_api_key
CC_API_SECRET=your_api_secret
CC_BASE_URL=https://api.cryptocloud.plus
CC_TIMEOUT_MS=10000
CC_ENABLE_METRICS=true
```

### Configuration from Environment Variables

```ts
import { CryptocloudConfig } from '@freeinet/cryptocloud-sdk';

const config = CryptocloudConfig.fromEnv();
const client = new CryptocloudClient(config);
```

## 📋 API Reference

### CryptocloudClient

- `createInvoice(payload)` - Create invoice
- `getInvoice(invoiceId)` - Get invoice
- `cancelInvoice(uuid)` - Cancel invoice
- `listInvoices(request)` - List invoices
- `getInvoiceInfo(request)` - Get multiple invoices info
- `getBalance()` - Get balance
- `getStatistics(request)` - Get payment statistics
- `createStaticWallet(request)` - Create static wallet
- `getStaticWallet(walletId)` - Get static wallet
- `listStaticWallets()` - List static wallets
- `verifyCallback(rawBody, signature)` - Verify webhook
- `parseWebhook(json)` - Parse webhook payload

### Utility Methods

- `isInvoicePaid(invoice)` - Check if paid
- `isInvoiceFailed(invoice)` - Check if failed
- `isInvoicePending(invoice)` - Check if pending

## 🔧 Configuration Options

- `apiKey` — string (required) - API key
- `apiSecret` — string (required) - API secret
- `baseUrl` — string, defaults to official API
- `timeoutMs` — number, defaults to 10000
- `logger` — CryptocloudLogger, optional logging
- `enableMetrics` — boolean, enable metrics

## 📄 License

MIT
