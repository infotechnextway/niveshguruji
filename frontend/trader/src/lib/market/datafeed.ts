'use client';
import { api } from '../api';
import { getSession } from '../auth';
import type { Instrument, Quote } from '../types';

export interface Bar {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SymbolInfo {
  ticker: string;
  name: string;
  description: string;
  exchange: string;
  listed_exchange: string;
  type: string;
  session: string;
  timezone: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
  instrumentKey: string;
  lotSize: number;
  segment: string;
}

export type Resolution = '1' | '5' | '15' | '60';

export const SUPPORTED_RESOLUTIONS: Resolution[] = ['1', '5', '15', '60'];
type BarCallback = (bar: Bar) => void;
type HistoryCallback = (bars: Bar[], meta: { noData?: boolean }) => void;
type ErrorCallback = (reason: string) => void;
type ResolveCallback = (symbolInfo: SymbolInfo) => void;
type SearchCallback = (items: Array<{
  symbol: string; full_name: string; description: string;
  exchange: string; ticker: string; type: string;
}>) => void;

function wsUrl(): string {
  if (typeof window === 'undefined') return '';
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (env) return env;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // Dev: engine on 4100; prod: same host /ws via nginx
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${proto}://localhost:4100/ws`;
  }
  return `${proto}://${window.location.host}/ws`;
}

function resolutionToInterval(res: string): string {
  if (res === '5' || res === '5m') return '5minute';
  if (res === '15' || res === '15m') return '15minute';
  if (res === '60' || res === '1h' || res === '60m') return '60minute';
  return '1minute';
}

/** Bar open time (unix sec) for a resolution — aligned to interval bucket. */
export function barBucketSec(resolution: string, tsMs: number): number {
  const s = Math.floor(tsMs / 1000);
  if (resolution === '5') return s - (s % 300);
  if (resolution === '15') return s - (s % 900);
  if (resolution === '60') return s - (s % 3600);
  return s - (s % 60);
}

function toBar(c: { t: number; o: number; h: number; l: number; c: number; v?: number }): Bar {
  return {
    time: Math.floor(c.t / 1000),
    open: c.o, high: c.h, low: c.l, close: c.c,
    volume: c.v,
  };
}

/**
 * TradingView-shaped DataFeed adapter backed by PTS market REST + engine /ws.
 * Exposes onReady, resolveSymbol, searchSymbols, getBars, subscribeBars,
 * unsubscribeBars without requiring the Charting Library license.
 *
 * Chart stack: lightweight-charts renders candles; this class is the data layer.
 * Env: NEXT_PUBLIC_API_ORIGIN (REST proxy target), NEXT_PUBLIC_WS_URL (engine /ws).
 */
export class UpstoxDataFeed {
  private socket: WebSocket | null = null;
  private readonly barSubs = new Map<string, { instrumentKey: string; resolution: string; cb: BarCallback; lastBar?: Bar }>();
  private readonly quoteHandlers = new Set<(q: Quote) => void>();
  private connectPromise: Promise<void> | null = null;
  private intentionalClose = false;

  onReady(cb: (config: Record<string, unknown>) => void): void {
    setTimeout(() => cb({
      supported_resolutions: SUPPORTED_RESOLUTIONS,
      supports_marks: false,
      supports_timescale_marks: false,
      supports_time: true,
    }), 0);
  }

  searchSymbols(userInput: string, _exchange: string, symbolType: string, onResult: SearchCallback): void {
    const segment = symbolType === 'index' ? 'INDEX'
      : symbolType === 'options' ? 'FO'
        : symbolType === 'currency' ? 'CUR'
          : symbolType === 'stock' ? 'EQ' : undefined;
    const q = encodeURIComponent(userInput);
    const seg = segment ? `&segment=${segment}` : '';
    api<Instrument[]>(`/market/search?q=${q}${seg}&limit=50`)
      .then((rows) => {
        onResult(rows.map((r) => ({
          symbol: r.symbol,
          full_name: `${r.exchange}:${r.symbol}`,
          description: r.name,
          exchange: r.exchange,
          ticker: r.instrumentKey,
          type: r.segment,
        })));
      })
      .catch(() => onResult([]));
  }

  resolveSymbol(symbolName: string, onResolve: ResolveCallback, onError: ErrorCallback): void {
    const key = decodeURIComponent(symbolName);
    api<Instrument & { tickSize?: number }>(`/market/instruments/${encodeURIComponent(key)}`)
      .then((inst) => {
        const tick = inst.tickSize ?? 0.05;
        const pricescale = tick > 0 ? Math.round(1 / tick) : 100;
        onResolve({
          ticker: inst.instrumentKey,
          name: inst.symbol,
          description: inst.name,
          exchange: inst.exchange,
          listed_exchange: inst.exchange,
          type: inst.segment,
          session: '0915-1530',
          timezone: 'Asia/Kolkata',
          minmov: 1,
          pricescale,
          has_intraday: true,
          supported_resolutions: SUPPORTED_RESOLUTIONS,
          volume_precision: 0,
          data_status: 'streaming',
          instrumentKey: inst.instrumentKey,
          lotSize: inst.lotSize,
          segment: inst.segment,
        });
      })
      .catch((err) => onError(err instanceof Error ? err.message : 'resolve failed'));
  }

  getBars(
    symbolInfo: SymbolInfo | { instrumentKey?: string; ticker?: string },
    resolution: string,
    periodParams: { from: number; to: number; countBack?: number },
    onResult: HistoryCallback,
    onError: ErrorCallback,
  ): void {
    const key = ('instrumentKey' in symbolInfo && symbolInfo.instrumentKey)
      || ('ticker' in symbolInfo && symbolInfo.ticker)
      || '';
    if (!key) { onError('missing instrument'); return; }
    const from = periodParams.from * 1000;
    const to = periodParams.to * 1000;
    const interval = resolutionToInterval(resolution);
    const qs = new URLSearchParams({
      instrumentKey: key,
      from: String(from),
      to: String(to),
      interval,
      limit: String(periodParams.countBack ?? 2000),
    });
    api<Array<{ t: number; o: number; h: number; l: number; c: number; v?: number }>>(`/market/candles?${qs}`)
      .then((rows) => {
        const bars = rows.map(toBar).sort((a, b) => a.time - b.time);
        onResult(bars, { noData: bars.length === 0 });
      })
      .catch((err) => onError(err instanceof Error ? err.message : 'getBars failed'));
  }

  subscribeBars(
    symbolInfo: SymbolInfo | { instrumentKey?: string; ticker?: string },
    resolution: string,
    onTick: BarCallback,
    listenerGuid: string,
    seedBar?: Bar,
  ): void {
    const key = ('instrumentKey' in symbolInfo && symbolInfo.instrumentKey)
      || ('ticker' in symbolInfo && symbolInfo.ticker)
      || '';
    if (!key) return;
    this.barSubs.set(listenerGuid, {
      instrumentKey: key,
      resolution,
      cb: onTick,
      lastBar: seedBar,
    });
    void this.ensureSocket()
      .then(() => this.send({ action: 'subscribe', instrumentKeys: [key] }))
      .catch(() => undefined);
  }

  unsubscribeBars(listenerGuid: string): void {
    const sub = this.barSubs.get(listenerGuid);
    this.barSubs.delete(listenerGuid);
    if (!sub) return;
    const stillNeeded = [...this.barSubs.values()].some((s) => s.instrumentKey === sub.instrumentKey);
    if (!stillNeeded && this.socket?.readyState === WebSocket.OPEN) {
      this.send({ action: 'unsubscribe', instrumentKeys: [sub.instrumentKey] });
    }
  }

  /** Extra quote listeners used by the terminal quote-store. */
  onQuote(handler: (q: Quote) => void): () => void {
    this.quoteHandlers.add(handler);
    return () => { this.quoteHandlers.delete(handler); };
  }

  async subscribeQuotes(keys: string[]): Promise<void> {
    if (!keys.length) return;
    await this.ensureSocket();
    this.send({ action: 'subscribe', instrumentKeys: keys });
  }

  unsubscribeQuotes(keys: string[]): void {
    if (!keys.length) return;
    this.send({ action: 'unsubscribe', instrumentKeys: keys });
  }

  destroy(): void {
    this.intentionalClose = true;
    this.socket?.close();
    this.socket = null;
    this.barSubs.clear();
    this.quoteHandlers.clear();
  }

  private send(msg: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  private ensureSocket(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve, reject) => {
      const session = getSession();
      if (!session?.accessToken) {
        this.connectPromise = null;
        reject(new Error('Not authenticated — sign in for live quotes'));
        return;
      }
      const url = `${wsUrl()}?token=${encodeURIComponent(session.accessToken)}`;
      const ws = new WebSocket(url);
      this.socket = ws;
      let opened = false;
      ws.onopen = () => {
        opened = true;
        this.connectPromise = null;
        resolve();
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { type?: string; data?: Quote; message?: string };
          if (msg.type === 'quote' && msg.data) this.handleQuote(msg.data);
        } catch { /* ignore */ }
      };
      ws.onerror = () => {
        // Log only — onclose follows and handles reject/reconnect. Avoids duplicate
        // reject + unhandled rejection that trips the Next.js error overlay.
        console.warn(
          '[UpstoxDataFeed] WebSocket error — is the engine running?',
          wsUrl(),
          '(API :4000 + engine :4100 are both required for live quotes)',
        );
      };
      ws.onclose = () => {
        this.socket = null;
        const pending = this.connectPromise;
        this.connectPromise = null;
        if (!opened && pending) {
          reject(new Error('WebSocket connection failed — start the engine (npm run start:engine:dev in backend/)'));
        }
        if (!this.intentionalClose) {
          setTimeout(() => { void this.ensureSocket().catch(() => undefined); }, 2000);
        }
      };
    });
    return this.connectPromise;
  }

  private handleQuote(q: Quote): void {
    for (const h of this.quoteHandlers) h(q);

    for (const sub of this.barSubs.values()) {
      if (sub.instrumentKey !== q.instrumentKey) continue;
      const t = barBucketSec(sub.resolution, q.ts);
      const last = sub.lastBar;
      if (last && last.time === t) {
        const next: Bar = {
          time: t,
          open: last.open,
          high: Math.max(last.high, q.ltp),
          low: Math.min(last.low, q.ltp),
          close: q.ltp,
          volume: (last.volume ?? 0) + 0,
        };
        sub.lastBar = next;
        sub.cb(next);
      } else {
        const next: Bar = { time: t, open: q.ltp, high: q.ltp, low: q.ltp, close: q.ltp, volume: 0 };
        sub.lastBar = next;
        sub.cb(next);
      }
    }
  }
}

/** Shared singleton for the trader terminal. */
let shared: UpstoxDataFeed | null = null;
export function getDataFeed(): UpstoxDataFeed {
  if (!shared) shared = new UpstoxDataFeed();
  return shared;
}
