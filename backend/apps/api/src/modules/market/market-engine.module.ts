import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Instrument, InstrumentSchema } from './infrastructure/schemas/instrument.schema';
import { Candle1m, Candle1mSchema } from './infrastructure/schemas/candle.schema';
import { IntegrationSettings, IntegrationSettingsSchema } from './infrastructure/schemas/integration-settings.schema';
import { MarketDataService } from './application/market-data.service';
import { UpstoxCredentialsService } from './application/upstox-credentials.service';
import { AngelCredentialsService } from './application/angel-credentials.service';
import { DhanCredentialsService } from './application/dhan-credentials.service';
import { MarketFeedModeService } from './application/market-feed-mode.service';
import { MARKET_FEED } from './infrastructure/feed/market-feed.port';
import { SimulatorFeed } from './infrastructure/feed/simulator-feed';
import { UpstoxFeed } from './infrastructure/feed/upstox-feed';
import { AngelOneFeed } from './infrastructure/feed/angel-one-feed';
import { DhanFeed } from './infrastructure/feed/dhan-feed';
import { SwitchableMarketFeed } from './infrastructure/feed/switchable-market-feed';
import { MarketGateway } from './presentation/market.gateway';
import { TokenService } from '../auth/infrastructure/token.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Instrument.name, schema: InstrumentSchema },
      { name: Candle1m.name, schema: Candle1mSchema },
      { name: IntegrationSettings.name, schema: IntegrationSettingsSchema },
    ]),
    JwtModule.register({}),
  ],
  providers: [
    MarketDataService,
    MarketGateway,
    TokenService,
    UpstoxCredentialsService,
    AngelCredentialsService,
    DhanCredentialsService,
    MarketFeedModeService,
    SimulatorFeed,
    UpstoxFeed,
    AngelOneFeed,
    DhanFeed,
    SwitchableMarketFeed,
    { provide: MARKET_FEED, useExisting: SwitchableMarketFeed },
  ],
})
export class MarketEngineModule {}
