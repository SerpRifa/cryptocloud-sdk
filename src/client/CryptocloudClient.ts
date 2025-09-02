import axios, { AxiosInstance } from 'axios';
import { CreateInvoiceRequest, CryptocloudOptions, Invoice, WebhookPayload } from '../types/public';
import { verifySignature } from './CryptocloudSignature';

const DEFAULT_BASE_URL = 'https://api.cryptocloud.plus';

export class CryptocloudClient {
  private readonly http: AxiosInstance;
  private readonly apiSecret: string;

  constructor(options: CryptocloudOptions) {
    const { apiKey, apiSecret, baseUrl = DEFAULT_BASE_URL, timeoutMs = 10000 } = options;
    this.apiSecret = apiSecret;
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      }
    });
  }

  createInvoice = async (payload: CreateInvoiceRequest): Promise<Invoice> => {
    const { data } = await this.http.post<Invoice>('/v1/invoices', payload);
    return data;
  };

  getInvoice = async (invoiceId: string): Promise<Invoice> => {
    const { data } = await this.http.get<Invoice>(`/v1/invoices/${invoiceId}`);
    return data;
  };

  verifyCallback = (rawBody: string, signatureHex: string | undefined): boolean => {
    return verifySignature(this.apiSecret, rawBody, signatureHex);
  };

  // narrow payload parsing helper
  parseWebhook = (json: string): WebhookPayload => {
    return JSON.parse(json) as WebhookPayload;
  };
}

