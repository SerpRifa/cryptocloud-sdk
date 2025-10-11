import axios, { AxiosError, AxiosInstance } from 'axios';
import {
    BalanceResponse,
    CreateInvoiceRequest,
    CryptocloudApiResponse,
    CryptocloudError,
    CryptocloudLogger,
    CryptocloudOptions,
    errorStatuses,
    Invoice,
    InvoiceInfoRequest,
    InvoiceInfoResponse,
    ListInvoicesRequest,
    ListInvoicesResponse,
    ListStaticWalletsResponse,
    pendingStatuses,
    RetryOptions,
    StaticWallet,
    StaticWalletRequest,
    StatisticsRequest,
    StatisticsResponse,
    successStatuses,
    WebhookPayload
} from '../types/public';
import { verifySignature } from './CryptocloudSignature';

const DEFAULT_BASE_URL = 'https://api.cryptocloud.plus';
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 2
};

export class CryptocloudClient {
  private readonly http: AxiosInstance;
  private readonly apiSecret: string;
  private readonly logger?: CryptocloudLogger;
  private readonly enableMetrics: boolean;

  constructor(options: CryptocloudOptions) {
    const { 
      apiKey, 
      apiSecret, 
      baseUrl = DEFAULT_BASE_URL, 
      timeoutMs = DEFAULT_TIMEOUT,
      logger,
      enableMetrics = false
    } = options;
    
    this.apiSecret = apiSecret;
    this.logger = logger;
    this.enableMetrics = enableMetrics;
    
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`
      }
    });

    // Добавляем интерцепторы для логирования и обработки ошибок
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.http.interceptors.request.use(
      (config) => {
        this.logger?.debug('Making request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data
        });
        return config;
      },
      (error) => {
        this.logger?.error('Request error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.http.interceptors.response.use(
      (response) => {
        this.logger?.debug('Response received', {
          status: response.status,
          url: response.config.url,
          data: response.data
        });
        return response;
      },
      (error: AxiosError) => {
        this.logger?.error('Response error', error as Error);
        
        const cryptocloudError = this.handleAxiosError(error);
        return Promise.reject(cryptocloudError);
      }
    );
  }

  private handleAxiosError(error: AxiosError): CryptocloudError {
    const statusCode = error.response?.status;
    const responseData = error.response?.data as any;
    
    let message = 'Unknown error occurred';
    let code = 'UNKNOWN_ERROR';

    if (responseData?.message) {
      message = responseData.message;
    } else if (responseData?.error) {
      message = responseData.error;
    } else if (error.message) {
      message = error.message;
    }

    if (responseData?.code) {
      code = responseData.code;
    } else if (statusCode) {
      code = `HTTP_${statusCode}`;
    }

    return new CryptocloudError(message, code, statusCode, responseData);
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    retryOptions: RetryOptions = {}
  ): Promise<T> {
    const options = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
    let lastError: Error;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Не повторяем для определенных ошибок
        if (error instanceof CryptocloudError && 
            (error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 403)) {
          throw error;
        }

        if (attempt < options.maxRetries) {
          const delay = options.delayMs * Math.pow(options.backoffMultiplier, attempt);
          this.logger?.warn(`Request failed, retrying in ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries: options.maxRetries,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          await this.delay(delay);
        }
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Основные методы API
  createInvoice = async (payload: CreateInvoiceRequest): Promise<Invoice> => {
    this.logger?.info('Creating invoice', { amount: payload.amount, currency: payload.currency });
    
    return this.withRetry(async () => {
      const { data } = await this.http.post<Invoice>('/v1/invoices', payload);
      this.logger?.info('Invoice created successfully', { invoiceId: data.id });
      return data;
    });
  };

  getInvoice = async (invoiceId: string): Promise<Invoice> => {
    this.logger?.debug('Getting invoice', { invoiceId });
    
    return this.withRetry(async () => {
      const { data } = await this.http.get<Invoice>(`/v1/invoices/${invoiceId}`);
      return data;
    });
  };

  cancelInvoice = async (uuid: string): Promise<Invoice> => {
    this.logger?.info('Canceling invoice', { uuid });
    
    return this.withRetry(async () => {
      const { data } = await this.http.post<Invoice>('/v2/invoice/merchant/canceled', { uuid });
      this.logger?.info('Invoice canceled successfully', { uuid });
      return data;
    });
  };

  listInvoices = async (request: ListInvoicesRequest): Promise<ListInvoicesResponse> => {
    this.logger?.debug('Listing invoices', request);
    
    return this.withRetry(async () => {
      const { data } = await this.http.post<ListInvoicesResponse>('/v2/invoice/merchant/list', {
        start: request.startDate,
        end: request.endDate,
        offset: request.offset || 0,
        limit: request.limit || 10,
        ...(request.status && { status: request.status }),
        ...(request.currency && { currency: request.currency })
      });
      return data;
    });
  };

  getInvoiceInfo = async (request: InvoiceInfoRequest): Promise<InvoiceInfoResponse> => {
    this.logger?.debug('Getting invoice info', { uuids: request.uuids });
    
    return this.withRetry(async () => {
      if (!Array.isArray(request.uuids) || request.uuids.length === 0) {
        throw new CryptocloudError('uuids must be a non-empty array', 'INVALID_ARGUMENT');
      }
      if (request.uuids.length > 100) {
        throw new CryptocloudError('Max 100 uuids', 'MAX_UUIDS_EXCEEDED', 400);
      }

      const { data } = await this.http.post<CryptocloudApiResponse<InvoiceInfoResponse>>('/v2/invoice/merchant/info', request);

      if (data?.status !== 'success') {
        const validateError = (data as any)?.result?.validate_error;
        const detail = (data as any)?.detail;
        const message = validateError || detail || 'Unknown API error';
        const code = validateError === 'Max 100 uuids' ? 'MAX_UUIDS_EXCEEDED' : 'API_ERROR';
        throw new CryptocloudError(message, code);
      }

      return data.result;
    });
  };

  getBalance = async (): Promise<BalanceResponse> => {
    this.logger?.debug('Getting balance');
    
    return this.withRetry(async () => {
      const { data } = await this.http.post<BalanceResponse>('/v2/merchant/wallet/balance/all');
      return data;
    });
  };

  getStatistics = async (request: StatisticsRequest): Promise<StatisticsResponse> => {
    this.logger?.debug('Getting statistics', request);
    
    return this.withRetry(async () => {
      const { data } = await this.http.post<StatisticsResponse>('/v2/invoice/merchant/statistics', {
        start: request.startDate,
        end: request.endDate
      });
      return data;
    });
  };

  // Webhook методы
  verifyCallback = (rawBody: string, signatureHex: string | undefined): boolean => {
    const isValid = verifySignature(this.apiSecret, rawBody, signatureHex);
    this.logger?.debug('Webhook signature verification', { isValid });
    return isValid;
  };

  parseWebhook = (json: string): WebhookPayload => {
    try {
      const payload = JSON.parse(json) as WebhookPayload;
      this.logger?.debug('Webhook parsed successfully', { event: payload.event, invoiceId: payload.invoiceId });
      return payload;
    } catch (error) {
      this.logger?.error('Failed to parse webhook', error as Error);
      throw new CryptocloudError('Invalid webhook payload', 'INVALID_WEBHOOK_PAYLOAD');
    }
  };

  // Утилитарные методы
  isInvoicePaid = (invoice: Invoice): boolean => {
    return successStatuses.includes(invoice.status as any);
  };

  isInvoiceFailed = (invoice: Invoice): boolean => {
    return errorStatuses.includes(invoice.status as any);
  };

  isInvoicePending = (invoice: Invoice): boolean => {
    return pendingStatuses.includes(invoice.status as any);
  };

  // Методы для статического кошелька
  createStaticWallet = async (request: StaticWalletRequest): Promise<StaticWallet> => {
    this.logger?.info('Creating static wallet', { currency: request.currency });
    
    return this.withRetry(async () => {
      const { data } = await this.http.post<StaticWallet>('/v2/static-wallet/create', request);
      this.logger?.info('Static wallet created successfully', { walletId: data.id });
      return data;
    });
  };

  getStaticWallet = async (walletId: string): Promise<StaticWallet> => {
    this.logger?.debug('Getting static wallet', { walletId });
    
    return this.withRetry(async () => {
      const { data } = await this.http.get<StaticWallet>(`/v2/static-wallet/${walletId}`);
      return data;
    });
  };

  listStaticWallets = async (): Promise<ListStaticWalletsResponse> => {
    this.logger?.debug('Listing static wallets');
    
    return this.withRetry(async () => {
      const { data } = await this.http.get<ListStaticWalletsResponse>('/v2/static-wallet/list');
      return data;
    });
  };
}


