import { WebhookPayload } from '../types/public';

/**
 * Интерфейс для обработчиков webhook событий
 */
export interface WebhookHandler {
  onInvoicePaid(payload: WebhookPayload): Promise<void>;
  onInvoiceFailed(payload: WebhookPayload): Promise<void>;
  onInvoiceCanceled(payload: WebhookPayload): Promise<void>;
  onInvoiceExpired(payload: WebhookPayload): Promise<void>;
  onInvoiceProcessing(payload: WebhookPayload): Promise<void>;
}

/**
 * Базовый класс для обработчиков webhook
 */
export abstract class BaseWebhookHandler implements WebhookHandler {
  async onInvoicePaid(payload: WebhookPayload): Promise<void> {
    // Базовая реализация - ничего не делает
  }

  async onInvoiceFailed(payload: WebhookPayload): Promise<void> {
    // Базовая реализация - ничего не делает
  }

  async onInvoiceCanceled(payload: WebhookPayload): Promise<void> {
    // Базовая реализация - ничего не делает
  }

  async onInvoiceExpired(payload: WebhookPayload): Promise<void> {
    // Базовая реализация - ничего не делает
  }

  async onInvoiceProcessing(payload: WebhookPayload): Promise<void> {
    // Базовая реализация - ничего не делает
  }
}

/**
 * Сервис для обработки webhook событий
 */
export class WebhookService {
  private handlers: Map<string, WebhookHandler[]> = new Map();

  /**
   * Регистрирует обработчик для события
   */
  registerHandler(event: string, handler: WebhookHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  /**
   * Обрабатывает webhook payload
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    const event = payload.event;
    const handlers = this.handlers.get(event) || [];

    // Выполняем все обработчики параллельно
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await this.callHandlerMethod(handler, payload);
        } catch (error) {
          console.error(`Error in webhook handler for event ${event}:`, error);
        }
      })
    );
  }

  private async callHandlerMethod(handler: WebhookHandler, payload: WebhookPayload): Promise<void> {
    switch (payload.status) {
      case 'paid':
        await handler.onInvoicePaid(payload);
        break;
      case 'failed':
        await handler.onInvoiceFailed(payload);
        break;
      case 'canceled':
        await handler.onInvoiceCanceled(payload);
        break;
      case 'expired':
        await handler.onInvoiceExpired(payload);
        break;
      case 'processing':
        await handler.onInvoiceProcessing(payload);
        break;
      case 'pending':
        // Для pending статуса ничего не делаем
        break;
      default:
        console.warn(`Unknown webhook status: ${payload.status}`);
    }
  }

  /**
   * Получает список зарегистрированных событий
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Получает количество обработчиков для события
   */
  getHandlerCount(event: string): number {
    return this.handlers.get(event)?.length || 0;
  }
}
