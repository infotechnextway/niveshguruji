export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CreatedOrder {
  gatewayOrderId: string;
  amountPaise: number;
  currency: string;
  /** Public key id the frontend checkout SDK needs (safe to expose). */
  publicKey: string;
}

export interface VerifiedPayment {
  gatewayOrderId: string;
  gatewayPaymentId: string;
}

export interface RefundResult {
  gatewayRefundId: string;
}

/**
 * Abstraction over the payment gateway. The rest of the system depends only on
 * this port, so swapping Razorpay for Cashfree/PayU is a single adapter.
 */
export interface PaymentProvider {
  readonly name: string;
  createOrder(amountPaise: number, currency: string, receipt: string): Promise<CreatedOrder>;
  /** Verify the checkout callback signature (order+payment+signature). */
  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean;
  /** Verify a raw webhook body against the webhook secret. */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  refund(gatewayPaymentId: string, amountPaise: number): Promise<RefundResult>;
}
