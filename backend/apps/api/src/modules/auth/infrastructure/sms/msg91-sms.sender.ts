import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsSender } from './sms.port';

/**
 * MSG91 OTP flow adapter (DLT-approved template required — A-3).
 * https://docs.msg91.com/sms — Flow API with template variable ##OTP##.
 */
@Injectable()
export class Msg91SmsSender implements SmsSender {
  private readonly logger = new Logger(Msg91SmsSender.name);
  private readonly authKey: string;
  private readonly templateId: string;

  constructor(config: ConfigService) {
    this.authKey = config.getOrThrow<string>('MSG91_AUTH_KEY');
    this.templateId = config.getOrThrow<string>('MSG91_TEMPLATE_ID');
  }

  async sendOtp(mobileE164: string, code: string, _ttlMinutes: number): Promise<void> {
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: this.authKey },
      body: JSON.stringify({
        template_id: this.templateId,
        recipients: [{ mobiles: mobileE164.replace('+', ''), OTP: code }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`MSG91 send failed (${res.status}): ${body}`);
      throw new Error('SMS delivery failed');
    }
  }
}
