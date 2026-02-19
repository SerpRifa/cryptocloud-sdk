# @freeinet/cryptocloud-sdk

TypeScript SDK and NestJS module for working with CryptoCloud API. Handles invoices, webhooks, balance checks, and all the usual stuff you need for crypto payments.

## Installation

If you're using npm workspaces in this repo:

```bash
npm run -w @freeinet/cryptocloud-sdk build
```

Or if it's published to npm:

```bash
npm i @freeinet/cryptocloud-sdk
```

## Quick Start

Basic usage is pretty straightforward:

```ts
import { CryptocloudClient } from '@freeinet/cryptocloud-sdk';

const client = new CryptocloudClient({
  apiKey: process.env.CC_API_KEY!,
  apiSecret: process.env.CC_API_SECRET!,
  baseUrl: 'https://api.cryptocloud.plus'
});

// Create an invoice
const invoice = await client.createInvoice({ 
  amount: 10, 
  currency: 'USDT',
  description: 'Service payment',
  orderId: 'order-123'
});

// Check invoice status
const invoiceInfo = await client.getInvoice(invoice.id);

if (client.isInvoicePaid(invoiceInfo)) {
  console.log('Invoice paid!');
}
```

## Logging

If you want to see what's happening under the hood, you can pass a logger:

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

## Caching

For cases where you're checking the same invoice or balance multiple times, there's a cached client that saves you some API calls:

```ts
import { CachedCryptocloudClient, MemoryCache } from '@freeinet/cryptocloud-sdk';

const client = new CachedCryptocloudClient({
  apiKey: process.env.CC_API_KEY!,
  apiSecret: process.env.CC_API_SECRET!,
  cache: new MemoryCache()
});

// These calls are cached for a few minutes
const invoice = await client.getInvoiceWithCache('invoice-id');
const balance = await client.getBalanceWithCache();
```

## NestJS Integration

If you're using NestJS, there's a module that makes things easier:

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

Then inject it in your services:

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

## Webhooks

Handling webhooks is important for keeping your payment statuses up to date. Here's a basic controller:

```ts
import { Controller, Post, Body, Headers, HttpCode, UnauthorizedException } from '@nestjs/common';
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
    
    // Always verify the signature!
    if (!this.cryptocloud.verifyCallback(raw, signature)) {
      throw new UnauthorizedException('Invalid signature');
    }

    const webhookData = this.cryptocloud.parseWebhook(raw);
    
    // Handle different statuses
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
    // Update your database, send notifications, etc.
  }
}
```

You can also use the handler classes if you prefer a more structured approach:

```ts
import { BaseWebhookHandler, WebhookService, WebhookPayload } from '@freeinet/cryptocloud-sdk';

class PaymentWebhookHandler extends BaseWebhookHandler {
  async onInvoicePaid(payload: WebhookPayload): Promise<void> {
    console.log(`Payment received: ${payload.amount} ${payload.currency}`);
    // Do your thing here
  }

  async onInvoiceFailed(payload: WebhookPayload): Promise<void> {
    console.log(`Payment failed for invoice ${payload.invoiceId}`);
    // Handle failures
  }
}

// Register it
const webhookService = new WebhookService();
webhookService.registerHandler('invoice.paid', new PaymentWebhookHandler());
```

## Other Features

### Statistics

Get payment stats for a date range:

```ts
const statistics = await client.getStatistics({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

console.log(`Total invoices: ${statistics.totalInvoices}`);
console.log(`Paid invoices: ${statistics.paidInvoices}`);
console.log(`Total amount: ${statistics.totalAmount}`);
```

### Listing Invoices

Fetch invoices with filters:

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

### Balance

Check your account balance:

```ts
const balance = await client.getBalance();
balance.balances.forEach(b => {
  console.log(`${b.currency}: ${b.amount}`);
});
```

### Static Wallets

Create and manage static wallets for receiving payments:

```ts
// Create a new wallet
const wallet = await client.createStaticWallet({
  currency: 'USDT',
  description: 'Wallet for receiving payments'
});

console.log('Wallet created:', {
  id: wallet.id,
  address: wallet.address,
  qrCode: wallet.qrCode
});

// Get wallet info
const walletInfo = await client.getStaticWallet(wallet.id);

// List all wallets
const wallets = await client.listStaticWallets();
console.log(`Found ${wallets.total} wallets`);
```

## Testing

There's a mock client for testing that doesn't hit the real API:

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

## Configuration

You can set these environment variables:

```bash
CC_API_KEY=your_api_key
CC_API_SECRET=your_api_secret
CC_BASE_URL=https://api.cryptocloud.plus
CC_TIMEOUT_MS=10000
CC_ENABLE_METRICS=true
```

Or load config from env:

```ts
import { CryptocloudConfig } from '@freeinet/cryptocloud-sdk';

const config = CryptocloudConfig.fromEnv();
const client = new CryptocloudClient(config);
```

## API Methods

### CryptocloudClient

- `createInvoice(payload)` - Create a new invoice
- `getInvoice(invoiceId)` - Get invoice details
- `cancelInvoice(uuid)` - Cancel an invoice
- `listInvoices(request)` - List invoices with filters
- `getInvoiceInfo(request)` - Get info for multiple invoices
- `getBalance()` - Get account balance
- `getStatistics(request)` - Get payment statistics
- `createStaticWallet(request)` - Create a static wallet
- `getStaticWallet(walletId)` - Get wallet details
- `listStaticWallets()` - List all static wallets
- `verifyCallback(rawBody, signature)` - Verify webhook signature
- `parseWebhook(json)` - Parse webhook payload

### Helpers

- `isInvoicePaid(invoice)` - Check if invoice is paid
- `isInvoiceFailed(invoice)` - Check if invoice failed
- `isInvoicePending(invoice)` - Check if invoice is pending

## Configuration Options

- `apiKey` (required) - Your CryptoCloud API key
- `apiSecret` (required) - Your CryptoCloud API secret
- `baseUrl` - API base URL, defaults to the official one
- `timeoutMs` - Request timeout in milliseconds, defaults to 10000
- `logger` - Optional logger instance
- `enableMetrics` - Enable metrics collection

## License

MIT
