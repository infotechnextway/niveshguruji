import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import {
  AppConfigService, Candle, EVENT_BUS, EventBus, ExchangeCalendarService, Quote,
  quoteCacheKey, quoteChannel, REDIS_CLIENT,
} from '@app/shared';
import { Candle1m } from '../infrastructure/schemas/candle.schema';
import { MARKET_FEED, MarketFeed } from '../infrastructure/feed/market-feed.port';
import { CandleAggregator } from '../domain/candle-aggregator';

const QUOTE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Engine-side ingestion pipeline (ADR-7). Owns the single MarketFeed, writes
 * each normalized tick to Redis, fans out on the event bus, aggregates 1m
 * candles, and runs the stale-feed watchdog.
 *
 * Upstream subscribe is **on demand**: gateway rooms (and explicit
 * ensureSubscribed callers) refcount instruments so the huge master is never
 * subscribed wholesale.
 */
@Injectable()
export class MarketDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly aggregator = new CandleAggregator();
  private watchdog?: ReturnType<typeof setInterval>;
  private candleBuffer: Candle[] = [];
  private flushTimer?: ReturnType<typeof setInterval>;
  /** instrumentKey → number of interested client rooms / consumers. */
  private readonly interest = new Map<string, number>();

  constructor(
    @InjectModel(Candle1m.name) private readonly candles: Model<Candle1m>,
    @Inject(MARKET_FEED) private readonly feed: MarketFeed,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(EVENT_BUS) private readonly bus: EventBus,
    private readonly calendar: ExchangeCalendarService,
    private readonly appConfig: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.feed.onTick((q) => void this.handleTick(q));
    await this.feed.start();

    this.flushTimer = setInterval(() => void this.flushCandles(), 5_000);
    this.flushTimer.unref();
    this.watchdog = setInterval(() => this.checkFeedHealth(), 5_000);
    this.watchdog.unref();
    this.logger.log(`Market data pipeline started (feed=${this.feed.name}, on-demand subscribe)`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.watchdog) clearInterval(this.watchdog);
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flushCandles();
    await this.feed.stop();
  }

  /**
   * Increment interest for keys; subscribe upstream when count goes 0→1.
   * Called by MarketGateway when a room gains its first client.
   */
  async addInterest(instrumentKeys: string[]): Promise<void> {
    const toSub: string[] = [];
    for (const key of instrumentKeys) {
      const next = (this.interest.get(key) ?? 0) + 1;
      this.interest.set(key, next);
      if (next === 1) toSub.push(key);
    }
    if (toSub.length) {
      await this.feed.subscribe(toSub);
      this.logger.debug(`Upstream subscribe +${toSub.length} (tracked=${this.interest.size})`);
    }
  }

  /**
   * Decrement interest; unsubscribe upstream when count hits 0.
   */
  async removeInterest(instrumentKeys: string[]): Promise<void> {
    const toUnsub: string[] = [];
    for (const key of instrumentKeys) {
      const cur = this.interest.get(key) ?? 0;
      if (cur <= 1) {
        this.interest.delete(key);
        if (cur === 1) toUnsub.push(key);
      } else {
        this.interest.set(key, cur - 1);
      }
    }
    if (toUnsub.length) {
      await this.feed.unsubscribe(toUnsub);
      this.logger.debug(`Upstream unsubscribe -${toUnsub.length} (tracked=${this.interest.size})`);
    }
  }

  /** Keys currently held with positive interest (for stale-feed resubscribe). */
  trackedKeys(): string[] {
    return [...this.interest.keys()];
  }

  private async handleTick(quote: Quote): Promise<void> {
    await this.redis.set(quoteCacheKey(quote.instrumentKey), JSON.stringify(quote), 'EX', QUOTE_TTL_SECONDS);
    await this.bus.publish(quoteChannel(quote.instrumentKey), quote);
    const completed = this.aggregator.add(quote);
    if (completed) this.candleBuffer.push(completed);
  }

  private async flushCandles(): Promise<void> {
    if (!this.candleBuffer.length) return;
    const batch = this.candleBuffer;
    this.candleBuffer = [];
    const ops = batch.map((c) => ({
      updateOne: {
        filter: { instrumentKey: c.instrumentKey, ts: c.ts },
        update: { $set: c },
        upsert: true,
      },
    }));
    try {
      await this.candles.bulkWrite(ops, { ordered: false });
    } catch (err) {
      this.logger.error(`Candle flush failed: ${(err as Error).message}`);
    }
  }

  private checkFeedHealth(): void {
    const threshold = this.appConfig.get('feed.staleAlertSeconds');
    const idle = this.feed.secondsSinceLastTick();
    const eqOpen = this.calendar.isMarketOpen('EQ');
    const keys = this.trackedKeys();
    if (eqOpen && keys.length && idle !== null && idle > threshold) {
      this.logger.warn(`STALE FEED: no tick for ${idle.toFixed(0)}s during market hours (threshold ${threshold}s)`);
      void this.feed.subscribe(keys);
    }
  }
}
