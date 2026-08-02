import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ChallengeDashboardService } from '../application/challenge-dashboard.service';
import { RewardAdminService } from '../application/reward-admin.service';
import { UserAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { CurrentPrincipal } from '../../auth/presentation/current-principal.decorator';
import { AccessTokenClaims } from '../../auth/domain/auth.types';

@Controller('challenge')
@UseGuards(UserAuthGuard)
export class ChallengeController {
  constructor(
    private readonly dashboard: ChallengeDashboardService,
    private readonly rewards: RewardAdminService,
  ) {}

  @Get('current')
  current(@CurrentPrincipal() p: AccessTokenClaims) {
    return this.dashboard.forUser(p.sub);
  }

  @Get('history')
  history(@CurrentPrincipal() p: AccessTokenClaims) {
    return this.dashboard.history(p.sub);
  }

  @Get(':challengeId')
  detail(@CurrentPrincipal() p: AccessTokenClaims, @Param('challengeId') challengeId: string) {
    return this.dashboard.byId(p.sub, challengeId);
  }

  @Get(':challengeId/reward')
  reward(@CurrentPrincipal() p: AccessTokenClaims, @Param('challengeId') challengeId: string) {
    return this.rewards.myReward(p.sub, challengeId);
  }
}
