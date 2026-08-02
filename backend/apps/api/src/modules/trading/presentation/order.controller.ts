import { Body, Controller, Delete, Get, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppException, DomainError, Result } from '@app/shared';
import { ExecutionService } from '../application/execution.service';
import { PortfolioService } from '../application/portfolio.service';
import { PlaceOrderDto } from './dto/order.dtos';
import { UserAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';

function unwrap<T>(r: Result<T, DomainError>): T {
  if (r.isFail) {
    const status =
      r.error.code === 'NOT_FOUND' ? HttpStatus.NOT_FOUND
      : ['CHALLENGE_NOT_TRADABLE', 'MARKET_CLOSED', 'INSTRUMENT_DISABLED', 'SEGMENT_NOT_ALLOWED', 'INSUFFICIENT_CAPITAL', 'FREEZE_QTY_EXCEEDED', 'NO_MARKET_DATA'].includes(r.error.code) ? HttpStatus.UNPROCESSABLE_ENTITY
      : r.error.code === 'NOT_CANCELLABLE' ? HttpStatus.CONFLICT
      : HttpStatus.UNPROCESSABLE_ENTITY;
    throw AppException.fromDomain(r.error, status);
  }
  return r.value;
}

@Controller('orders')
@UseGuards(UserAuthGuard)
export class OrderController {
  constructor(private readonly execution: ExecutionService, private readonly portfolio: PortfolioService) {}

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async place(@CurrentPrincipal() p: AccessTokenClaims, @Body() dto: PlaceOrderDto) {
    return unwrap(await this.execution.placeOrder({
      challengeId: dto.challengeId, userId: p.sub, instrumentKey: dto.instrumentKey,
      side: dto.side, type: dto.type, product: dto.product, qty: dto.qty,
      limitPricePaise: dto.limitPricePaise, trigger: dto.trigger,
    }));
  }

  @Delete(':orderId')
  async cancel(@CurrentPrincipal() p: AccessTokenClaims, @Param('orderId') orderId: string) {
    return unwrap(await this.execution.cancelOrder(p.sub, orderId));
  }

  @Get(':challengeId/book')
  book(@Param('challengeId') challengeId: string) {
    return this.portfolio.orderBook(challengeId);
  }
}
