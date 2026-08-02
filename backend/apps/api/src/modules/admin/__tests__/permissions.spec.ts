import { DEFAULT_ROLES, hasPermission, PermissionSubject } from '../domain/permissions';

function roleMap(): Map<string, readonly string[]> {
  return new Map(Object.entries(DEFAULT_ROLES).map(([k, v]) => [k, v.permissions] as const));
}

describe('Permission resolution (deny-wins)', () => {
  const roles = roleMap();

  it('grants via role membership', () => {
    const kyc: PermissionSubject = { roles: ['KYC'], permAllow: [], permDeny: [] };
    expect(hasPermission(kyc, roles, 'kyc.review')).toBe(true);
    expect(hasPermission(kyc, roles, 'kyc.view')).toBe(true);
    expect(hasPermission(kyc, roles, 'plans.manage')).toBe(false);
  });

  it("SUPER_ADMIN's '*' grants everything", () => {
    const su: PermissionSubject = { roles: ['SUPER_ADMIN'], permAllow: [], permDeny: [] };
    expect(hasPermission(su, roles, 'rewards.approve')).toBe(true);
    expect(hasPermission(su, roles, 'config.manage')).toBe(true);
  });

  it('per-user allow extends beyond the role', () => {
    const support: PermissionSubject = { roles: ['SUPPORT'], permAllow: ['payments.view'], permDeny: [] };
    expect(hasPermission(support, roles, 'payments.view')).toBe(true);
    expect(hasPermission(support, roles, 'payments.refund')).toBe(false);
  });

  it('DENY overrides a role grant', () => {
    const finance: PermissionSubject = { roles: ['FINANCE'], permAllow: [], permDeny: ['payments.refund'] };
    expect(hasPermission(finance, roles, 'payments.view')).toBe(true);
    expect(hasPermission(finance, roles, 'payments.refund')).toBe(false);
  });

  it('DENY overrides an explicit allow', () => {
    const s: PermissionSubject = { roles: [], permAllow: ['users.view'], permDeny: ['users.view'] };
    expect(hasPermission(s, roles, 'users.view')).toBe(false);
  });

  it("DENY '*' locks out even a SUPER_ADMIN (emergency freeze)", () => {
    const frozen: PermissionSubject = { roles: ['SUPER_ADMIN'], permAllow: [], permDeny: ['*'] };
    expect(hasPermission(frozen, roles, 'users.view')).toBe(false);
    expect(hasPermission(frozen, roles, 'audit.view')).toBe(false);
  });

  it('unknown roles contribute nothing', () => {
    const s: PermissionSubject = { roles: ['DOES_NOT_EXIST'], permAllow: [], permDeny: [] };
    expect(hasPermission(s, roles, 'users.view')).toBe(false);
  });

  it('multiple roles union their grants', () => {
    const s: PermissionSubject = { roles: ['SUPPORT', 'FINANCE'], permAllow: [], permDeny: [] };
    expect(hasPermission(s, roles, 'support.tickets')).toBe(true);
    expect(hasPermission(s, roles, 'payments.refund')).toBe(true);
  });
});
