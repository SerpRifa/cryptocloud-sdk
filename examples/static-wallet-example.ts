/**
 * Пример использования статического кошелька
 */

import { CryptocloudClient } from '../dist/index.js';

async function staticWalletExample() {
  console.log('=== Пример работы со статическим кошельком ===');
  
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
    // Создание статического кошелька для USDT
    console.log('1. Создание статического кошелька...');
    const wallet = await client.createStaticWallet({
      currency: 'USDT',
      description: 'Кошелек для приема платежей от клиентов'
    });

    console.log('✅ Кошелек создан:', {
      id: wallet.id,
      currency: wallet.currency,
      address: wallet.address,
      description: wallet.description,
      createdAt: wallet.createdAt
    });

    // Получение информации о кошельке
    console.log('\n2. Получение информации о кошельке...');
    const walletInfo = await client.getStaticWallet(wallet.id);
    console.log('📄 Информация о кошельке:', {
      id: walletInfo.id,
      address: walletInfo.address,
      qrCode: walletInfo.qrCode ? 'QR код доступен' : 'QR код недоступен'
    });

    // Создание дополнительного кошелька для BTC
    console.log('\n3. Создание кошелька для BTC...');
    const btcWallet = await client.createStaticWallet({
      currency: 'BTC',
      description: 'Bitcoin кошелек'
    });

    console.log('✅ Bitcoin кошелек создан:', {
      id: btcWallet.id,
      address: btcWallet.address,
      currency: btcWallet.currency
    });

    // Получение списка всех кошельков
    console.log('\n4. Получение списка всех кошельков...');
    const wallets = await client.listStaticWallets();
    
    console.log(`📋 Найдено ${wallets.total} кошельков:`);
    wallets.wallets.forEach((w, index) => {
      console.log(`  ${index + 1}. ${w.currency} - ${w.address} (${w.id})`);
    });

    // Демонстрация использования в реальном приложении
    console.log('\n5. Пример интеграции в приложение:');
    console.log('💡 Как использовать статический кошелек:');
    console.log('   - Покажите адрес клиенту для оплаты');
    console.log('   - Используйте QR код для мобильных платежей');
    console.log('   - Отслеживайте поступления через webhook');
    console.log('   - Проверяйте баланс регулярно');

    console.log('\n📱 Пример HTML для отображения кошелька:');
    console.log(`
<div class="wallet-info">
  <h3>Оплата ${wallet.currency}</h3>
  <p>Адрес: <code>${wallet.address}</code></p>
  <img src="${wallet.qrCode}" alt="QR код для оплаты" />
  <p>Отсканируйте QR код или скопируйте адрес</p>
</div>
    `);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Пример использования в NestJS сервисе
export const nestjsStaticWalletExample = `
import { Injectable } from '@nestjs/common';
import { CryptocloudService } from '@freeinet/cryptocloud-sdk';

@Injectable()
export class WalletService {
  constructor(private readonly cryptocloud: CryptocloudService) {}

  async createPaymentWallet(currency: string, description: string) {
    const wallet = await this.cryptocloud.createStaticWallet({
      currency,
      description
    });

    return {
      walletId: wallet.id,
      address: wallet.address,
      qrCode: wallet.qrCode,
      currency: wallet.currency
    };
  }

  async getWalletInfo(walletId: string) {
    return this.cryptocloud.getStaticWallet(walletId);
  }

  async getAllWallets() {
    const result = await this.cryptocloud.listStaticWallets();
    return result.wallets.map(wallet => ({
      id: wallet.id,
      currency: wallet.currency,
      address: wallet.address,
      createdAt: wallet.createdAt
    }));
  }
}
`;

// Запуск примера
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  staticWalletExample().catch(console.error);
}

export { staticWalletExample };
