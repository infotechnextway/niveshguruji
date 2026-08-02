import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from '@app/shared';
import { IntegrationSettings } from '../infrastructure/schemas/integration-settings.schema';

export const MARKET_FEED_MODES = ['simulator', 'upstox', 'angel', 'dhan'] as const;
export type MarketFeedMode = (typeof MARKET_FEED_MODES)[number];
export type LiveFeedMode = Exclude<MarketFeedMode, 'simulator'>;

const PROVIDER = 'market-feed';
const INVALIDATE_CHANNEL = 'integrations:feed-mode';

/**
 * Shared active market-feed mode (simulator | upstox | angel | dhan).
 * Hot-reloads via Redis so api + engine stay in sync.
 */
@Injectable()
export class MarketFeedModeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketFeedModeService.name);
  private feedMode: MarketFeedMode = 'simulator';
  private readonly listeners = new Set<() => void>();
  private envMode: MarketFeedMode;

  constructor(
    @InjectModel(IntegrationSettings.name) private readonly model: Model<IntegrationSettings>,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly subscriber: Redis,
  ) {
    const env = (config.get<string>('MARKET_FEED') || 'simulator') as MarketFeedMode;
    this.envMode = (MARKET_FEED_MODES as readonly string[]).includes(env) ? env : 'simulator';
  }

  async onModuleInit(): Promise<void> {
    await this.reload();
    await this.subscriber.subscribe(INVALIDATE_CHANNEL);
    this.subscriber.on('message', (channel) => {
      if (channel !== INVALIDATE_CHANNEL) return;
      this.reload()
        .then(() => this.emitChange())
        .catch((err) => this.logger.error(`Failed to reload feed mode: ${(err as Error).message}`));
    });
  }

  onModuleDestroy(): void {
    this.listeners.clear();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getFeedMode(): MarketFeedMode {
    return this.feedMode;
  }

  async setFeedMode(feedMode: MarketFeedMode, updatedBy: string): Promise<MarketFeedMode> {
    if (!(MARKET_FEED_MODES as readonly string[]).includes(feedMode)) {
      throw new Error(`Invalid feed mode: ${feedMode}`);
    }
    await this.model.findOneAndUpdate(
      { provider: PROVIDER },
      { provider: PROVIDER, feedMode, updatedBy },
      { upsert: true },
    );
    await this.redis.publish(INVALIDATE_CHANNEL, 'reload');
    await this.reload();
    this.emitChange();
    return this.feedMode;
  }

  private emitChange(): void {
    for (const l of this.listeners) {
      try { l(); } catch (err) {
        this.logger.warn(`Feed-mode listener failed: ${(err as Error).message}`);
      }
    }
  }

  private async reload(): Promise<void> {
    const row = await this.model.findOne({ provider: PROVIDER }).lean<{ feedMode?: MarketFeedMode } | null>();
    if (row?.feedMode && (MARKET_FEED_MODES as readonly string[]).includes(row.feedMode)) {
      this.feedMode = row.feedMode;
      return;
    }
    // Migrate: older installs stored mode on the upstox integration doc.
    const legacy = await this.model.findOne({ provider: 'upstox' }).lean<{ feedMode?: string } | null>();
    if (legacy?.feedMode === 'upstox' || legacy?.feedMode === 'simulator') {
      this.feedMode = legacy.feedMode;
      return;
    }
    this.feedMode = this.envMode;
  }
}
