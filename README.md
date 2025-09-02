# @freeinet/cryptocloud-sdk

Легкий TypeScript SDK и NestJS-модуль для интеграции с CryptoCloud.

## Установка

```powershell
# если используется npm workspaces
npm run -w @freeinet/cryptocloud-sdk build
```

Если пакет опубликован:
```powershell
npm i @freeinet/cryptocloud-sdk
```

## Быстрый старт (SDK)

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

## Webhook валидация

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

## Опции
- apiKey — строка (обяз.)
- apiSecret — строка (обяз.)
- baseUrl — string, по умолчанию официальный
- timeoutMs — number, по умолчанию 10000

## Лицензия
MIT
