import { KycAppStatus, transition } from '../domain/kyc-state';

describe('KYC state machine (pure transitions)', () => {
  it('follows the happy path SUBMITTED → UNDER_REVIEW → APPROVED', () => {
    const claimed = transition(KycAppStatus.SUBMITTED, 'CLAIM');
    expect(claimed.value).toBe(KycAppStatus.UNDER_REVIEW);
    const approved = transition(claimed.value, 'APPROVE');
    expect(approved.value).toBe(KycAppStatus.APPROVED);
  });

  it('allows rejection from UNDER_REVIEW', () => {
    expect(transition(KycAppStatus.UNDER_REVIEW, 'REJECT').value).toBe(KycAppStatus.REJECTED);
  });

  it('cannot approve or reject before claiming', () => {
    expect(transition(KycAppStatus.SUBMITTED, 'APPROVE').isFail).toBe(true);
    expect(transition(KycAppStatus.SUBMITTED, 'REJECT').isFail).toBe(true);
  });

  it('cannot claim an already-claimed application', () => {
    expect(transition(KycAppStatus.UNDER_REVIEW, 'CLAIM').isFail).toBe(true);
  });

  it('terminal states reject all further actions', () => {
    for (const action of ['CLAIM', 'APPROVE', 'REJECT'] as const) {
      expect(transition(KycAppStatus.APPROVED, action).isFail).toBe(true);
      expect(transition(KycAppStatus.REJECTED, action).isFail).toBe(true);
    }
  });

  it('failed transitions carry a descriptive error code', () => {
    const res = transition(KycAppStatus.APPROVED, 'APPROVE');
    expect(res.error.code).toBe('KYC_INVALID_TRANSITION');
    expect(res.error.details).toEqual({ current: 'APPROVED', action: 'APPROVE' });
  });
});
