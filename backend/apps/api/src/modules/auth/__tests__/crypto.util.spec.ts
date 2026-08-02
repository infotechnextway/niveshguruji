import { decryptField, encryptField } from '../infrastructure/crypto.util';

describe('AES-256-GCM field encryption', () => {
  const secret = 'a-very-long-secret-pepper-value';

  it('round-trips and produces unique ciphertexts (random IV)', () => {
    const enc1 = encryptField('JBSWY3DPEHPK3PXP', secret);
    const enc2 = encryptField('JBSWY3DPEHPK3PXP', secret);
    expect(enc1).not.toBe(enc2);
    expect(decryptField(enc1, secret)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('rejects tampered ciphertext (auth tag)', () => {
    const enc = encryptField('secret-value', secret);
    const parts = enc.split('.');
    parts[2] = parts[2].slice(0, -2) + 'AA';
    expect(() => decryptField(parts.join('.'), secret)).toThrow();
  });

  it('rejects the wrong key', () => {
    const enc = encryptField('secret-value', secret);
    expect(() => decryptField(enc, 'different-secret-pepper-here')).toThrow();
  });
});
