import { Body, Controller, Get, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AppException, DomainError, Result } from '@app/shared';
import { RewardAdminService } from '../application/reward-admin.service';
import { RewardStatus } from '../infrastructure/schemas/reward.schema';
import { ApproveRewardDto, MarkPaidDto, RejectRewardDto, RewardQueueQueryDto } from './dto/reward.dtos';
import { EmployeeAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal, requestContext } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';
import { PermissionsGuard, RequirePermissions } from '../../admin/presentation/permissions.guard';

function unwrap<T>(r: Result<T, DomainError>): T {
  if (r.isFail) {
    const status =
      r.error.code === 'NOT_FOUND' ? HttpStatus.NOT_FOUND
      : r.error.code === 'REWARD_INVALID_TRANSITION' ? HttpStatus.CONFLICT
      : HttpStatus.UNPROCESSABLE_ENTITY;
    throw AppException.fromDomain(r.error, status);
  }
  return r.value;
}

@Controller('admin/rewards')
@UseGuards(EmployeeAuthGuard, PermissionsGuard)
export class RewardAdminController {
  constructor(private readonly rewards: RewardAdminService) {}

  @Get('queue')
  @RequirePermissions('rewards.review')
  queue(@Query() query: RewardQueueQueryDto) {
    return this.rewards.queue(query.status as RewardStatus | undefined, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get(':id')
  @RequirePermissions('rewards.review')
  async detail(@Param('id') id: string) {
    return unwrap(await this.rewards.detail(id));
  }

  @Post(':id/approve')
  @RequirePermissions('rewards.approve')
  async approve(@Param('id') id: string, @Body() dto: ApproveRewardDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.rewards.approve(id, dto.overrideAmountPaise, dto.reason, p.sub, requestContext(req).ip));
  }

  @Post(':id/reject')
  @RequirePermissions('rewards.approve')
  async reject(@Param('id') id: string, @Body() dto: RejectRewardDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.rewards.reject(id, dto.reason, p.sub, requestContext(req).ip));
  }

  @Post(':id/mark-paid')
  @RequirePermissions('rewards.approve')
  async markPaid(@Param('id') id: string, @Body() dto: MarkPaidDto, @CurrentPrincipal() p: AccessTokenClaims, @Req() req: Request) {
    return unwrap(await this.rewards.markPaid(id, dto.reason, p.sub, requestContext(req).ip));
  }
}
