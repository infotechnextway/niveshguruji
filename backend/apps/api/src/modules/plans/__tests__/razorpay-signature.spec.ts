import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RazorpayProvider } from '../infrastructure/payment/razorpay.provider';

function providerWith(secret: string, webhookSecret: string): RazorpayProvider {
  const config = {
    getOrThrow: (k: string) =>
      ({ RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: secret, RAZORPAY_WEBHOOK_SECRET: webhookSecret })[k],
  } as unknown as ConfigService;
  return new RazorpayProvider(config);
}

describe('Razorpay signature verification', () => {
  const provider = providerWith('key_secret_abc', 'webhook_secret_xyz');

  it('verifies a valid checkout signature (order|payment HMAC)', () => {
    const sig = createHmac('sha256', 'key_secret_abc').update('order_1|pay_1').digest('hex');
    expect(provider.verifyCheckoutSignature('order_1', 'pay_1', sig)).toBe(true);
  });

  it('rejects a tampered checkout signature', () => {
    const sig = createHmac('sha256', 'key_secret_abc').update('order_1|pay_1').digest('hex');
    expect(provider.verifyCheckoutSignature('order_1', 'pay_2', sig)).toBe(false);
    expect(provider.verifyCheckoutSignature('order_1', 'pay_1', 'deadbeef')).toBe(false);
  });

  it('verifies a webhook body signature and rejects wrong-secret ones', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const good = createHmac('sha256', 'webhook_secret_xyz').update(body).digest('hex');
    const bad = createHmac('sha256', 'wrong_secret').update(body).digest('hex');
    expect(provider.verifyWebhookSignature(body, good)).toBe(true);
    expect(provider.verifyWebhookSignature(body, bad)).toBe(false);
  });
});
