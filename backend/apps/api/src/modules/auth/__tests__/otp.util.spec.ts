import { generateOtpCode, hashOtpCode, otpMatches } from '../infrastructure/otp.util';

describe('OTP utils', () => {
  it('generates 6-digit codes across the full range', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it('hashes with pepper and matches timing-safely', () => {
    const h = hashOtpCode('123456', 'pepper-secret-123');
    expect(otpMatches('123456', 'pepper-secret-123', h)).toBe(true);
    expect(otpMatches('123457', 'pepper-secret-123', h)).toBe(false);
    expect(otpMatches('123456', 'other-pepper-4567', h)).toBe(false);
  });
});
