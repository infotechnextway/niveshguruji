import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

interface HealthReport {
  status: 'ok';
  uptimeSec: number;
  mongo: 'up';
  redis: 'up';
}

/**
 * Liveness+readiness endpoint. Returns 503 unless BOTH Mongo and Redis
 * answer a ping — the P0 exit criterion is this endpoint returning ok
 * from both api and engine containers.
 */
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongo: Connection,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check(): Promise<HealthReport> {
    const [mongoOk, redisOk] = await Promise.all([this.pingMongo(), this.pingRedis()]);
    if (!mongoOk || !redisOk) {
      throw new ServiceUnavailableException(
        `dependencies down: ${[!mongoOk && 'mongo', !redisOk && 'redis'].filter(Boolean).join(',')}`,
      );
    }
    return { status: 'ok', uptimeSec: Math.round(process.uptime()), mongo: 'up', redis: 'up' };
  }

  private async pingMongo(): Promise<boolean> {
    try {
      if (!this.mongo.db) return false;
      await this.mongo.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }

  private async pingRedis(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
