import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { AppConfigService } from '@app/shared';
import { AccessTokenClaims, ActorKind } from '../domain/auth.types';

export interface PurposeTokenClaims {
  sub: string;
  typ: 'email-verify' | 'pwd-reset';
  email?: string;
  /** Fingerprint of current password hash — reset tokens die after use. */
  pwdFp?: string;
}

/**
 * RS256 JWTs for access + short-lived purpose tokens; opaque random refresh
 * tokens (returned raw, persisted only as sha256).
 */
@Injectable()
export class TokenService {
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly appConfig: AppConfigService,
    config: ConfigService,
  ) {
    this.privateKey = Buffer.from(config.getOrThrow<string>('JWT_PRIVATE_KEY_B64'), 'base64').toString('utf8');
    this.publicKey = Buffer.from(config.getOrThrow<string>('JWT_PUBLIC_KEY_B64'), 'base64').toString('utf8');
  }

  get accessTtlSec(): number {
    return this.appConfig.get('auth.accessToken.ttlSeconds');
  }

  get refreshTtlDays(): number {
    return this.appConfig.get('auth.refreshToken.ttlDays');
  }

  signAccess(sub: string, actor: ActorKind, roles?: string[]): string {
    const claims: AccessTokenClaims = { sub, actor, typ: 'access', roles };
    return this.jwt.sign(claims, {
      algorithm: 'RS256',
      privateKey: this.privateKey,
      expiresIn: this.accessTtlSec,
    });
  }

  verifyAccess(token: string): AccessTokenClaims {
    const claims = this.jwt.verify<AccessTokenClaims>(token, {
      algorithms: ['RS256'],
      publicKey: this.publicKey,
    });
    if (claims.typ !== 'access') throw new Error('Wrong token type');
    return claims;
  }

  signPurpose(claims: PurposeTokenClaims, ttlSeconds: number): string {
    return this.jwt.sign(claims, { algorithm: 'RS256', privateKey: this.privateKey, expiresIn: ttlSeconds });
  }

  verifyPurpose(token: string, expected: PurposeTokenClaims['typ']): PurposeTokenClaims {
    const claims = this.jwt.verify<PurposeTokenClaims>(token, {
      algorithms: ['RS256'],
      publicKey: this.publicKey,
    });
    if (claims.typ !== expected) throw new Error('Wrong token type');
    return claims;
  }

  newRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
    const raw = randomBytes(48).toString('base64url');
    return {
      raw,
      hash: TokenService.hashRefresh(raw),
      expiresAt: new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000),
    };
  }

  static hashRefresh(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  static passwordFingerprint(passwordHash: string): string {
    return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
  }
}
