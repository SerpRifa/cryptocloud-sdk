export type CryptocloudOptions = {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  timeoutMs?: number;
};

export type CreateInvoiceRequest = {
  amount: number;
  currency: string;
  description?: string;
  orderId?: string;
  callbackUrl?: string;
  successUrl?: string;
  failUrl?: string;
};

export type Invoice = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  checkoutUrl?: string;
  [key: string]: unknown;
};

export type WebhookPayload = {
  event: string;
  invoiceId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  [key: string]: unknown;
};

export const successStatuses = ['paid', 'success', 'completed', 'succeeded'] as const;
export const errorStatuses = ['error', 'failed', 'canceled'] as const;

