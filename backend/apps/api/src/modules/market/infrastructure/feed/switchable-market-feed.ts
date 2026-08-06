import { Injectable, Logger } from '@nestjs/common';
import { Quote } from '@app/shared';
import {
  LiveFeedMode,
  MarketFeedModeService,
} from '../../application/market-feed-mode.service';
import { UpstoxCredentialsService } from '../../application/upstox-credentials.service';
import { AngelCredentialsService } from '../../application/angel-credentials.service';
import { DhanCredentialsService } from '../../application/dhan-credentials.service';
import { MarketFeed, TickHandler } from './market-feed.port';
import { SimulatorFeed } from './simulator-feed';
import { UpstoxFeed } from './upstox-feed';
import { AngelOneFeed } from './angel-one-feed';
import { DhanFeed } from './dhan-feed';

const FAILOVER_STALE_SECONDS = 30;
const LIVE_MODES: LiveFeedMode[] = ['upstox', 'angel', 'dhan'];

/**
 * Runtime-switchable feed: simulator | upstox | angel | dhan with optional stale
 * failover to alternate live providers, then simulator.
 */
@Injectable()
export class SwitchableMarketFeed implements MarketFeed {
  private readonly logger = new Logger(SwitchableMarketFeed.name);
  private active: MarketFeed;
  private readonly handlers: TickHandler[] = [];
  private started = false;
  private unsubMode?: () => void;
  private failoverTimer?: ReturnType<typeof setInterval>;
  private failedOver = false;
  /** Canonical keys subscribed upstream — reapplied after feed switches. */
  private readonly subscribed = new Set<string>();

  constructor(
    private readonly simulator: SimulatorFeed,
    private readonly upstox: UpstoxFeed,
    private readonly angel: AngelOneFeed,
    private readonly dhan: DhanFeed,
    private readonly feedMode: MarketFeedModeService,
    private readonly upstoxCreds: UpstoxCredentialsService,
    private readonly angelCreds: AngelCredentialsService,
    private readonly dhanCreds: DhanCredentialsService,
  ) {
    this.active = this.pickPrimary();
    this.simulator.onTick((q) => this.fanout(q));
    this.upstox.onTick((q) => this.fanout(q));
    this.angel.onTick((q) => this.fanout(q));
    this.dhan.onTick((q) => this.fanout(q));
  }

  get name(): string {
    return `switchable:${this.active.name}${this.failedOver ? ':failover' : ''}`;
  }

  async start(): Promise<void> {
    this.started = true;
    this.failedOver = false;
    this.active = this.pickPrimary();
    this.unsubMode = this.feedMode.onChange(() => { void this.rebind(); });
    await this.active.start();
    this.failoverTimer = setInterval(() => void this.checkFailover(), 5_000);
    this.failoverTimer.unref();
  }

  async stop(): Promise<void> {
    this.started = false;
    if (this.failoverTimer) clearInterval(this.failoverTimer);
    this.unsubMode?.();
    await Promise.all([
      this.simulator.stop(),
      this.upstox.stop(),
      this.angel.stop(),
      this.dhan.stop(),
    ]);
  }

  async subscribe(instrumentKeys: string[]): Promise<void> {
    for (const k of instrumentKeys) this.subscribed.add(k);
    return this.active.subscribe(instrumentKeys);
  }

  async unsubscribe(instrumentKeys: string[]): Promise<void> {
    for (const k of instrumentKeys) this.subscribed.delete(k);
    return this.active.unsubscribe(instrumentKeys);
  }

  onTick(handler: TickHandler): void {
    this.handlers.push(handler);
  }

  secondsSinceLastTick(): number | null {
    return this.active.secondsSinceLastTick();
  }

  private pickFeedForMode(mode: LiveFeedMode): MarketFeed | null {
    if (mode === 'upstox' && this.upstoxCreds.hasAccessToken()) return this.upstox;
    if (mode === 'angel' && this.angelCreds.isConfigured()) return this.angel;
    if (mode === 'dhan' && this.dhanCreds.isConfigured()) return this.dhan;
    return null;
  }

  private pickPrimary(): MarketFeed {
    const mode = this.feedMode.getFeedMode();
    if (mode === 'simulator') return this.simulator;

    // Honor the configured live provider even before credentials finish loading.
    // Falling back to simulator here briefly floods traders with fake ticks and
    // keeps charts moving after the cash market is closed.
    if (mode === 'upstox') return this.upstox;
    if (mode === 'angel') return this.angel;
    if (mode === 'dhan') return this.dhan;

    for (const alt of LIVE_MODES) {
      const feed = this.pickFeedForMode(alt);
      if (feed) return feed;
    }
    return this.simulator;
  }

  /** Next configured live feed that is not the current active adapter. */
  private pickAlternateLive(): MarketFeed | null {
    for (const mode of LIVE_MODES) {
      const feed = this.pickFeedForMode(mode);
      if (feed && feed !== this.active) return feed;
    }
    return null;
  }

  private fanout(q: Quote): void {
    for (const h of this.handlers) h(q);
  }

  private async rebind(): Promise<void> {
    if (!this.started) return;
    this.failedOver = false;
    const next = this.pickPrimary();
    if (next === this.active) return;
    await this.switchTo(next);
  }

  private async switchTo(next: MarketFeed): Promise<void> {
    const prev = this.active;
    this.active = next;
    await prev.stop();
    await this.active.start();
    if (this.subscribed.size) {
      await this.active.subscribe([...this.subscribed]);
    }
    this.logger.log(`Market feed switched to ${next.name}`);
  }

  private async checkFailover(): Promise<void> {
    if (!this.started) return;
    const mode = this.feedMode.getFeedMode();
    if (mode === 'simulator' || this.active === this.simulator) return;

    const idle = this.active.secondsSinceLastTick();
    if (idle === null || idle < FAILOVER_STALE_SECONDS) return;

    const alt = this.pickAlternateLive();
    if (alt) {
      this.logger.warn(`Stale feed (${idle.toFixed(0)}s) — failing over to ${alt.name}`);
      this.failedOver = true;
      await this.switchTo(alt);
      return;
    }

    if (this.active !== this.simulator) {
      const mode = this.feedMode.getFeedMode();
      if (mode !== 'simulator') {
        this.logger.warn(`Stale feed (${idle.toFixed(0)}s) — keeping ${this.active.name} (live mode configured)`);
        return;
      }
      this.logger.warn(`Stale feed (${idle.toFixed(0)}s) — falling back to simulator`);
      this.failedOver = true;
      await this.switchTo(this.simulator);
    }
  }
}
