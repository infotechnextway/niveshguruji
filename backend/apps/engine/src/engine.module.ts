import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PlatformModule, GlobalExceptionFilter } from '@app/shared';
import { MarketEngineModule } from '../../api/src/modules/market/market-engine.module';
import { TradingEngineModule } from '../../api/src/modules/trading/trading-engine.module';
import { ChallengeEngineModule } from '../../api/src/modules/challenge/challenge-engine.module';
import { EngineHeartbeatService } from './engine-heartbeat.service';

/**
 * engine process — market data ingestion, VEE, challenge evaluator, WS
 * gateway and schedulers land here (P4–P6). P0 ships the platform wiring,
 * health endpoint, and the heartbeat that proves the event bus works
 * across processes.
 */
@Module({
  imports: [PlatformModule, MarketEngineModule, TradingEngineModule, ChallengeEngineModule],
  providers: [
    EngineHeartbeatService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class EngineModule {}
