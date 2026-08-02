export const SMS_SENDER = Symbol('SMS_SENDER');

export interface SmsSender {
  sendOtp(mobileE164: string, code: string, ttlMinutes: number): Promise<void>;
}
