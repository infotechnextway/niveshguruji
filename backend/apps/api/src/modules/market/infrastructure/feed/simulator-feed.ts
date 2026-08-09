import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quote, referenceCloseFor } from '@app/shared';
import { Candle1m } from '../schemas/candle.schema';
import { Instrument } from '../schemas/instrument.schema';
import { MarketFeed, TickHandler } from './market-feed.port';

interface SimState {
  ltp: number;
  prevClose: number;
  volume: number;
}

/**
 * Deterministic-capable synthetic feed. Generates a mean-reverting random walk
 * per subscribed instrument at a fixed interval. Used for dev, for running
 * outside market hours, and — with a seeded RNG and pushTick() — for the P5
 * VEE's replay tests. No network, no credentials.
 *
 * Base prices prefer reference closes (by key / symbol), then last Mongo bar,
 * then a segment-aware synthetic fallback — never a blind random EQ scale for
 * known index names after Dhan key remapping.
 */
@Injectable()
export class SimulatorFeed implements MarketFeed {
  readonly name = 'simulator';
  private readonly logger = new Logger(SimulatorFeed.name);
  private readonly state = new Map<string, SimState>();
  private handlers: TickHandler[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private lastTickAt: number | null = null;
  private seed = 0x2545f491;

  constructor(
    @InjectModel(Instrument.name) private readonly instruments: Model<Instrument>,
    @InjectModel(Candle1m.name) private readonly candles: Model<Candle1m>,
  ) {}

  async start(): Promise<void> {
    this.timer = setInterval(() => this.tickAll(), 1000);
    this.timer.unref();
    this.logger.warn('[DEV] Simulator market feed started (synthetic quotes)');
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
  }

  async subscribe(instrumentKeys: string[]): Promise<void> {
    for (const key of instrumentKeys) {
      if (!this.state.has(key)) {
        const base = await this.resolveBase(key);
        this.state.set(key, { ltp: base, prevClose: base, volume: 0 });
      }
    }
  }

  async unsubscribe(instrumentKeys: string[]): Promise<void> {
    for (const key of instrumentKeys) this.state.delete(key);
  }

  onTick(handler: TickHandler): void {
    this.handlers.push(handler);
  }

  secondsSinceLastTick(): number | null {
    return this.lastTickAt === null ? null : (Date.now() - this.lastTickAt) / 1000;
  }

  /** Inject a specific quote — used by replay tests to drive exact scenarios. */
  pushTick(quote: Quote): void {
    this.lastTickAt = Date.now();
    for (const h of this.handlers) h(quote);
  }

  private tickAll(): void {
    const now = Date.now();
    for (const [key, s] of this.state) {
      const drift = (s.prevClose - s.ltp) * 0.01; // mean reversion
      const noise = (this.rand() - 0.5) * s.prevClose * 0.002;
      s.ltp = Math.max(0.05, +(s.ltp + drift + noise).toFixed(2));
      s.volume += Math.floor(this.rand() * 1000);
      const change = +(s.ltp - s.prevClose).toFixed(2);
      const spread = Math.max(0.05, +(s.ltp * 0.0005).toFixed(2));
      this.pushTick({
        instrumentKey: key,
        ltp: s.ltp,
        change,
        changePct: +((change / s.prevClose) * 100).toFixed(2),
        bid: +(s.ltp - spread).toFixed(2),
        ask: +(s.ltp + spread).toFixed(2),
        volume: s.volume,
        prevClose: s.prevClose,
        ts: now,
      });
    }
  }

  /** Deterministic xorshift RNG so seeded runs are reproducible. */
  private rand(): number {
    let x = this.seed;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed / 0xffffffff;
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  private async resolveBase(key: string): Promise<number> {
    const inst = await this.instruments.findOne({ instrumentKey: key })
      .select('symbol name segment')
      .lean();
    const ref = referenceCloseFor({
      instrumentKey: key,
      symbol: inst?.symbol,
      name: inst?.name,
    });
    if (ref != null) return ref;

    const last = await this.candles.findOne({ instrumentKey: key })
      .sort({ ts: -1 })
      .select('c')
      .lean();
    if (last?.c && Number.isFinite(last.c) && last.c > 0) return last.c;

    return this.syntheticBase(key, inst?.segment);
  }

  /** Fallback base for instruments without a reference close — EQ-scale, not ~100–3000. */
  private syntheticBase(key: string, segment?: string): number {
    if (segment === 'INDEX' || key.includes('_INDEX|') || key.includes('|IDX')) {
      return 20_000 + (this.hash(key) % 35_000);
    }
    if (segment === 'FO' || key.includes('_FO|') || key.includes('_FNO|')) {
      return 50 + (this.hash(key) % 500);
    }
    return 500 + (this.hash(key) % 4_500);
  }
}
