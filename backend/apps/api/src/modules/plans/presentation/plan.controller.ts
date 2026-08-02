import { Body, Controller, Get, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AppException, DomainError, Result } from '@app/shared';
import { PlanService } from '../application/plan.service';
import { PurchaseService } from '../application/purchase.service';
import { CreateOrderDto, ConfirmCheckoutDto } from './dto/plan.dtos';
import { UserAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';

function unwrap<T>(r: Result<T, DomainError>): T {
  if (r.isFail) {
    const status =
      r.error.code === 'NOT_FOUND' ? HttpStatus.NOT_FOUND
      : r.error.code === 'KYC_REQUIRED' ? HttpStatus.FORBIDDEN
      : r.error.code === 'ACTIVE_CHALLENGE_EXISTS' || r.error.code === 'PLAN_UNAVAILABLE' ? HttpStatus.CONFLICT
      : r.error.code === 'SIGNATURE_INVALID' ? HttpStatus.BAD_REQUEST
      : HttpStatus.UNPROCESSABLE_ENTITY;
    throw AppException.fromDomain(r.error, status);
  }
  return r.value;
}

@Controller('plans')
export class PlanController {
  constructor(private readonly plans: PlanService, private readonly purchase: PurchaseService) {}

  @Get()
  listPublic() {
    return this.plans.listPublic();
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return unwrap(await this.plans.getById(id));
  }

  @Post('order')
  @UseGuards(UserAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async createOrder(@CurrentPrincipal() p: AccessTokenClaims, @Body() dto: CreateOrderDto) {
    return unwrap(await this.purchase.createOrder(p.sub, dto.planId));
  }

  @Post('confirm')
  @UseGuards(UserAuthGuard)
  async confirm(@Body() dto: ConfirmCheckoutDto) {
    return unwrap(await this.purchase.confirmCheckout(dto.orderId, dto.paymentId, dto.signature));
  }

  @Get('me/subscription')
  @UseGuards(UserAuthGuard)
  async mySubscription(@CurrentPrincipal() p: AccessTokenClaims) {
    return this.purchase.mySubscription(p.sub);
  }

  @Get('me/payments')
  @UseGuards(UserAuthGuard)
  async myPayments(@CurrentPrincipal() p: AccessTokenClaims) {
    return this.purchase.myPayments(p.sub);
  }
}
