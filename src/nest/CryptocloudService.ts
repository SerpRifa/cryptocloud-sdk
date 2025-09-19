import { Inject, Injectable } from '@nestjs/common';
import { CryptocloudClient } from '../client/CryptocloudClient';
import { 
  CreateInvoiceRequest, 
  CryptocloudOptions, 
  Invoice,
  ListInvoicesRequest,
  ListInvoicesResponse,
  InvoiceInfoRequest,
  InvoiceInfoResponse,
  BalanceResponse,
  StatisticsRequest,
  StatisticsResponse,
  WebhookPayload
} from '../types/public';
import { CRYPTOCLOUD_OPTIONS } from './CryptocloudConfig';

@Injectable()
export class CryptocloudService {
  private readonly client: CryptocloudClient;

  constructor(@Inject(CRYPTOCLOUD_OPTIONS) options: CryptocloudOptions) {
    this.client = new CryptocloudClient(options);
  }

  // Основные методы API
  createInvoice = (payload: CreateInvoiceRequest): Promise<Invoice> => {
    return this.client.createInvoice(payload);
  };

  getInvoice = (invoiceId: string): Promise<Invoice> => {
    return this.client.getInvoice(invoiceId);
  };

  cancelInvoice = (uuid: string): Promise<Invoice> => {
    return this.client.cancelInvoice(uuid);
  };

  listInvoices = (request: ListInvoicesRequest): Promise<ListInvoicesResponse> => {
    return this.client.listInvoices(request);
  };

  getInvoiceInfo = (request: InvoiceInfoRequest): Promise<InvoiceInfoResponse> => {
    return this.client.getInvoiceInfo(request);
  };

  getBalance = (): Promise<BalanceResponse> => {
    return this.client.getBalance();
  };

  getStatistics = (request: StatisticsRequest): Promise<StatisticsResponse> => {
    return this.client.getStatistics(request);
  };

  // Webhook методы
  verifyCallback = (rawBody: string, signatureHex: string | undefined): boolean => {
    return this.client.verifyCallback(rawBody, signatureHex);
  };

  parseWebhook = (json: string): WebhookPayload => {
    return this.client.parseWebhook(json);
  };

  // Утилитарные методы
  isInvoicePaid = (invoice: Invoice): boolean => {
    return this.client.isInvoicePaid(invoice);
  };

  isInvoiceFailed = (invoice: Invoice): boolean => {
    return this.client.isInvoiceFailed(invoice);
  };

  isInvoicePending = (invoice: Invoice): boolean => {
    return this.client.isInvoicePending(invoice);
  };
}


