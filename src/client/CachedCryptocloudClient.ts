import { CryptocloudClient } from './CryptocloudClient';
import { 
  CryptocloudOptions, 
  Invoice, 
  BalanceResponse, 
  StatisticsRequest, 
  StatisticsResponse,
  CryptocloudCache 
} from '../types/public';
import { MemoryCache, InvoiceCacheUtils } from '../utils/CryptocloudCache';

/**
 * Расширенный клиент с поддержкой кэширования
 */
export class CachedCryptocloudClient extends CryptocloudClient {
  private readonly cache: CryptocloudCache;

  constructor(options: CryptocloudOptions & { cache?: CryptocloudCache }) {
    super(options);
    this.cache = options.cache || new MemoryCache();
  }

  /**
   * Получает инвойс с кэшированием
   */
  async getInvoiceWithCache(invoiceId: string): Promise<Invoice> {
    const cacheKey = InvoiceCacheUtils.getInvoiceKey(invoiceId);
    
    // Пытаемся получить из кэша
    const cached = await this.cache.get<Invoice>(cacheKey);
    if (cached) {
      return cached;
    }

    // Если нет в кэше, запрашиваем из API
    const invoice = await this.getInvoice(invoiceId);
    
    // Сохраняем в кэш
    await this.cache.set(cacheKey, invoice, InvoiceCacheUtils.getInvoiceTtl());
    
    return invoice;
  }

  /**
   * Получает баланс с кэшированием
   */
  async getBalanceWithCache(): Promise<BalanceResponse> {
    const cacheKey = InvoiceCacheUtils.getBalanceKey();
    
    const cached = await this.cache.get<BalanceResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const balance = await this.getBalance();
    await this.cache.set(cacheKey, balance, InvoiceCacheUtils.getBalanceTtl());
    
    return balance;
  }

  /**
   * Получает статистику с кэшированием
   */
  async getStatisticsWithCache(request: StatisticsRequest): Promise<StatisticsResponse> {
    const cacheKey = InvoiceCacheUtils.getStatisticsKey(request.startDate, request.endDate);
    
    const cached = await this.cache.get<StatisticsResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const statistics = await this.getStatistics(request);
    await this.cache.set(cacheKey, statistics, InvoiceCacheUtils.getStatisticsTtl());
    
    return statistics;
  }

  /**
   * Инвалидирует кэш для конкретного инвойса
   */
  async invalidateInvoiceCache(invoiceId: string): Promise<void> {
    const cacheKey = InvoiceCacheUtils.getInvoiceKey(invoiceId);
    await this.cache.delete(cacheKey);
  }

  /**
   * Инвалидирует кэш баланса
   */
  async invalidateBalanceCache(): Promise<void> {
    const cacheKey = InvoiceCacheUtils.getBalanceKey();
    await this.cache.delete(cacheKey);
  }

  /**
   * Инвалидирует кэш статистики
   */
  async invalidateStatisticsCache(startDate: string, endDate: string): Promise<void> {
    const cacheKey = InvoiceCacheUtils.getStatisticsKey(startDate, endDate);
    await this.cache.delete(cacheKey);
  }

  /**
   * Очищает весь кэш
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Получает размер кэша (только для MemoryCache)
   */
  getCacheSize(): number | null {
    if (this.cache instanceof MemoryCache) {
      return this.cache.size();
    }
    return null;
  }
}
