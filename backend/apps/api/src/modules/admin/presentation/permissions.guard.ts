import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee } from '../../auth/infrastructure/schemas/employee.schema';
import { AuthedRequest } from '../../auth/presentation/jwt-auth.guard';
import { hasPermission, PermissionKey } from '../domain/permissions';
import { RoleCacheService } from '../application/role-cache.service';

export const PERMISSIONS_KEY = 'required_permissions';
export const RequirePermissions = (...permissions: PermissionKey[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Runs AFTER EmployeeAuthGuard. Resolves against the live employee record so
 * role changes, overrides, and disablement apply immediately — not at token
 * expiry. Deny-wins semantics live in the pure domain function.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleCache: RoleCacheService,
    @InjectModel(Employee.name) private readonly employees: Model<Employee>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const employee = await this.employees.findById(req.principal.sub).lean();
    if (!employee || employee.status !== 'ACTIVE') throw new UnauthorizedException('Employee inactive');

    const ok = required.every((p) => hasPermission(employee, this.roleCache.rolePermissions, p));
    if (!ok) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
