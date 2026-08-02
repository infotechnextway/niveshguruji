import { Controller, Headers, HttpCode, HttpStatus, Inject, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { Logger } from '@nestjs/common';
import { PurchaseService } from '../application/purchase.service';
import { PAYMENT_PROVIDER, PaymentProvider } from '../infrastructure/payment/payment.port';

/**
 * Payment gateway webhook. The raw body is required for HMAC verification, so
 * this route reads req.rawBody (enabled in main.ts). Always returns 200 to a
 * verified-but-unprocessable event so the gateway stops retrying; returns 400
 * only on signature failure.
 */
@Controller('webhooks/payment')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly purchase: PurchaseService,
    @Inject(PAYMENT_PROVIDER) private readonly gateway: PaymentProvider,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const raw = req.rawBody;
    if (!raw || !signature || !this.gateway.verifyWebhookSignature(raw, signature)) {
      // Signature failure — reject so the gateway does not treat it as delivered.
      throw new (await import('@app/shared')).AppException('SIGNATURE_INVALID', 'Invalid webhook signature', HttpStatus.BAD_REQUEST);
    }

    const event = JSON.parse(raw.toString('utf8')) as {
      event: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
    };

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const entity = event.payload?.payment?.entity;
      if (entity?.order_id && entity?.id) {
        await this.purchase.handleWebhookPaymentCaptured(entity.order_id, entity.id, { event: event.event });
      }
    }
    return { received: true };
  }
}
