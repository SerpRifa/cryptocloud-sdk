# @freeinet/cryptocloud-sdk

Lightweight TypeScript SDK and NestJS module for CryptoCloud integration.

## Installation

```bash
# if using npm workspaces
npm run -w @freeinet/cryptocloud-sdk build
```

If the package is published:
```bash
npm i @freeinet/cryptocloud-sdk
```

## Quick Start (SDK)

```ts
import { CryptocloudClient } from '@freeinet/cryptocloud-sdk';

const client = new CryptocloudClient({
  apiKey: process.env.CC_API_KEY!,
  apiSecret: process.env.CC_API_SECRET!,
  baseUrl: 'https://api.cryptocloud.plus'
});

const invoice = await client.createInvoice({ amount: 10, currency: 'USDT' });
```

## NestJS

```ts
import { Module } from '@nestjs/common';
import { CryptocloudModule } from '@freeinet/cryptocloud-sdk';

@Module({
  imports: [
    CryptocloudModule.register({
      apiKey: process.env.CC_API_KEY!,
      apiSecret: process.env.CC_API_SECRET!
    })
  ]
})
export class AppModule {}
```

## Webhook Validation

```ts
@Post('cryptocloud/webhook')
async onWebhook(@Body() payload: any, @Headers('x-signature') sig: string) {
  const raw = JSON.stringify(payload);
  if (!this.cryptocloudService.verifyCallback(raw, sig)) {
    throw new UnauthorizedException('Invalid signature');
  }
  // handle event
}
```

## Options
- apiKey — string (required)
- apiSecret — string (required)
- baseUrl — string, defaults to official API
- timeoutMs — number, defaults to 10000

## License
MIT
