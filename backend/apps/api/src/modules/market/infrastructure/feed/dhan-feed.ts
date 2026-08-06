import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import WebSocket from 'ws';
import { Quote } from '@app/shared';
import { DhanCredentialsService } from '../../application/dhan-credentials.service';
import { Instrument } from '../schemas/instrument.schema';
import { MarketFeed, TickHandler } from './market-feed.port';
import {
  DHAN_QUOTE_REQUEST_CODE,
  DHAN_UNSUB_REQUEST_CODE,
  decodeDhanPacket,
  dhanTickToQuote,
  isDhanDisconnect,
} from './dhan-decode';

const WSS_BASE = 'wss://api-feed.dhan.co';
const SUBSCRIBE_BATCH = 100;

type TokenRoute = { exchangeSegment: string; securityId: string; instrumentKey: string };

/**
 * Dhan HQ v2 WebSocket market feed. Maps canonical instrument keys via DB
 * dhanSecurityId/dhanExchangeSegment and reconnects when credentials change.
 */
@Injectable()
export class DhanFeed implements MarketFeed {
  readonly name = 'dhan';
  private readonly logger = new Logger(DhanFeed.name);
  private ws?: WebSocket;
  private handlers: TickHandler[] = [];
  private readonly subscribedKeys = new Set<string>();
  private readonly tokenRoutes = new Map<string, TokenRoute>();
  private readonly prevCloseByRoute = new Map<string, number>();
  private lastTickAt: number | null = null;
  private backoff = 1000;
  private stopped = false;
  private unsubCreds?: () => void;

  constructor(
    private readonly credentials: DhanCredentialsService,
    @InjectModel(Instrument.name) private readonly instruments: Model<Instrument>,
  ) {}

  isConfigured(): boolean {
    return this.credentials.isConfigured();
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.unsubCreds = this.credentials.onChange(() => {
      this.logger.log('Dhan credentials changed — reconnecting feed');
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
        return;
      }
      if (!this.stopped && this.credentials.isConfigured()) {
        void this.connect();
      }
    });
    if (!this.credentials.isConfigured()) {
      this.logger.warn('Dhan feed started without credentials — waiting for admin setup');
      return;
    }
    await this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.unsubCreds?.();
    this.ws?.close();
  }

  private buildWsUrl(): string {
    const token = encodeURIComponent(this.credentials.getAccessToken()!);
    const clientId = encodeURIComponent(this.credentials.getClientId()!);
    return `${WSS_BASE}?version=2&token=${token}&clientId=${clientId}&authType=2`;
  }

  private async connect(): Promise<void> {
    if (this.stopped || !this.credentials.isConfigured()) return;

    this.ws = new WebSocket(this.buildWsUrl());

    this.ws.on('open', () => {
      this.logger.log('Dhan feed connected');
      this.backoff = 1000;
      if (this.subscribedKeys.size) void this.resubscribeAll();
    });
    this.ws.on('message', (data) => this.onMessage(data));
    this.ws.on('close', () => this.scheduleReconnect());
    this.ws.on('error', (err) => {
      this.logger.error(`Dhan feed error: ${err.message}`);
      this.ws?.close();
    });
    this.ws.on('ping', () => {
      // ws library auto-pongs; explicit pong for safety
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.pong();
    });
  }

  private onMessage(data: WebSocket.RawData): void {
    const buf = Buffer.isBuffer(data) ? data
      : Array.isArray(data) ? Buffer.concat(data)
        : Buffer.from(data as ArrayBuffer);

    if (isDhanDisconnect(buf)) {
      this.logger.warn('Dhan server sent disconnect packet — reconnecting');
      this.ws?.close();
      return;
    }

    const tick = decodeDhanPacket(buf);
    if (!tick) return;

    const routeKey = `${tick.exchangeSegment}:${tick.securityId}`;
    const route = this.tokenRoutes.get(routeKey);
    if (!route) return;

    if (buf[0] === 6) {
      this.prevCloseByRoute.set(routeKey, tick.prevClose);
      return;
    }

    const prevClose = this.prevCloseByRoute.get(routeKey) ?? tick.prevClose;
    this.lastTickAt = Date.now();
    const quote: Quote = dhanTickToQuote({ ...tick, prevClose }, route.instrumentKey);
    for (const h of this.handlers) h(quote);
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const delay = Math.min(this.backoff, 30_000);
    this.backoff *= 2;
    this.logger.warn(`Dhan feed reconnecting in ${delay}ms`);
    setTimeout(() => void this.connect(), delay).unref();
  }

  async subscribe(instrumentKeys: string[]): Promise<void> {
    const fresh = instrumentKeys.filter((k) => !this.subscribedKeys.has(k));
    for (const k of instrumentKeys) this.subscribedKeys.add(k);
    if (!fresh.length) return;

    const rows = await this.instruments.find({
      instrumentKey: { $in: fresh },
      dhanSecurityId: { $exists: true, $ne: null },
      dhanExchangeSegment: { $exists: true },
    }).select('instrumentKey dhanSecurityId dhanExchangeSegment').lean();

    const routes: TokenRoute[] = [];
    for (const row of rows) {
      if (!row.dhanSecurityId || !row.dhanExchangeSegment) continue;
      const route: TokenRoute = {
        exchangeSegment: row.dhanExchangeSegment,
        securityId: row.dhanSecurityId,
        instrumentKey: row.instrumentKey,
      };
      routes.push(route);
      this.tokenRoutes.set(`${route.exchangeSegment}:${route.securityId}`, route);
    }

    if (this.ws?.readyState === WebSocket.OPEN && routes.length) {
      await this.sendSubscribe(routes);
    }
  }

  async unsubscribe(instrumentKeys: string[]): Promise<void> {
    const dropping = instrumentKeys.filter((k) => this.subscribedKeys.has(k));
    for (const k of instrumentKeys) this.subscribedKeys.delete(k);

    const rows = await this.instruments.find({
      instrumentKey: { $in: dropping },
      dhanSecurityId: { $exists: true },
      dhanExchangeSegment: { $exists: true },
    }).select('instrumentKey dhanSecurityId dhanExchangeSegment').lean();

    const routes: Pick<TokenRoute, 'exchangeSegment' | 'securityId'>[] = [];
    for (const row of rows) {
      if (!row.dhanSecurityId || !row.dhanExchangeSegment) continue;
      const key = `${row.dhanExchangeSegment}:${row.dhanSecurityId}`;
      this.tokenRoutes.delete(key);
      this.prevCloseByRoute.delete(key);
      routes.push({ exchangeSegment: row.dhanExchangeSegment, securityId: row.dhanSecurityId });
    }

    if (routes.length && this.ws?.readyState === WebSocket.OPEN) {
      this.sendUnsubscribe(routes);
    }
  }

  private async resubscribeAll(): Promise<void> {
    const keys = [...this.subscribedKeys];
    this.tokenRoutes.clear();
    this.prevCloseByRoute.clear();
    await this.subscribe(keys);
  }

  private async sendSubscribe(routes: TokenRoute[]): Promise<void> {
    for (let i = 0; i < routes.length; i += SUBSCRIBE_BATCH) {
      const batch = routes.slice(i, i + SUBSCRIBE_BATCH);
      this.ws?.send(JSON.stringify({
        RequestCode: DHAN_QUOTE_REQUEST_CODE,
        InstrumentCount: batch.length,
        InstrumentList: batch.map((r) => ({
          ExchangeSegment: r.exchangeSegment,
          SecurityId: r.securityId,
        })),
      }));
    }
  }

  private sendUnsubscribe(routes: Pick<TokenRoute, 'exchangeSegment' | 'securityId'>[]): void {
    for (let i = 0; i < routes.length; i += SUBSCRIBE_BATCH) {
      const batch = routes.slice(i, i + SUBSCRIBE_BATCH);
      this.ws?.send(JSON.stringify({
        RequestCode: DHAN_UNSUB_REQUEST_CODE,
        InstrumentCount: batch.length,
        InstrumentList: batch.map((r) => ({
          ExchangeSegment: r.exchangeSegment,
          SecurityId: r.securityId,
        })),
      }));
    }
  }

  onTick(handler: TickHandler): void {
    this.handlers.push(handler);
  }

  secondsSinceLastTick(): number | null {
    return this.lastTickAt === null ? null : (Date.now() - this.lastTickAt) / 1000;
  }
}
