import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM field encryption for sensitive-at-rest values (TOTP secrets now;
 * KYC document keys in P2). Key derived from OTP_PEPPER + a fixed context so a
 * single secret drives the P1 footprint; migrates to a dedicated key/KMS later
 * without format change (payload is iv.tag.ciphertext base64url).
 */
export function encryptField(plain: string, secret: string): string {
  const key = createHash('sha256').update(`field-enc:${secret}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ct].map((b) => b.toString('base64url')).join('.');
}

export function decryptField(payload: string, secret: string): string {
  const [ivB, tagB, ctB] = payload.split('.');
  const key = createHash('sha256').update(`field-enc:${secret}`).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64url')), decipher.final()]).toString('utf8');
}

/** Binary variant for file blobs (KYC documents). Same iv.tag.ct layout, binary concat. */
export function encryptBuffer(plain: Buffer, secret: string): Buffer {
  const key = createHash('sha256').update(`field-enc:${secret}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

export function decryptBuffer(payload: Buffer, secret: string): Buffer {
  const key = createHash('sha256').update(`field-enc:${secret}`).digest();
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ct = payload.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}
