import { Module } from '@nestjs/common';
import { TradingMongoModels } from './trading.providers';
import { ExecutionService } from './application/execution.service';
import { TradingEngineService } from './application/trading-engine.service';
import { MarketApiModule } from '../market/market-api.module';

@Module({
  imports: [TradingMongoModels, MarketApiModule],
  providers: [ExecutionService, TradingEngineService],
})
export class TradingEngineModule {}
