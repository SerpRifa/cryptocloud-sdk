import { CryptocloudClient } from '../client/CryptocloudClient';
import {
    BalanceResponse,
    CreateInvoiceRequest,
    CryptocloudOptions,
    Invoice,
    InvoiceInfoRequest,
    InvoiceInfoResponse,
    ListInvoicesRequest,
    ListInvoicesResponse,
    ListStaticWalletsResponse,
    StaticWallet,
    StaticWalletRequest,
    StatisticsRequest,
    StatisticsResponse
} from '../types/public';

/**
 * Мок клиент для тестирования
 */
export class MockCryptocloudClient extends CryptocloudClient {
  private invoices: Map<string, Invoice> = new Map();
  private staticWallets: Map<string, StaticWallet> = new Map();
  private nextInvoiceId = 1;
  private nextWalletId = 1;

  constructor(options: CryptocloudOptions) {
    super(options);
  }

  createInvoice = async (payload: CreateInvoiceRequest): Promise<Invoice> => {
    const invoice: Invoice = {
      id: `test-invoice-${this.nextInvoiceId++}`,
      uuid: `uuid-${this.nextInvoiceId}`,
      status: 'pending',
      amount: payload.amount,
      currency: payload.currency,
      createdAt: new Date().toISOString(),
      checkoutUrl: `https://test-checkout.com/invoice/${this.nextInvoiceId}`,
      orderId: payload.orderId,
      description: payload.description,
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  getInvoice = async (invoiceId: string): Promise<Invoice> => {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }
    return invoice;
  }

  cancelInvoice = async (uuid: string): Promise<Invoice> => {
    const invoice = Array.from(this.invoices.values()).find(i => i.uuid === uuid);
    if (!invoice) {
      throw new Error(`Invoice with uuid ${uuid} not found`);
    }

    invoice.status = 'canceled';
    invoice.updatedAt = new Date().toISOString();
    return invoice;
  }

  listInvoices = async (request: ListInvoicesRequest): Promise<ListInvoicesResponse> => {
    const allInvoices = Array.from(this.invoices.values());
    const filtered = allInvoices.filter(invoice => {
      if (request.status && invoice.status !== request.status) return false;
      if (request.currency && invoice.currency !== request.currency) return false;
      return true;
    });

    const offset = request.offset || 0;
    const limit = request.limit || 10;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      invoices: paginated,
      total: filtered.length,
      offset,
      limit,
    };
  }

  getInvoiceInfo = async (request: InvoiceInfoRequest): Promise<InvoiceInfoResponse> => {
    const invoices = request.uuids
      .map(uuid => Array.from(this.invoices.values()).find(i => i.uuid === uuid))
      .filter(Boolean) as Invoice[];

    return { invoices };
  }

  getBalance = async (): Promise<BalanceResponse> => {
    return {
      balances: [
        { currency: 'USDT', amount: 1000.50 },
        { currency: 'BTC', amount: 0.05 },
        { currency: 'ETH', amount: 2.5 },
      ],
    };
  }

  getStatistics = async (request: StatisticsRequest): Promise<StatisticsResponse> => {
    return {
      totalInvoices: 100,
      paidInvoices: 85,
      totalAmount: 50000,
      paidAmount: 42500,
      currencies: {
        USDT: { total: 30000, paid: 25500 },
        BTC: { total: 15000, paid: 12750 },
        ETH: { total: 5000, paid: 4250 },
      },
    };
  };

  // Методы для статического кошелька
  createStaticWallet = async (request: StaticWalletRequest): Promise<StaticWallet> => {
    const wallet: StaticWallet = {
      id: `wallet-${this.nextWalletId++}`,
      currency: request.currency,
      address: this.generateAddress(request.currency),
      qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
      createdAt: new Date().toISOString(),
      description: request.description,
    };

    this.staticWallets.set(wallet.id, wallet);
    return wallet;
  };

  getStaticWallet = async (walletId: string): Promise<StaticWallet> => {
    const wallet = this.staticWallets.get(walletId);
    if (!wallet) {
      throw new Error(`Static wallet ${walletId} not found`);
    }
    return wallet;
  };

  listStaticWallets = async (): Promise<ListStaticWalletsResponse> => {
    const wallets = Array.from(this.staticWallets.values());
    return {
      wallets,
      total: wallets.length,
    };
  };

  // Утилитарные методы для тестов
  setInvoiceStatus(invoiceId: string, status: Invoice['status']): void {
    const invoice = this.invoices.get(invoiceId);
    if (invoice) {
      invoice.status = status;
      invoice.updatedAt = new Date().toISOString();
    }
  }

  addInvoice(invoice: Invoice): void {
    this.invoices.set(invoice.id, invoice);
  }

  clearInvoices(): void {
    this.invoices.clear();
    this.nextInvoiceId = 1;
  }

  getInvoiceCount(): number {
    return this.invoices.size;
  }

  // Утилитарные методы для статического кошелька
  addStaticWallet(wallet: StaticWallet): void {
    this.staticWallets.set(wallet.id, wallet);
  }

  clearStaticWallets(): void {
    this.staticWallets.clear();
    this.nextWalletId = 1;
  }

  getStaticWalletCount(): number {
    return this.staticWallets.size;
  }

  private generateAddress(currency: string): string {
    const prefixes: { [key: string]: string } = {
      'BTC': '1',
      'ETH': '0x',
      'USDT': '0x',
      'LTC': 'L',
      'BCH': 'q'
    };
    
    const prefix = prefixes[currency] || '0x';
    const randomPart = Math.random().toString(36).substring(2, 42);
    return `${prefix}${randomPart}`;
  }
}

/**
 * Утилиты для создания тестовых данных
 */
export class TestDataFactory {
  static createTestInvoice(overrides: Partial<Invoice> = {}): Invoice {
    return {
      id: 'test-invoice-1',
      uuid: 'test-uuid-1',
      status: 'pending',
      amount: 10.50,
      currency: 'USDT',
      createdAt: new Date().toISOString(),
      checkoutUrl: 'https://test-checkout.com/invoice/1',
      orderId: 'test-order-1',
      description: 'Test invoice',
      ...overrides,
    };
  }

  static createTestCreateInvoiceRequest(overrides: Partial<CreateInvoiceRequest> = {}): CreateInvoiceRequest {
    return {
      amount: 10.50,
      currency: 'USDT',
      description: 'Test invoice',
      orderId: 'test-order-1',
      ...overrides,
    };
  }

  static createTestWebhookPayload(overrides: Partial<any> = {}): any {
    return {
      event: 'invoice.paid',
      invoiceId: 'test-invoice-1',
      uuid: 'test-uuid-1',
      status: 'paid',
      amount: 10.50,
      currency: 'USDT',
      createdAt: new Date().toISOString(),
      orderId: 'test-order-1',
      ...overrides,
    };
  }

  static createTestStaticWallet(overrides: Partial<StaticWallet> = {}): StaticWallet {
    return {
      id: 'test-wallet-1',
      currency: 'USDT',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      createdAt: new Date().toISOString(),
      description: 'Test static wallet',
      ...overrides,
    };
  }

  static createTestStaticWalletRequest(overrides: Partial<StaticWalletRequest> = {}): StaticWalletRequest {
    return {
      currency: 'USDT',
      description: 'Test static wallet',
      ...overrides,
    };
  }
}
