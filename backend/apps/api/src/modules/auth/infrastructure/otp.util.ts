import { createHash, randomInt, timingSafeEqual } from 'crypto';

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtpCode(code: string, pepper: string): string {
  return createHash('sha256').update(`${code}:${pepper}`).digest('hex');
}

export function otpMatches(code: string, pepper: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtpCode(code, pepper), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
