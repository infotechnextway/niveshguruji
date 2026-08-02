import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';
import { Quote } from '@app/shared';
import { MarketFeed, TickHandler } from './market-feed.port';
import { decodeUpstoxFeedMessage, warmUpstoxProto } from './upstox-protobuf';
import { UpstoxCredentialsService } from '../../application/upstox-credentials.service';

/**
 * Upstox market-data WSS adapter. Token comes from UpstoxCredentialsService
 * (admin DB override → env fallback) and reconnects when credentials change.
 */
@Injectable()
export class UpstoxFeed implements MarketFeed {
  readonly name = 'upstox';
  private readonly logger = new Logger(UpstoxFeed.name);
  private ws?: WebSocket;
  private handlers: TickHandler[] = [];
  private readonly subscribed = new Set<string>();
  private lastTickAt: number | null = null;
  private backoff = 1000;
  private stopped = false;
  private unsubCreds?: () => void;

  constructor(private readonly credentials: UpstoxCredentialsService) {}

  async start(): Promise<void> {
    this.stopped = false;
    try { await warmUpstoxProto(); } catch (err) {
      this.logger.warn(`Protobuf warm-up failed: ${(err as Error).message}`);
    }
    this.unsubCreds = this.credentials.onChange(() => {
      this.logger.log('Upstox credentials changed — reconnecting feed');
      this.ws?.close();
    });
    if (!this.credentials.getAccessToken()) {
      this.logger.warn('Upstox feed started without access token — waiting for admin setup');
      return;
    }
    await this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.unsubCreds?.();
    this.ws?.close();
  }

  private token(): string {
    const t = this.credentials.getAccessToken();
    if (!t) throw new Error('UPSTOX_ACCESS_TOKEN is not configured (set via Admin → Upstox API)');
    return t;
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    if (!this.credentials.getAccessToken()) {
      this.logger.warn('Skipping Upstox connect — no access token');
      return;
    }
    const token = this.token();
    const wssUrl = await this.authorizeFeedUrl(token);
    this.ws = new WebSocket(wssUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    this.ws.on('open', () => {
      this.logger.log('Upstox feed connected');
      this.backoff = 1000;
      if (this.subscribed.size) void this.sendSubscribe([...this.subscribed]);
    });
    this.ws.on('message', (data: WebSocket.RawData) => {
      void this.onBinary(data);
    });
    this.ws.on('close', () => this.scheduleReconnect());
    this.ws.on('error', (err) => {
      this.logger.error(`Upstox feed error: ${err.message}`);
      this.ws?.close();
    });
  }

  private async onBinary(data: WebSocket.RawData): Promise<void> {
    const buf = Buffer.isBuffer(data) ? data
      : Array.isArray(data) ? Buffer.concat(data)
        : Buffer.from(data as ArrayBuffer);
    const quotes = await decodeUpstoxFeedMessage(buf);
    if (!quotes.length) return;
    this.lastTickAt = Date.now();
    for (const q of quotes) for (const h of this.handlers) h(q);
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const delay = Math.min(this.backoff, 30_000);
    this.backoff *= 2;
    this.logger.warn(`Upstox feed reconnecting in ${delay}ms`);
    setTimeout(() => void this.connect(), delay).unref();
  }

  private async authorizeFeedUrl(token: string): Promise<string> {
    const res = await fetch('https://api.upstox.com/v3/feed/market-data-feed/authorize', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Upstox authorize failed: ${res.status}`);
    const body = (await res.json()) as { data?: { authorized_redirect_uri?: string } };
    const url = body.data?.authorized_redirect_uri;
    if (!url) throw new Error('Upstox authorize returned no feed URL');
    return url;
  }

  async subscribe(instrumentKeys: string[]): Promise<void> {
    const fresh = instrumentKeys.filter((k) => !this.subscribed.has(k));
    for (const k of instrumentKeys) this.subscribed.add(k);
    if (fresh.length && this.ws?.readyState === WebSocket.OPEN) await this.sendSubscribe(fresh);
  }

  async unsubscribe(instrumentKeys: string[]): Promise<void> {
    const dropping = instrumentKeys.filter((k) => this.subscribed.has(k));
    for (const k of instrumentKeys) this.subscribed.delete(k);
    if (dropping.length && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ guid: 'unsub', method: 'unsub', data: { instrumentKeys: dropping } }));
    }
  }

  private async sendSubscribe(instrumentKeys: string[]): Promise<void> {
    this.ws?.send(JSON.stringify({ guid: 'sub', method: 'sub', data: { mode: 'full', instrumentKeys } }));
  }

  onTick(handler: TickHandler): void {
    this.handlers.push(handler);
  }

  secondsSinceLastTick(): number | null {
    return this.lastTickAt === null ? null : (Date.now() - this.lastTickAt) / 1000;
  }
}
