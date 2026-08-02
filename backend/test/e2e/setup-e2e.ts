import { generateKeyPairSync } from 'crypto';

/**
 * e2e env. Requires a real Mongo + Redis (provided as CI service containers,
 * or locally via `docker run`). When E2E_MONGO_URI is absent the suites
 * self-skip (see describeE2E) so the default `npm test` stays hermetic.
 */
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.E2E_MONGO_URI ?? '';
process.env.REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_PRIVATE_KEY_B64 = Buffer.from(privateKey).toString('base64');
process.env.JWT_PUBLIC_KEY_B64 = Buffer.from(publicKey).toString('base64');
process.env.OTP_PEPPER = 'e2e-pepper-0123456789abcdef';
process.env.DATA_ENC_SECRET = 'e2e-data-enc-0123456789abcdef';
process.env.STORAGE_DIR = './data-e2e';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.APP_BASE_URL = 'http://localhost:3000';

export const E2E_ENABLED = !!process.env.E2E_MONGO_URI;
