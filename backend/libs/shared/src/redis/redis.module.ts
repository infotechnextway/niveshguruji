import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ModuleRef } from '@nestjs/core';
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from './redis.constants';
import { RedisEventBus } from './redis-event-bus';
import { RedisLockService } from './redis-lock.service';
import { EVENT_BUS } from '../kernel/domain-event';

function createClient(config: ConfigService): Redis {
  return new Redis(config.getOrThrow<string>('REDIS_URL'), {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 200, 5_000),
  });
}

@Global()
@Module({
  providers: [
    { provide: REDIS_CLIENT, useFactory: createClient, inject: [ConfigService] },
    { provide: REDIS_SUBSCRIBER, useFactory: createClient, inject: [ConfigService] },
    { provide: EVENT_BUS, useClass: RedisEventBus },
    RedisLockService,
  ],
  exports: [REDIS_CLIENT, REDIS_SUBSCRIBER, EVENT_BUS, RedisLockService],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    for (const token of [REDIS_CLIENT, REDIS_SUBSCRIBER]) {
      const client = this.moduleRef.get<Redis>(token, { strict: false });
      if (client) await client.quit().catch(() => client.disconnect());
    }
  }
}
