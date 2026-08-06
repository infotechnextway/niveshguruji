import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Instrument, InstrumentSchema } from './infrastructure/schemas/instrument.schema';
import { Candle1m, Candle1mSchema } from './infrastructure/schemas/candle.schema';
import { Watchlist, WatchlistSchema } from './infrastructure/schemas/watchlist.schema';
import { IntegrationSettings, IntegrationSettingsSchema } from './infrastructure/schemas/integration-settings.schema';
import { InstrumentService } from './application/instrument.service';
import { InstrumentSyncService } from './application/instrument-sync.service';
import { WatchlistService } from './application/watchlist.service';
import { UpstoxCredentialsService } from './application/upstox-credentials.service';
import { AngelCredentialsService } from './application/angel-credentials.service';
import { AngelTokenSyncService } from './application/angel-token-sync.service';
import { DhanCredentialsService } from './application/dhan-credentials.service';
import { DhanTokenSyncService } from './application/dhan-token-sync.service';
import { MarketFeedModeService } from './application/market-feed-mode.service';
import { MarketController } from './presentation/market.controller';
import { WatchlistController } from './presentation/watchlist.controller';
import { InstrumentAdminController } from './presentation/instrument-admin.controller';
import { UpstoxAdminController } from './presentation/upstox-admin.controller';
import { AngelAdminController, FeedModeAdminController } from './presentation/angel-admin.controller';
import { DhanAdminController } from './presentation/dhan-admin.controller';
import { UpstoxHistoryClient } from './infrastructure/upstox-history.client';
import { DhanHistoryClient } from './infrastructure/dhan-history.client';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Instrument.name, schema: InstrumentSchema },
      { name: Candle1m.name, schema: Candle1mSchema },
      { name: Watchlist.name, schema: WatchlistSchema },
      { name: IntegrationSettings.name, schema: IntegrationSettingsSchema },
    ]),
    AuthModule,
    AdminModule,
  ],
  controllers: [
    MarketController,
    WatchlistController,
    InstrumentAdminController,
    UpstoxAdminController,
    AngelAdminController,
    DhanAdminController,
    FeedModeAdminController,
  ],
  providers: [
    InstrumentService,
    InstrumentSyncService,
    WatchlistService,
    UpstoxHistoryClient,
    DhanHistoryClient,
    UpstoxCredentialsService,
    AngelCredentialsService,
    AngelTokenSyncService,
    DhanCredentialsService,
    DhanTokenSyncService,
    MarketFeedModeService,
  ],
  exports: [InstrumentService],
})
export class MarketApiModule {}
