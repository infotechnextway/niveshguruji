import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PortfolioService } from '../application/portfolio.service';
import { UserAuthGuard } from '../../auth/presentation/jwt-auth.guard';

@Controller('portfolio')
@UseGuards(UserAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get(':challengeId/positions')
  positions(@Param('challengeId') challengeId: string) {
    return this.portfolio.positionsView(challengeId);
  }

  @Get(':challengeId/holdings')
  holdings(@Param('challengeId') challengeId: string) {
    return this.portfolio.holdingsView(challengeId);
  }

  @Get(':challengeId/trades')
  trades(@Param('challengeId') challengeId: string) {
    return this.portfolio.recentTrades(challengeId);
  }
}
