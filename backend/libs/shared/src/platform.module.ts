import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { validateEnv } from './config/env.schema';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuditModule } from './audit/audit.module';
import { LoggingModule } from './logging/logging.module';
import { AppConfigEntry, AppConfigEntrySchema } from './config/app-config.schema';
import { AppConfigService } from './config/app-config.service';
import { MarketHoliday, MarketHolidaySchema } from './calendar/market-holiday.schema';
import { ExchangeCalendarService } from './calendar/exchange-calendar.service';
import { HealthController } from './health/health.controller';
import { RedisThrottlerStorage } from './rate-limit/redis-throttler.storage';

/**
 * PlatformModule — everything both processes (api & engine) need:
 * env validation, logging, Mongo, Redis, event bus, locks, audit,
 * business config, exchange calendar, health.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggingModule,
    DatabaseModule,
    RedisModule,
    AuditModule,
    MongooseModule.forFeature([
      { name: AppConfigEntry.name, schema: AppConfigEntrySchema },
      { name: MarketHoliday.name, schema: MarketHolidaySchema },
    ]),
  ],
  controllers: [HealthController],
  providers: [AppConfigService, ExchangeCalendarService, RedisThrottlerStorage],
  exports: [AppConfigService, ExchangeCalendarService, RedisThrottlerStorage, RedisModule, AuditModule],
})
export class PlatformModule {}
