export enum UserStatus {
  PENDING_MOBILE = 'PENDING_MOBILE',
  PENDING_EMAIL = 'PENDING_EMAIL',
  /** Registered; waiting for admin to approve login access. */
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export enum IncomeType {
  SALARIED = 'SALARIED',
  OWN = 'OWN',
}

export enum KycStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export type ActorKind = 'USER' | 'EMPLOYEE';

export interface AccessTokenClaims {
  sub: string;
  actor: ActorKind;
  typ: 'access';
  roles?: string[];
}

export interface TokenPair {
  accessToken: string;
  accessExpiresInSec: number;
  refreshToken: string;
  refreshExpiresAt: string;
}

export interface RequestContext {
  ip?: string;
  userAgent?: string;
  deviceId?: string;
}
