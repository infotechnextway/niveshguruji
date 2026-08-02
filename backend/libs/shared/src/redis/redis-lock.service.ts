import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT } from './redis.constants';

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

export interface Lock {
  key: string;
  token: string;
  release: () => Promise<boolean>;
}

/**
 * Distributed lock (SET NX PX + fenced release via Lua compare-and-delete).
 * Foundation for ADR-3: the VEE acquires "lock:account:<challengeId>" so all
 * equity/margin mutations for one account are strictly serialized.
 */
@Injectable()
export class RedisLockService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Try once; returns null if the lock is held elsewhere. */
  async tryAcquire(key: string, ttlMs: number): Promise<Lock | null> {
    const token = randomUUID();
    const ok = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
    if (ok !== 'OK') return null;
    return {
      key,
      token,
      release: async () => (await this.redis.eval(RELEASE_SCRIPT, 1, key, token)) === 1,
    };
  }

  /** Retry with linear backoff until acquired or timeout elapses. */
  async acquire(key: string, ttlMs: number, timeoutMs = 5_000, retryMs = 50): Promise<Lock> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const lock = await this.tryAcquire(key, ttlMs);
      if (lock) return lock;
      if (Date.now() >= deadline) {
        throw new Error(`Timed out acquiring lock ${key}`);
      }
      await new Promise((r) => setTimeout(r, retryMs));
    }
  }

  /** Convenience: run fn under the lock, always releasing. */
  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const lock = await this.acquire(key, ttlMs);
    try {
      return await fn();
    } finally {
      await lock.release();
    }
  }
}
