import { Injectable, Logger } from '@nestjs/common';
import { SmsSender } from './sms.port';

/** Dev/test adapter — logs the OTP instead of sending. Never enabled in production env presets. */
@Injectable()
export class ConsoleSmsSender implements SmsSender {
  private readonly logger = new Logger('SMS');

  async sendOtp(mobileE164: string, code: string, ttlMinutes: number): Promise<void> {
    this.logger.warn(`[DEV ONLY] OTP for ${mobileE164}: ${code} (valid ${ttlMinutes}m)`);
  }
}
