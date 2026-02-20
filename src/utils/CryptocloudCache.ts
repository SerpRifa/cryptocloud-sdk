import { CryptocloudCache } from '../types/public';

/**
 * Простая реализация кэша в памяти
 */
export class MemoryCache implements CryptocloudCache {
  private cache = new Map<string, { value: unknown; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = 300000): Promise<void> {
    const expires = Date.now() + ttl;
    this.cache.set(key, { value, expires });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Очищает просроченные записи
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Возвращает размер кэша
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Утилиты для работы с кэшем инвойсов
 */
export class InvoiceCacheUtils {
  private static readonly INVOICE_TTL = 300000; // 5 минут
  private static readonly BALANCE_TTL = 60000; // 1 минута
  private static readonly STATISTICS_TTL = 300000; // 5 минут

  static getInvoiceKey(invoiceId: string): string {
    return `invoice:${invoiceId}`;
  }

  static getBalanceKey(): string {
    return 'balance:all';
  }

  static getStatisticsKey(startDate: string, endDate: string): string {
    return `statistics:${startDate}:${endDate}`;
  }

  static getInvoiceTtl(): number {
    return this.INVOICE_TTL;
  }

  static getBalanceTtl(): number {
    return this.BALANCE_TTL;
  }

  static getStatisticsTtl(): number {
    return this.STATISTICS_TTL;
  }
}
