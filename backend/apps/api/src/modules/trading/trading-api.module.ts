import { Module } from '@nestjs/common';
import { TradingMongoModels } from './trading.providers';
import { ExecutionService } from './application/execution.service';
import { PortfolioService } from './application/portfolio.service';
import { OrderController } from './presentation/order.controller';
import { PortfolioController } from './presentation/portfolio.controller';
import { AuthModule } from '../auth/auth.module';
import { MarketApiModule } from '../market/market-api.module';

@Module({
  imports: [TradingMongoModels, AuthModule, MarketApiModule],
  controllers: [OrderController, PortfolioController],
  providers: [ExecutionService, PortfolioService],
  exports: [ExecutionService],
})
export class TradingApiModule {}
