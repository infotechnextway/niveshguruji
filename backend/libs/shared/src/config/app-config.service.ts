import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { AppConfigEntry } from './app-config.schema';
import { CONFIG_REGISTRY, ConfigKey, ConfigValue } from './config-keys';
import { REDIS_SUBSCRIBER, REDIS_CLIENT } from '../redis/redis.constants';

const INVALIDATE_CHANNEL = 'config:invalidate';

/**
 * DB-backed business configuration with an in-memory cache.
 * - Reads are synchronous after boot (hot path safe for the VEE).
 * - set() persists, validates against the key's schema, and broadcasts an
 *   invalidation so every api/engine instance reloads the key.
 * - Unset keys fall back to their registered defaults.
 */
@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);
  private cache = new Map<string, unknown>();

  constructor(
    @InjectModel(AppConfigEntry.name) private readonly model: Model<AppConfigEntry>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly subscriber: Redis,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reloadAll();
    await this.subscriber.subscribe(INVALIDATE_CHANNEL);
    this.subscriber.on('message', (channel, message) => {
      if (channel !== INVALIDATE_CHANNEL) return;
      this.reloadKey(message).catch((err) =>
        this.logger.error(`Failed to reload config key ${message}: ${err.message}`),
      );
    });
  }

  get<K extends ConfigKey>(key: K): ConfigValue<K> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as ConfigValue<K>;
    }
    return CONFIG_REGISTRY[key].default as ConfigValue<K>;
  }

  async set<K extends ConfigKey>(key: K, value: ConfigValue<K>, updatedBy: string): Promise<void> {
    const registry = CONFIG_REGISTRY[key];
    const parsed = registry.schema.safeParse(value);
    if (!parsed.success) {
      throw new Error(`Invalid value for config key ${key}: ${parsed.error.message}`);
    }
    await this.model.updateOne(
      { key },
      { $set: { value: parsed.data, updatedBy } },
      { upsert: true },
    );
    this.cache.set(key, parsed.data);
    await this.redis.publish(INVALIDATE_CHANNEL, key);
  }

  private async reloadAll(): Promise<void> {
    const rows = await this.model.find().lean();
    const next = new Map<string, unknown>();
    for (const row of rows) {
      const registry = CONFIG_REGISTRY[row.key as ConfigKey];
      if (!registry) continue; // unknown keys are ignored, never crash the process
      const parsed = registry.schema.safeParse(row.value);
      if (parsed.success) next.set(row.key, parsed.data);
      else this.logger.warn(`Stored value for ${row.key} fails schema; using default`);
    }
    this.cache = next;
    this.logger.log(`Loaded ${next.size} business config overrides`);
  }

  private async reloadKey(key: string): Promise<void> {
    const registry = CONFIG_REGISTRY[key as ConfigKey];
    if (!registry) return;
    const row = await this.model.findOne({ key }).lean();
    if (!row) {
      this.cache.delete(key);
      return;
    }
    const parsed = registry.schema.safeParse(row.value);
    if (parsed.success) this.cache.set(key, parsed.data);
  }
}
