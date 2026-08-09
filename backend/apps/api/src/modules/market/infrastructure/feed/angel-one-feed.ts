import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import WebSocket from 'ws';
import { Quote } from '@app/shared';
import { AngelCredentialsService } from '../../application/angel-credentials.service';
import { Instrument } from '../schemas/instrument.schema';
import { MarketFeed, TickHandler } from './market-feed.port';
import {
  ANGEL_QUOTE_MODE, angelTickToQuote, decodeAngelPacket, isAngelHeartbeat,
} from './angel-one-decode';

const WSS_URL = 'wss://smartapisocket.angelone.in/smart-stream';
const HEARTBEAT_MS = 30_000;

type TokenRoute = { exchangeType: number; token: string; instrumentKey: string };

/**
 * Angel One Smart Stream WSS adapter. Maps canonical instrument keys via DB
 * angelToken/angelExchangeType and reconnects when credentials change.
 */
@Injectable()
export class AngelOneFeed implements MarketFeed {
  readonly name = 'angel';
  private readonly logger = new Logger(AngelOneFeed.name);
  private ws?: WebSocket;
  private handlers: TickHandler[] = [];
  private readonly subscribedKeys = new Set<string>();
  private readonly tokenRoutes = new Map<string, TokenRoute>();
  private lastTickAt: number | null = null;
  private backoff = 1000;
  private stopped = false;
  private unsubCreds?: () => void;
  private heartbeat?: ReturnType<typeof setInterval>;

  constructor(
    private readonly credentials: AngelCredentialsService,
    @InjectModel(Instrument.name) private readonly instruments: Model<Instrument>,
  ) {}

  isConfigured(): boolean {
    return this.credentials.isConfigured();
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.unsubCreds = this.credentials.onChange(() => {
      this.logger.log('Angel credentials changed — reconnecting feed');
      if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
        this.ws.close();
        return;
      }
      if (!this.stopped && this.credentials.isConfigured()) {
        void this.connect();
      }
    });
    if (!this.credentials.isConfigured()) {
      this.logger.warn('Angel feed started without full credentials — waiting for admin setup');
      return;
    }
    await this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.unsubCreds?.();
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.ws?.close();
  }

  private async connect(): Promise<void> {
    if (this.stopped || !this.credentials.isConfigured()) return;

    const jwt = this.credentials.getJwtToken()!;
    const apiKey = this.credentials.getApiKey()!;
    const clientCode = this.credentials.getClientCode()!;
    const feedToken = this.credentials.getFeedToken()!;

    this.ws = new WebSocket(WSS_URL, {
      headers: {
        Authorization: jwt.startsWith('Bearer ') ? jwt : `Bearer ${jwt}`,
        'x-api-key': apiKey,
        'x-client-code': clientCode,
        'x-feed-token': feedToken,
      },
    });

    this.ws.on('open', () => {
      this.logger.log('Angel feed connected');
      this.backoff = 1000;
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.heartbeat = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send('ping');
      }, HEARTBEAT_MS);
      this.heartbeat.unref();
      if (this.subscribedKeys.size) void this.resubscribeAll();
    });
    this.ws.on('message', (data) => this.onMessage(data));
    this.ws.on('close', () => {
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.scheduleReconnect();
    });
    this.ws.on('error', (err) => {
      this.logger.error(`Angel feed error: ${err.message}`);
      this.ws?.close();
    });
  }

  private onMessage(data: WebSocket.RawData): void {
    const buf = Buffer.isBuffer(data) ? data
      : Array.isArray(data) ? Buffer.concat(data)
        : Buffer.from(data as ArrayBuffer);

    if (isAngelHeartbeat(buf)) return;

    const tick = decodeAngelPacket(buf);
    if (!tick) return;

    const routeKey = `${tick.exchangeType}:${tick.token}`;
    const route = this.tokenRoutes.get(routeKey);
    if (!route) return;

    this.lastTickAt = Date.now();
    const quote: Quote = angelTickToQuote(tick, route.instrumentKey);
    for (const h of this.handlers) h(quote);
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const delay = Math.min(this.backoff, 30_000);
    this.backoff *= 2;
    this.logger.warn(`Angel feed reconnecting in ${delay}ms`);
    setTimeout(() => void this.connect(), delay).unref();
  }

  async subscribe(instrumentKeys: string[]): Promise<void> {
    const fresh = instrumentKeys.filter((k) => !this.subscribedKeys.has(k));
    for (const k of instrumentKeys) this.subscribedKeys.add(k);
    if (!fresh.length) return;

    const rows = await this.instruments.find({
      instrumentKey: { $in: fresh },
      angelToken: { $exists: true, $ne: null },
      angelExchangeType: { $exists: true },
    }).select('instrumentKey angelToken angelExchangeType').lean();

    for (const row of rows) {
      if (!row.angelToken || row.angelExchangeType == null) continue;
      this.tokenRoutes.set(`${row.angelExchangeType}:${row.angelToken}`, {
        exchangeType: row.angelExchangeType,
        token: row.angelToken,
        instrumentKey: row.instrumentKey,
      });
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      await this.sendSubscribe(rows.map((r) => ({
        exchangeType: r.angelExchangeType!,
        token: r.angelToken!,
        instrumentKey: r.instrumentKey,
      })));
    }
  }

  async unsubscribe(instrumentKeys: string[]): Promise<void> {
    const dropping = instrumentKeys.filter((k) => this.subscribedKeys.has(k));
    for (const k of instrumentKeys) this.subscribedKeys.delete(k);

    const rows = await this.instruments.find({
      instrumentKey: { $in: dropping },
      angelToken: { $exists: true },
      angelExchangeType: { $exists: true },
    }).select('instrumentKey angelToken angelExchangeType').lean();

    for (const row of rows) {
      if (!row.angelToken || row.angelExchangeType == null) continue;
      this.tokenRoutes.delete(`${row.angelExchangeType}:${row.angelToken}`);
    }

    if (dropping.length && this.ws?.readyState === WebSocket.OPEN) {
      this.sendUnsubscribe(rows.map((r) => ({
        exchangeType: r.angelExchangeType!,
        token: r.angelToken!,
      })));
    }
  }

  /**
   * Rebuild routes and re-send subscribe after reconnect.
   * Must clear subscribedKeys first — otherwise subscribe() treats every key as
   * already subscribed and returns without rebuilding tokenRoutes.
   */
  private async resubscribeAll(): Promise<void> {
    const keys = [...this.subscribedKeys];
    this.subscribedKeys.clear();
    this.tokenRoutes.clear();
    await this.subscribe(keys);
  }

  private sendSubscribe(routes: TokenRoute[]): void {
    const byExchange = new Map<number, string[]>();
    for (const r of routes) {
      const list = byExchange.get(r.exchangeType) ?? [];
      if (!list.includes(r.token)) list.push(r.token);
      byExchange.set(r.exchangeType, list);
    }
    const tokenList = [...byExchange.entries()].map(([exchangeType, tokens]) => ({ exchangeType, tokens }));
    if (!tokenList.length) return;

    this.ws?.send(JSON.stringify({
      correlationID: `sub-${Date.now()}`,
      action: 1,
      params: { mode: ANGEL_QUOTE_MODE, tokenList },
    }));
  }

  private sendUnsubscribe(routes: Pick<TokenRoute, 'exchangeType' | 'token'>[]): void {
    const byExchange = new Map<number, string[]>();
    for (const r of routes) {
      const list = byExchange.get(r.exchangeType) ?? [];
      if (!list.includes(r.token)) list.push(r.token);
      byExchange.set(r.exchangeType, list);
    }
    const tokenList = [...byExchange.entries()].map(([exchangeType, tokens]) => ({ exchangeType, tokens }));
    if (!tokenList.length) return;

    this.ws?.send(JSON.stringify({
      correlationID: `unsub-${Date.now()}`,
      action: 0,
      params: { mode: ANGEL_QUOTE_MODE, tokenList },
    }));
  }

  onTick(handler: TickHandler): void {
    this.handlers.push(handler);
  }

  secondsSinceLastTick(): number | null {
    return this.lastTickAt === null ? null : (Date.now() - this.lastTickAt) / 1000;
  }
}
