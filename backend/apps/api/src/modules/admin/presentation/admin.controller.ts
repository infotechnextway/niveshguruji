import { Body, Controller, Get, HttpStatus, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AppException, AuditService, DomainError, Result } from '@app/shared';
import { EmployeeAdminService } from '../application/employee-admin.service';
import { UserAdminService } from '../application/user-admin.service';
import { ConfigAdminService } from '../application/config-admin.service';
import { EmployeeAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal, requestContext } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';
import { PermissionsGuard, RequirePermissions } from './permissions.guard';
import {
  AuditQueryDto, CreateEmployeeDto, RejectUserDto, ResetEmployeePasswordDto, SetConfigDto, SuspendUserDto,
  UpdateEmployeeDto, UpdateRoleDto, UserListQueryDto,
} from './dto/admin.dtos';
import { UserStatus } from '../../auth/domain/auth.types';

function unwrap<T>(result: Result<T, DomainError>): T {
  if (result.isFail) {
    const status =
      result.error.code === 'NOT_FOUND'
        ? HttpStatus.NOT_FOUND
        : result.error.code === 'DUPLICATE'
          ? HttpStatus.CONFLICT
          : HttpStatus.UNPROCESSABLE_ENTITY;
    throw AppException.fromDomain(result.error, status);
  }
  return result.value;
}

@Controller('admin')
@UseGuards(EmployeeAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly employees: EmployeeAdminService,
    private readonly usersAdmin: UserAdminService,
    private readonly configAdmin: ConfigAdminService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Employees & roles (US-ADM-1) ----------

  @Get('employees')
  @RequirePermissions('employees.view')
  listEmployees() {
    return this.employees.list();
  }

  @Post('employees')
  @RequirePermissions('employees.manage')
  async createEmployee(@Body() dto: CreateEmployeeDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.employees.create(dto, p.sub, requestContext(req).ip));
  }

  @Patch('employees/:id')
  @RequirePermissions('employees.manage')
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    return unwrap(await this.employees.update(id, dto, p.sub, requestContext(req).ip));
  }

  @Post('employees/:id/reset-password')
  @RequirePermissions('employees.manage')
  async resetEmployeePassword(
    @Param('id') id: string,
    @Body() dto: ResetEmployeePasswordDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    return unwrap(await this.employees.resetPassword(id, dto.password, p.sub, requestContext(req).ip));
  }

  @Get('roles')
  @RequirePermissions('employees.view')
  listRoles() {
    return this.employees.listRoles();
  }

  @Put('roles/:key')
  @RequirePermissions('roles.manage')
  async updateRole(
    @Param('key') key: string,
    @Body() dto: UpdateRoleDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    return unwrap(await this.employees.updateRole(key, dto.permissions, p.sub, requestContext(req).ip));
  }

  @Get('permissions')
  @RequirePermissions('employees.view')
  permissionCatalog() {
    return this.employees.catalog();
  }

  // ---------- Users (US-ADM-3) ----------

  @Get('users')
  @RequirePermissions('users.view')
  listUsers(@Query() query: UserListQueryDto) {
    return this.usersAdmin.list(
      query.search,
      query.page ?? 1,
      query.pageSize ?? 20,
      query.status as UserStatus | undefined,
    );
  }

  @Get('users/:id')
  @RequirePermissions('users.view')
  async userDetail(@Param('id') id: string) {
    return unwrap(await this.usersAdmin.detail(id));
  }

  @Post('users/:id/approve')
  @RequirePermissions('users.approve')
  async approveUser(@Param('id') id: string, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.usersAdmin.approve(id, p.sub, requestContext(req).ip));
  }

  @Post('users/:id/reject')
  @RequirePermissions('users.approve')
  async rejectUser(
    @Param('id') id: string,
    @Body() dto: RejectUserDto,
    @CurrentPrincipal() p: AccessTokenClaims,
    @Req() req: Request,
  ) {
    return unwrap(await this.usersAdmin.reject(id, dto.reason, p.sub, requestContext(req).ip));
  }

  @Post('users/:id/suspend')
  @RequirePermissions('users.suspend')
  async suspend(@Param('id') id: string, @Body() dto: SuspendUserDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.usersAdmin.suspend(id, dto.reason, p.sub, requestContext(req).ip));
  }

  @Post('users/:id/unsuspend')
  @RequirePermissions('users.suspend')
  async unsuspend(@Param('id') id: string, @Body() dto: SuspendUserDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.usersAdmin.unsuspend(id, dto.reason, p.sub, requestContext(req).ip));
  }

  // ---------- Config (NFR-8) ----------

  @Get('config')
  @RequirePermissions('config.manage')
  listConfig() {
    return this.configAdmin.listAll();
  }

  @Put('config')
  @RequirePermissions('config.manage')
  async setConfig(@Body() dto: SetConfigDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.configAdmin.set(dto.key, dto.value, p.sub, requestContext(req).ip));
  }

  // ---------- Audit (US-ADM-5) ----------

  @Get('audit-logs')
  @RequirePermissions('audit.view')
  async auditLogs(@Query() query: AuditQueryDto) {
    if (query.entity && query.entityId) return this.audit.forEntity(query.entity, query.entityId);
    if (query.actorId) return this.audit.forActor(query.actorId);
    throw new AppException('BAD_QUERY', 'Provide entity+entityId or actorId', HttpStatus.BAD_REQUEST);
  }
}
