import { authenticator } from 'otplib';

describe('TOTP (admin 2FA dependency contract)', () => {
  it('verifies codes generated from the provisioned secret', () => {
    const secret = authenticator.generateSecret();
    const code = authenticator.generate(secret);
    expect(authenticator.verify({ token: code, secret })).toBe(true);
    expect(authenticator.verify({ token: '000000', secret })).toBe(false);
  });

  it('builds an otpauth provisioning URI', () => {
    const uri = authenticator.keyuri('admin@example.com', 'PaperTradingSim Admin', authenticator.generateSecret());
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
  });
});
