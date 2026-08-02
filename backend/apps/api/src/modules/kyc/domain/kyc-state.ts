import { DomainError, Result } from '@app/shared';

export enum KycAppStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export type KycAction = 'CLAIM' | 'APPROVE' | 'REJECT';

const TRANSITIONS: Record<KycAppStatus, Partial<Record<KycAction, KycAppStatus>>> = {
  [KycAppStatus.SUBMITTED]: { CLAIM: KycAppStatus.UNDER_REVIEW },
  [KycAppStatus.UNDER_REVIEW]: { APPROVE: KycAppStatus.APPROVED, REJECT: KycAppStatus.REJECTED },
  [KycAppStatus.APPROVED]: {},
  [KycAppStatus.REJECTED]: {},
};

/** Pure transition function (US-KYC-1) — services cannot produce an illegal state. */
export function transition(current: KycAppStatus, action: KycAction): Result<KycAppStatus> {
  const next = TRANSITIONS[current]?.[action];
  if (!next) {
    return Result.fail(
      DomainError.of('KYC_INVALID_TRANSITION', `Cannot ${action} an application in ${current} state`, { current, action }),
    );
  }
  return Result.ok(next);
}

export const KYC_DOCUMENT_TYPES = ['PAN', 'ID_PROOF', 'ADDRESS_PROOF', 'SELFIE'] as const;
export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

export const KYC_ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export const KYC_MAX_FILE_BYTES = 5 * 1024 * 1024;
