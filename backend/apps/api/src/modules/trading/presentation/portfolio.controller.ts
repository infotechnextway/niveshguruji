import { Controller, Get, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AppException } from '@app/shared';
import { PortfolioService } from '../application/portfolio.service';
import { UserAuthGuard } from '../../auth/presentation/jwt-auth.guard';

function validateChallengeId(challengeId: string): void {
  if (!Types.ObjectId.isValid(challengeId)) {
    throw new AppException('BAD_REQUEST', 'Invalid challenge ID format', HttpStatus.BAD_REQUEST);
  }
}

@Controller('portfolio')
@UseGuards(UserAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get(':challengeId/positions')
  positions(@Param('challengeId') challengeId: string) {
    validateChallengeId(challengeId);
    return this.portfolio.positionsView(challengeId);
  }

  @Get(':challengeId/holdings')
  holdings(@Param('challengeId') challengeId: string) {
    validateChallengeId(challengeId);
    return this.portfolio.holdingsView(challengeId);
  }

  @Get(':challengeId/trades')
  trades(@Param('challengeId') challengeId: string) {
    validateChallengeId(challengeId);
    return this.portfolio.recentTrades(challengeId);
  }
}
