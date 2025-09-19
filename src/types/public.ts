export type CryptocloudOptions = {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  timeoutMs?: number;
  logger?: CryptocloudLogger;
  enableMetrics?: boolean;
};

export type CryptocloudLogger = {
  info(message: string, meta?: any): void;
  error(message: string, error?: Error): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
};

// Статусы инвойсов
export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'canceled' | 'expired' | 'processing';
export type PaymentMethod = 'bitcoin' | 'ethereum' | 'usdt' | 'litecoin' | 'bitcoin_cash' | 'tron';

export type CreateInvoiceRequest = {
  amount: number;
  currency: string;
  description?: string;
  orderId?: string;
  callbackUrl?: string;
  successUrl?: string;
  failUrl?: string;
  paymentMethod?: PaymentMethod;
};

export type Invoice = {
  id: string;
  uuid?: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt?: string;
  checkoutUrl?: string;
  paymentUrl?: string;
  paymentMethod?: PaymentMethod;
  orderId?: string;
  description?: string;
  [key: string]: unknown;
};

export type ListInvoicesRequest = {
  startDate: string;
  endDate: string;
  offset?: number;
  limit?: number;
  status?: InvoiceStatus;
  currency?: string;
};

export type ListInvoicesResponse = {
  invoices: Invoice[];
  total: number;
  offset: number;
  limit: number;
};

export type InvoiceInfoRequest = {
  uuids: string[];
};

export type InvoiceInfoResponse = {
  invoices: Invoice[];
};

export type BalanceResponse = {
  balances: {
    currency: string;
    amount: number;
    frozen?: number;
  }[];
};

export type StatisticsRequest = {
  startDate: string;
  endDate: string;
};

export type StatisticsResponse = {
  totalInvoices: number;
  paidInvoices: number;
  totalAmount: number;
  paidAmount: number;
  currencies: {
    [currency: string]: {
      total: number;
      paid: number;
    };
  };
};

export type WebhookPayload = {
  event: string;
  invoiceId: string;
  uuid?: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  createdAt: string;
  orderId?: string;
  [key: string]: unknown;
};

export const successStatuses = ['paid', 'success', 'completed', 'succeeded'] as const;
export const errorStatuses = ['error', 'failed', 'canceled', 'expired'] as const;
export const pendingStatuses = ['pending', 'processing'] as const;

// Типы для ошибок
export class CryptocloudError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly response?: any
  ) {
    super(message);
    this.name = 'CryptocloudError';
  }
}

export type RetryOptions = {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
};

// Интерфейс для кэширования
export interface CryptocloudCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

