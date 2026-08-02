import { generateKeyPairSync } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../infrastructure/token.service';
import { AppConfigService } from '@app/shared';

function makeService(): TokenService {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const config = {
    getOrThrow: (k: string) =>
      k === 'JWT_PRIVATE_KEY_B64'
        ? Buffer.from(privateKey).toString('base64')
        : Buffer.from(publicKey).toString('base64'),
  } as unknown as ConfigService;
  const appConfig = {
    get: (k: string) => (k === 'auth.accessToken.ttlSeconds' ? 900 : 30),
  } as unknown as AppConfigService;
  return new TokenService(new JwtService({}), appConfig, config);
}

describe('TokenService', () => {
  const svc = makeService();

  it('signs and verifies RS256 access tokens with actor typing', () => {
    const token = svc.signAccess('user-1', 'USER');
    const claims = svc.verifyAccess(token);
    expect(claims.sub).toBe('user-1');
    expect(claims.actor).toBe('USER');
    expect(claims.typ).toBe('access');
  });

  it('rejects purpose tokens presented as access tokens and vice versa', () => {
    const purpose = svc.signPurpose({ sub: 'u', typ: 'email-verify', email: 'a@b.c' }, 3600);
    expect(() => svc.verifyAccess(purpose)).toThrow();
    const access = svc.signAccess('u', 'USER');
    expect(() => svc.verifyPurpose(access, 'email-verify')).toThrow();
    expect(() => svc.verifyPurpose(purpose, 'pwd-reset')).toThrow();
  });

  it('issues opaque refresh tokens with sha256 persistence hashes', () => {
    const a = svc.newRefreshToken();
    const b = svc.newRefreshToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).toBe(TokenService.hashRefresh(a.raw));
    expect(a.hash).toHaveLength(64);
    expect(a.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);
  });

  it('password fingerprints change with the hash (reset tokens die after use)', () => {
    expect(TokenService.passwordFingerprint('hashA')).not.toBe(TokenService.passwordFingerprint('hashB'));
    expect(TokenService.passwordFingerprint('hashA')).toHaveLength(16);
  });
});
