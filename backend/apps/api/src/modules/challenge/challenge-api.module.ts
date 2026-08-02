import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reward, RewardSchema } from './infrastructure/schemas/reward.schema';
import { Challenge, ChallengeSchema } from '../plans/infrastructure/schemas/challenge.schema';
import { Position, PositionSchema } from '../trading/infrastructure/schemas/position.schema';
import { ChallengeDashboardService } from './application/challenge-dashboard.service';
import { RewardAdminService } from './application/reward-admin.service';
import { ChallengeController } from './presentation/challenge.controller';
import { RewardAdminController } from './presentation/reward-admin.controller';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { MarketApiModule } from '../market/market-api.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reward.name, schema: RewardSchema },
      { name: Challenge.name, schema: ChallengeSchema },
      { name: Position.name, schema: PositionSchema },
    ]),
    AuthModule,
    AdminModule,
    MarketApiModule,
  ],
  controllers: [ChallengeController, RewardAdminController],
  providers: [ChallengeDashboardService, RewardAdminService],
})
export class ChallengeApiModule {}
