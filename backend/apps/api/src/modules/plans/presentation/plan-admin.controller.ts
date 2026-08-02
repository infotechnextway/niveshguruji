import { Body, Controller, Get, HttpStatus, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AppException, DomainError, Result } from '@app/shared';
import { PlanService } from '../application/plan.service';
import { PurchaseService } from '../application/purchase.service';
import { EmployeeAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal, requestContext } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';
import { PermissionsGuard, RequirePermissions } from '../../admin/presentation/permissions.guard';
import { CreatePlanDto, PaymentListQueryDto, PlanStatusDto, RefundDto, UpdatePlanDto } from './dto/plan.dtos';
import { PaymentStatus, PlanStatus } from '../domain/plan.types';

function unwrap<T>(r: Result<T, DomainError>): T {
  if (r.isFail) {
    const status =
      r.error.code === 'NOT_FOUND' ? HttpStatus.NOT_FOUND
      : r.error.code === 'DUPLICATE' ? HttpStatus.CONFLICT
      : r.error.code === 'NOT_REFUNDABLE' ? HttpStatus.CONFLICT
      : HttpStatus.UNPROCESSABLE_ENTITY;
    throw AppException.fromDomain(r.error, status);
  }
  return r.value;
}

@Controller('admin')
@UseGuards(EmployeeAuthGuard, PermissionsGuard)
export class PlanAdminController {
  constructor(private readonly plans: PlanService, private readonly purchase: PurchaseService) {}

  @Get('plans')
  @RequirePermissions('plans.manage')
  listPlans() {
    return this.plans.listAdmin();
  }

  @Post('plans')
  @RequirePermissions('plans.manage')
  async create(@Body() dto: CreatePlanDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.plans.create(dto as never, p.sub, requestContext(req).ip));
  }

  @Patch('plans/:id')
  @RequirePermissions('plans.manage')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.plans.update(id, dto as never, p.sub, requestContext(req).ip));
  }

  @Put('plans/:id/status')
  @RequirePermissions('plans.manage')
  async setStatus(@Param('id') id: string, @Body() dto: PlanStatusDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.plans.setStatus(id, dto.status as PlanStatus, p.sub, requestContext(req).ip));
  }

  @Get('payments')
  @RequirePermissions('payments.view')
  listPayments(@Query() query: PaymentListQueryDto) {
    return this.purchase.listPayments(query.status as PaymentStatus | undefined, query.page ?? 1, query.pageSize ?? 20);
  }

  @Post('payments/:id/refund')
  @RequirePermissions('payments.refund')
  async refund(@Param('id') id: string, @Body() dto: RefundDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.purchase.refund(id, dto.reason, p.sub, requestContext(req).ip));
  }
}
