import { Inject, Injectable } from '@nestjs/common';
import { CryptocloudClient } from '../client/CryptocloudClient';
import { CreateInvoiceRequest, CryptocloudOptions, Invoice } from '../types/public';
import { CRYPTOCLOUD_OPTIONS } from './CryptocloudConfig';

@Injectable()
export class CryptocloudService {
  private readonly client: CryptocloudClient;

  constructor(@Inject(CRYPTOCLOUD_OPTIONS) options: CryptocloudOptions) {
    this.client = new CryptocloudClient(options);
  }

  createInvoice = (payload: CreateInvoiceRequest): Promise<Invoice> => {
    return this.client.createInvoice(payload);
  };

  getInvoice = (invoiceId: string): Promise<Invoice> => {
    return this.client.getInvoice(invoiceId);
  };

  verifyCallback = (rawBody: string, signatureHex: string | undefined): boolean => {
    return this.client.verifyCallback(rawBody, signatureHex);
  };
}


