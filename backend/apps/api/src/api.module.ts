import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ValidationPipe } from '@nestjs/common';
import {
  PlatformModule,
  EnvelopeInterceptor,
  GlobalExceptionFilter,
  RedisThrottlerStorage,
} from '@app/shared';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { KycModule } from './modules/kyc/kyc.module';
import { PlansModule } from './modules/plans/plans.module';
import { MarketApiModule } from './modules/market/market-api.module';
import { TradingApiModule } from './modules/trading/trading-api.module';
import { ChallengeApiModule } from './modules/challenge/challenge-api.module';

/**
 * api process — REST surface. Feature modules (AUTH in P1, KYC in P2, ...)
 * are imported here as they are delivered; each brings its own controllers.
 */
@Module({
  imports: [
    PlatformModule,
    AuthModule,
    AdminModule,
    KycModule,
    PlansModule,
    MarketApiModule,
    TradingApiModule,
    ChallengeApiModule,
    ThrottlerModule.forRootAsync({
      imports: [PlatformModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        // Default route-class limit; auth routes get stricter named throttlers in P1.
        throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
        storage,
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // strips unknown fields — NoSQL-injection surface reduction
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    },
  ],
})
export class ApiModule {}
