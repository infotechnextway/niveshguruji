import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reward, RewardSchema } from './infrastructure/schemas/reward.schema';
import { TradingMongoModels } from '../trading/trading.providers';
import { ExecutionService } from '../trading/application/execution.service';
import { ChallengeEvalService } from './application/challenge-eval.service';
import { ChallengeEvalDriver } from './application/challenge-eval.driver';
import { DailyAnchorService } from './application/daily-anchor.service';
import { MarketApiModule } from '../market/market-api.module';

@Module({
  imports: [
    TradingMongoModels,
    MarketApiModule,
    MongooseModule.forFeature([{ name: Reward.name, schema: RewardSchema }]),
  ],
  providers: [ExecutionService, ChallengeEvalService, ChallengeEvalDriver, DailyAnchorService],
})
export class ChallengeEngineModule {}
