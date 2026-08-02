import { validateEnv } from '../env.schema';

const BASE = {
  MONGO_URI: 'mongodb://localhost/pts',
  JWT_PRIVATE_KEY_B64: 'cGtleQ==',
  JWT_PUBLIC_KEY_B64: 'cHVi',
  OTP_PEPPER: '0123456789abcdef',
  DATA_ENC_SECRET: '0123456789abcdef',
};

describe('env validation (fail-fast boot)', () => {
  it('accepts a minimal valid environment with defaults', () => {
    const env = validateEnv({ ...BASE });
    expect(env.API_PORT).toBe(4000);
    expect(env.TZ).toBe('Asia/Kolkata');
    expect(env.SMS_PROVIDER).toBe('console');
  });

  it('rejects a missing MONGO_URI with a readable message', () => {
    const { MONGO_URI: _omit, ...rest } = BASE;
    expect(() => validateEnv(rest)).toThrow(/MONGO_URI/);
  });

  it('coerces and bounds ports', () => {
    expect(validateEnv({ ...BASE, API_PORT: '8080' }).API_PORT).toBe(8080);
    expect(() => validateEnv({ ...BASE, API_PORT: '99999' })).toThrow();
  });

  it('enforces provider credential pairing', () => {
    expect(() => validateEnv({ ...BASE, SMS_PROVIDER: 'msg91' })).toThrow(/MSG91/);
    expect(() => validateEnv({ ...BASE, MAIL_PROVIDER: 'smtp' })).toThrow(/SMTP_URL/);
    expect(
      validateEnv({ ...BASE, SMS_PROVIDER: 'msg91', MSG91_AUTH_KEY: 'k', MSG91_TEMPLATE_ID: 't' }).SMS_PROVIDER,
    ).toBe('msg91');
  });
});
