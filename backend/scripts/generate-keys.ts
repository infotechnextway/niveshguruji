/* eslint-disable no-console */
import { generateKeyPairSync } from 'crypto';

/** Prints base64-encoded RS256 PEM keypair for JWT_PRIVATE_KEY_B64 / JWT_PUBLIC_KEY_B64. */
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

console.log('JWT_PRIVATE_KEY_B64=' + Buffer.from(privateKey).toString('base64'));
console.log('JWT_PUBLIC_KEY_B64=' + Buffer.from(publicKey).toString('base64'));
