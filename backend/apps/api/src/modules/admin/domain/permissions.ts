/**
 * Platform-wide permission catalog (US-ADM-1). Defined for ALL phases now so
 * role definitions remain stable as modules land. '*' = everything.
 */
export const PERMISSIONS = {
  'users.view': 'View users and their profiles',
  'users.suspend': 'Suspend / unsuspend user accounts',
  'users.approve': 'Approve or reject user registrations',
  'kyc.view': 'View KYC applications and documents',
  'kyc.review': 'Claim, approve and reject KYC applications',
  'employees.view': 'View employees',
  'employees.manage': 'Create and modify employees, roles and overrides',
  'roles.manage': 'Edit role permission sets',
  'config.manage': 'View and change business configuration',
  'audit.view': 'Read audit logs',
  'plans.manage': 'Create and edit simulator plans (P3)',
  'payments.view': 'View payments and reconciliation (P3)',
  'payments.refund': 'Process refunds (P3)',
  'instruments.manage': 'Enable/disable instruments, holidays, market config (P4)',
  'challenges.view': 'View challenge states (P6)',
  'rewards.review': 'Review passed challenges (P7)',
  'rewards.approve': 'Approve / reject / override rewards (P7)',
  'reports.view': 'Reports and analytics (P10 scope grows)',
  'support.tickets': 'Handle support tickets (P9)',
  '*': 'Everything (SUPER_ADMIN only)',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const DEFAULT_ROLES: Record<string, { name: string; permissions: PermissionKey[] }> = {
  SUPER_ADMIN: { name: 'Super Admin', permissions: ['*'] },
  ADMIN: {
    name: 'Admin',
    permissions: ['users.view', 'users.suspend', 'users.approve', 'kyc.view', 'employees.view', 'audit.view', 'reports.view', 'challenges.view', 'payments.view'],
  },
  FINANCE: { name: 'Finance', permissions: ['payments.view', 'payments.refund', 'rewards.review', 'reports.view', 'users.view'] },
  KYC: { name: 'KYC Officer', permissions: ['kyc.view', 'kyc.review', 'users.view', 'users.approve'] },
  SUPPORT: { name: 'Support', permissions: ['users.view', 'users.approve', 'support.tickets'] },
  OPERATIONS: { name: 'Operations', permissions: ['plans.manage', 'instruments.manage', 'config.manage', 'users.view', 'reports.view'] },
};

export interface PermissionSubject {
  roles: string[];
  permAllow: string[];
  permDeny: string[];
}

/**
 * Effective permission check: union of role grants plus per-user allows,
 * minus per-user denies. DENY WINS over any grant, including '*'.
 */
export function hasPermission(
  subject: PermissionSubject,
  rolePermissions: ReadonlyMap<string, readonly string[]>,
  required: PermissionKey,
): boolean {
  if (subject.permDeny.includes(required) || subject.permDeny.includes('*')) return false;
  if (subject.permAllow.includes(required) || subject.permAllow.includes('*')) return true;
  for (const role of subject.roles) {
    const grants = rolePermissions.get(role) ?? [];
    if (grants.includes('*') || grants.includes(required)) return true;
  }
  return false;
}
