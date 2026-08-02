import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService, DomainError, Result } from '@app/shared';
import { Employee } from '../../auth/infrastructure/schemas/employee.schema';
import { Role } from '../infrastructure/role.schema';
import { PasswordService } from '../../auth/infrastructure/password.service';
import { RoleCacheService } from './role-cache.service';
import { PERMISSIONS, PermissionKey } from '../domain/permissions';

export interface CreateEmployeeInput {
  email: string;
  name: string;
  password: string;
  roles: string[];
}

export interface UpdateEmployeeInput {
  name?: string;
  roles?: string[];
  permAllow?: string[];
  permDeny?: string[];
  status?: 'ACTIVE' | 'DISABLED';
}

@Injectable()
export class EmployeeAdminService {
  constructor(
    @InjectModel(Employee.name) private readonly employees: Model<Employee>,
    @InjectModel(Role.name) private readonly roles: Model<Role>,
    private readonly passwords: PasswordService,
    private readonly roleCache: RoleCacheService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.employees.find().select('email name roles permAllow permDeny totpEnabled status createdAt').lean();
  }

  async create(input: CreateEmployeeInput, actorId: string, ip?: string): Promise<Result<{ id: string }>> {
    const invalid = await this.invalidRoles(input.roles);
    if (invalid) return Result.fail(invalid);
    if (await this.employees.exists({ email: input.email.toLowerCase() })) {
      return Result.fail(DomainError.of('DUPLICATE', 'An employee with this email already exists'));
    }
    const employee = await this.employees.create({
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: await this.passwords.hash(input.password),
      roles: input.roles,
      status: 'ACTIVE',
    });
    await this.audit.record({
      actorType: 'EMPLOYEE', actorId, action: 'EMPLOYEE_CREATED', entity: 'employee', entityId: employee.id,
      after: { email: employee.email, roles: employee.roles }, ip,
    });
    return Result.ok({ id: employee.id });
  }

  async update(id: string, input: UpdateEmployeeInput, actorId: string, ip?: string): Promise<Result<true>> {
    if (input.roles) {
      const invalid = await this.invalidRoles(input.roles);
      if (invalid) return Result.fail(invalid);
    }
    for (const list of [input.permAllow, input.permDeny]) {
      const bad = list?.find((p) => !(p in PERMISSIONS));
      if (bad) return Result.fail(DomainError.of('UNKNOWN_PERMISSION', `Unknown permission: ${bad}`));
    }
    const before = await this.employees.findById(id).lean();
    if (!before) return Result.fail(DomainError.of('NOT_FOUND', 'Employee not found'));
    if (id === actorId && (input.status === 'DISABLED' || (input.roles && !input.roles.includes('SUPER_ADMIN') && before.roles.includes('SUPER_ADMIN')))) {
      return Result.fail(DomainError.of('SELF_LOCKOUT', 'You cannot disable or demote your own account'));
    }
    await this.employees.updateOne({ _id: id }, { $set: input });
    await this.audit.record({
      actorType: 'EMPLOYEE', actorId, action: 'EMPLOYEE_UPDATED', entity: 'employee', entityId: id,
      before: { roles: before.roles, permAllow: before.permAllow, permDeny: before.permDeny, status: before.status },
      after: input, ip,
    });
    return Result.ok(true);
  }

  async resetPassword(id: string, newPassword: string, actorId: string, ip?: string): Promise<Result<true>> {
    const employee = await this.employees.findById(id);
    if (!employee) return Result.fail(DomainError.of('NOT_FOUND', 'Employee not found'));
    employee.passwordHash = await this.passwords.hash(newPassword);
    await employee.save();
    await this.audit.record({
      actorType: 'EMPLOYEE', actorId, action: 'EMPLOYEE_PASSWORD_RESET', entity: 'employee', entityId: id, ip,
    });
    return Result.ok(true);
  }

  async updateRole(key: string, permissions: string[], actorId: string, ip?: string): Promise<Result<true>> {
    const role = await this.roles.findOne({ key: key.toUpperCase() });
    if (!role) return Result.fail(DomainError.of('NOT_FOUND', 'Role not found'));
    if (role.locked) return Result.fail(DomainError.of('ROLE_LOCKED', 'SUPER_ADMIN role cannot be modified'));
    const bad = permissions.find((p) => !(p in PERMISSIONS) || p === '*');
    if (bad) return Result.fail(DomainError.of('UNKNOWN_PERMISSION', `Invalid permission for a role: ${bad}`));
    const before = role.permissions;
    role.permissions = permissions;
    await role.save();
    await this.roleCache.refresh();
    await this.audit.record({
      actorType: 'EMPLOYEE', actorId, action: 'ROLE_UPDATED', entity: 'role', entityId: role.key,
      before: { permissions: before }, after: { permissions }, ip,
    });
    return Result.ok(true);
  }

  async listRoles() {
    return this.roles.find().lean();
  }

  catalog(): Record<string, string> {
    return PERMISSIONS as unknown as Record<string, string>;
  }

  private async invalidRoles(keys: string[]): Promise<DomainError | null> {
    const known = new Set((await this.roles.find({ key: { $in: keys } }).lean()).map((r) => r.key));
    const missing = keys.find((k) => !known.has(k));
    return missing ? DomainError.of('UNKNOWN_ROLE', `Unknown role: ${missing}`) : null;
  }
}
