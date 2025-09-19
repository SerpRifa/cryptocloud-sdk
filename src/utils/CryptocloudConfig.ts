import { CryptocloudOptions } from '../types/public';

/**
 * Утилиты для конфигурации CryptocloudClient из переменных окружения
 */
export class CryptocloudConfig {
  /**
   * Создает конфигурацию из переменных окружения
   */
  static fromEnv(): CryptocloudOptions {
    const apiKey = process.env.CC_API_KEY;
    const apiSecret = process.env.CC_API_SECRET;

    if (!apiKey) {
      throw new Error('CC_API_KEY environment variable is required');
    }

    if (!apiSecret) {
      throw new Error('CC_API_SECRET environment variable is required');
    }

    return {
      apiKey,
      apiSecret,
      baseUrl: process.env.CC_BASE_URL || 'https://api.cryptocloud.plus',
      timeoutMs: parseInt(process.env.CC_TIMEOUT_MS || '10000'),
      enableMetrics: process.env.CC_ENABLE_METRICS === 'true',
    };
  }

  /**
   * Валидирует конфигурацию
   */
  static validate(options: CryptocloudOptions): void {
    if (!options.apiKey) {
      throw new Error('apiKey is required');
    }

    if (!options.apiSecret) {
      throw new Error('apiSecret is required');
    }

    if (options.timeoutMs && options.timeoutMs < 1000) {
      throw new Error('timeoutMs must be at least 1000ms');
    }

    if (options.baseUrl && !this.isValidUrl(options.baseUrl)) {
      throw new Error('baseUrl must be a valid URL');
    }
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
