import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';
import { CreatedOrder, PaymentProvider, RefundResult } from './payment.port';

/**
 * Razorpay adapter. Amounts are already in paise (Razorpay's native unit).
 * Signature verification is local HMAC-SHA256 — no network round-trip.
 */
@Injectable()
export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';
  private readonly logger = new Logger(RazorpayProvider.name);
  private readonly client: Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    this.keyId = config.getOrThrow<string>('RAZORPAY_KEY_ID');
    this.keySecret = config.getOrThrow<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = config.getOrThrow<string>('RAZORPAY_WEBHOOK_SECRET');
    this.client = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
  }

  async createOrder(amountPaise: number, currency: string, receipt: string): Promise<CreatedOrder> {
    const order = await this.client.orders.create({ amount: amountPaise, currency, receipt, payment_capture: true });
    return { gatewayOrderId: order.id, amountPaise, currency, publicKey: this.keyId };
  }

  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = createHmac('sha256', this.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return RazorpayProvider.safeEqual(expected, signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return RazorpayProvider.safeEqual(expected, signature);
  }

  async refund(gatewayPaymentId: string, amountPaise: number): Promise<RefundResult> {
    const refund = await this.client.payments.refund(gatewayPaymentId, { amount: amountPaise });
    return { gatewayRefundId: refund.id };
  }

  private static safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  }
}
