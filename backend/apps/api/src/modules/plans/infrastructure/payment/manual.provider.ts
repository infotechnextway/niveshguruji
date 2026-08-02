import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreatedOrder, PaymentProvider, RefundResult } from './payment.port';

/**
 * Dev/test provider — no external gateway. createOrder returns a synthetic
 * order id; signatures always "verify" so the activation path can be exercised
 * end-to-end locally. NEVER selected in a production preset.
 */
@Injectable()
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual';
  private readonly logger = new Logger(ManualPaymentProvider.name);

  async createOrder(amountPaise: number, currency: string, receipt: string): Promise<CreatedOrder> {
    this.logger.warn(`[DEV ONLY] manual order for ${receipt}: ${amountPaise} ${currency}`);
    return { gatewayOrderId: `manual_${randomUUID()}`, amountPaise, currency, publicKey: 'manual' };
  }

  verifyCheckoutSignature(): boolean {
    return true;
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  async refund(gatewayPaymentId: string): Promise<RefundResult> {
    return { gatewayRefundId: `manual_refund_${gatewayPaymentId}` };
  }
}
