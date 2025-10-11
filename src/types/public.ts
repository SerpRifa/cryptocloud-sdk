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
export type InvoiceStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'canceled'
  | 'expired'
  | 'processing'
  // доп. статусы из V2 ответов invoice info
  | 'created'
  | 'overpaid';
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

// Обёртка ответов API V2
export type CryptocloudApiResponse<T> = {
  status: 'success' | 'error';
  result: T;
};

// Типы для ответа "Информация о счёте" (raw из API)
export type InvoiceInfoCurrency = {
  id: number;
  code: string; // "USDT"
  fullcode: string; // "USDT_TRC20"
  network: {
    code: string; // "TRC20"
    id: number;
    icon: string;
    fullname: string; // "Tron"
  };
  name: string; // "Tether"
  is_email_required: boolean;
  stablecoin: boolean;
  icon_base: string;
  icon_network: string;
  icon_qr: string;
  order: number;
};

export type InvoiceInfoProject = {
  id: number;
  name: string;
  fail: string | null;
  success: string | null;
  logo: string | null;
};

export type InvoiceInfoItem = {
  uuid: string; // "INV-XXXXXXXX" или "XXXXXXXX"
  address: string;
  expiry_date: string; // "YYYY-MM-DD HH:mm:ss.SSSSSS"
  side_commission: 'client' | 'merchant';
  side_commission_cc: 'client' | 'merchant';
  amount: number;
  amount_usd: number;
  received: number;
  received_usd: number;
  fee: number;
  fee_usd: number;
  service_fee: number;
  service_fee_usd: number;
  status: string; // в raw формате из API
  order_id: string | null;
  currency: InvoiceInfoCurrency;
  project: InvoiceInfoProject;
  test_mode: boolean;
};

export type InvoiceInfoResponse = InvoiceInfoItem[];

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

// Статический кошелек
export type StaticWalletRequest = {
  currency: string;
  description?: string;
};

export type StaticWallet = {
  id: string;
  currency: string;
  address: string;
  qrCode: string;
  createdAt: string;
  description?: string;
  [key: string]: unknown;
};

export type ListStaticWalletsResponse = {
  wallets: StaticWallet[];
  total: number;
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

export const successStatuses = ['paid', 'success', 'completed', 'succeeded', 'overpaid'] as const;
export const errorStatuses = ['error', 'failed', 'canceled', 'expired'] as const;
export const pendingStatuses = ['pending', 'processing', 'created'] as const;

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

