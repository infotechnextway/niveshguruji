import { decryptBuffer, encryptBuffer } from '../../auth/infrastructure/crypto.util';

describe('KYC document encryption (AES-256-GCM buffers)', () => {
  const secret = 'data-enc-secret-value-1234567890';

  it('round-trips binary content of arbitrary size', () => {
    const original = Buffer.from('%PDF-1.4 binary\x00\x01\x02 identity document bytes');
    const enc = encryptBuffer(original, secret);
    expect(enc.equals(original)).toBe(false);
    expect(decryptBuffer(enc, secret).equals(original)).toBe(true);
  });

  it('produces a unique ciphertext each time (random IV)', () => {
    const original = Buffer.from('same content');
    expect(encryptBuffer(original, secret).equals(encryptBuffer(original, secret))).toBe(false);
  });

  it('fails to decrypt tampered blobs (auth tag)', () => {
    const enc = encryptBuffer(Buffer.from('secret doc'), secret);
    enc[enc.length - 1] ^= 0xff;
    expect(() => decryptBuffer(enc, secret)).toThrow();
  });

  it('fails with the wrong key', () => {
    const enc = encryptBuffer(Buffer.from('secret doc'), secret);
    expect(() => decryptBuffer(enc, 'a-different-secret-value-000000')).toThrow();
  });
});
