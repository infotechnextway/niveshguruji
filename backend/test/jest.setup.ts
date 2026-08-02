import { generateKeyPairSync } from 'crypto';

// Minimal valid environment so importing @app/shared (which eagerly evaluates
// ConfigModule.forRoot's validator) never crashes a unit test.
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/pts-test';
process.env.JWT_PRIVATE_KEY_B64 = Buffer.from(privateKey).toString('base64');
process.env.JWT_PUBLIC_KEY_B64 = Buffer.from(publicKey).toString('base64');
process.env.OTP_PEPPER = 'unit-test-pepper-0123456789abcdef';
process.env.DATA_ENC_SECRET = 'unit-test-data-enc-secret-0123456789';
process.env.STORAGE_DIR = './data-test';
