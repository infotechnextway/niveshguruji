'use client';
/**
 * TradingView Advanced Charts datafeed adapter.
 * Bridges the PTS market REST API + engine WebSocket to the
 * TradingView `IBasicDataFeed` / `IDatafeedChartApi` interface.
 */
import { api } from '../api';
import { getSession } from '../auth';
import type { Instrument, Quote } from '../types';

/* ------------------------------------------------------------------ */
/*  Types (mirrors TradingView datafeed-api without importing the .d.ts) */
/* ------------------------------------------------------------------ */

type ResolutionString = string;

interface LibrarySymbolInfo {
  name: string;
  ticker?: string;
  full_name?: string;
  base_name?: [string];
  description: string;
  exchange: string;
  listed_exchange: string;
  type: string;
  session: string;
  timezone: 'Asia/Kolkata';
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_daily?: boolean;
  has_weekly_and_monthly?: boolean;
  supported_resolutions: ResolutionString[];
  volume_precision: number;
  data_status?: string;
  intraday_multipliers?: string[];
  format?: 'price';
  currency_code?: string;
}

interface Bar {
  time: number;   // ms since epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface HistoryMetadata { noData?: boolean; nextTime?: number; }

type OnReadyCallback = (config: DatafeedConfiguration) => void;
type ResolveCallback = (info: LibrarySymbolInfo) => void;
type ErrorCallback = (reason: string) => void;
type HistoryCallback = (bars: Bar[], meta: HistoryMetadata) => void;
type SubscribeBarsCallback = (bar: Bar) => void;
type SearchSymbolsCallback = (items: Array<{
  symbol: string; full_name: string; description: string;
  exchange: string; ticker: string; type: string;
}>) => void;

interface DatafeedConfiguration {
  supports_search: boolean;
  supports_group_request: false;
  supported_resolutions: ResolutionString[];
  supports_marks: false;
  supports_timescale_marks: false;
  supports_time: boolean;
  exchanges?: Array<{ value: string; name: string; desc: string }>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SUPPORTED_RESOLUTIONS: ResolutionString[] = ['1', '5', '15', '30', '60', '1D', '1W', '1M'];
const INTRADAY_MULTIPLIERS = ['1', '5', '15', '30', '60'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function wsUrl(): string {
  if (typeof window === 'undefined') return '';
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (env) return env;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${proto}://localhost:4100/ws`;
  }
  return `${proto}://${window.location.host}/ws`;
}

/** Map TradingView resolution string to the backend interval enum. */
function resolutionToInterval(res: string): string {
  switch (res) {
    case '1': return '1minute';
    case '5': return '5minute';
    case '15': return '15minute';
    case '30': return '30minute';
    case '60': return '60minute';
    case '1D': return '1day';
    case '1W': return '1week';
    case '1M': return '1month';
    default: return '1minute';
  }
}

/** Seconds per bucket for a resolution — used for live bar alignment. */
function resolutionBucketSec(resolution: string): number {
  switch (resolution) {
    case '5': return 300;
    case '15': return 900;
    case '30': return 1800;
    case '60': return 3600;
    case '1D': return 86400;
    case '1W': return 604800;
    case '1M': return 2592000;
    default: return 60;
  }
}

/** NSE cash/F&O tick → pricescale. */
function pricescaleFromTick(tickSize?: number, segment?: string): number {
  let tick = tickSize ?? 0.05;
  if (tick >= 1) tick /= 100;
  if (!(tick > 0) || !Number.isFinite(tick)) {
    tick = segment === 'CUR' ? 0.0025 : 0.05;
  }
  return Math.max(1, Math.round(1 / tick));
}

function toBar(c: { t: number; o: number; h: number; l: number; c: number; v?: number }): Bar {
  let t = Number(c.t);
  // API returns epoch ms; TV expects ms.
  if (t < 1e11) t = t * 1000;
  return {
    time: t,
    open: Number(c.o),
    high: Number(c.h),
    low: Number(c.l),
    close: Number(c.c),
    volume: Number(c.v ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/*  PTSDatafeed                                                        */
/* ------------------------------------------------------------------ */

interface BarSubscription {
  instrumentKey: string;
  resolution: string;
  cb: SubscribeBarsCallback;
  lastBar?: Bar;
}

export class PTSDatafeed {
  private socket: WebSocket | null = null;
  private readonly barSubs = new Map<string, BarSubscription>();
  private connectPromise: Promise<void> | null = null;
  private intentionalClose = false;

  /* ---- Configuration ---- */

  onReady(cb: OnReadyCallback): void {
    setTimeout(() => cb({
      supports_search: true,
      supports_group_request: false,
      supported_resolutions: SUPPORTED_RESOLUTIONS,
      supports_marks: false,
      supports_timescale_marks: false,
      supports_time: true,
      exchanges: [
        { value: 'NSE', name: 'NSE', desc: 'National Stock Exchange' },
        { value: 'BSE', name: 'BSE', desc: 'Bombay Stock Exchange' },
      ],
    }), 0);
  }

  /* ---- Symbol search ---- */

  searchSymbols(userInput: string, _exchange: string, symbolType: string, onResult: SearchSymbolsCallback): void {
    const segment = symbolType === 'index' ? 'INDEX'
      : symbolType === 'options' ? 'FO'
        : symbolType === 'currency' ? 'CUR'
          : symbolType === 'stock' ? 'EQ' : undefined;
    const q = encodeURIComponent(userInput);
    const seg = segment ? `&segment=${segment}` : '';
    api<Instrument[]>(`/market/search?q=${q}${seg}&limit=30`)
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

  /* ---- Resolve symbol ---- */

  resolveSymbol(symbolName: string, onResolve: ResolveCallback, onError: ErrorCallback): void {
    const key = decodeURIComponent(symbolName);
    api<Instrument & { tickSize?: number }>(`/market/instruments/${encodeURIComponent(key)}`)
      .then((inst) => {
        const pricescale = pricescaleFromTick(inst.tickSize, inst.segment);
        onResolve({
          name: inst.symbol,
          ticker: inst.instrumentKey,
          full_name: `${inst.exchange}:${inst.symbol}`,
          base_name: [`${inst.exchange}:${inst.symbol}`],
          description: inst.name,
          exchange: inst.exchange,
          listed_exchange: inst.exchange,
          type: inst.segment,
          session: '0915-1530',
          timezone: 'Asia/Kolkata',
          minmov: 1,
          pricescale,
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: true,
          supported_resolutions: SUPPORTED_RESOLUTIONS,
          intraday_multipliers: INTRADAY_MULTIPLIERS,
          volume_precision: 0,
          data_status: 'streaming',
          format: 'price',
        });
      })
      .catch((err) => onError(err instanceof Error ? err.message : 'resolve failed'));
  }

  /* ---- Historical bars ---- */

  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: { from: number; to: number; countBack?: number },
    onResult: HistoryCallback,
    onError: ErrorCallback,
  ): void {
    const key = symbolInfo.ticker || symbolInfo.name;
    if (!key) { onError('missing instrument'); return; }

    // TV sends from/to as UNIX seconds.
    const fromMs = periodParams.from * 1000;
    const toMs = periodParams.to * 1000;
    const interval = resolutionToInterval(resolution);
    const qs = new URLSearchParams({
      instrumentKey: key,
      from: String(fromMs),
      to: String(toMs),
      interval,
      limit: String(periodParams.countBack ?? 2000),
    });
    api<Array<{ t: number; o: number; h: number; l: number; c: number; v?: number }>>(`/market/candles?${qs}`)
      .then((rows) => {
        const bars = rows.map(toBar);
        onResult(bars, { noData: bars.length === 0 });
      })
      .catch((err) => onError(err instanceof Error ? err.message : 'getBars failed'));
  }

  /* ---- Real-time subscriptions via WebSocket ---- */

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    listenerGuid: string,
  ): void {
    const key = symbolInfo.ticker || symbolInfo.name;
    if (!key) return;
    this.barSubs.set(listenerGuid, { instrumentKey: key, resolution, cb: onTick });
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

  /* ---- Server time ---- */

  getServerTime?(callback: (time: number) => void): void {
    callback(Math.floor(Date.now() / 1000));
  }

  /* ---- WebSocket management ---- */

  destroy(): void {
    this.intentionalClose = true;
    this.socket?.close();
    this.socket = null;
    this.barSubs.clear();
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
        reject(new Error('Not authenticated'));
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
          const msg = JSON.parse(String(ev.data)) as { type?: string; data?: Quote };
          if (msg.type === 'quote' && msg.data) this.handleQuote(msg.data);
        } catch { /* ignore */ }
      };
      ws.onerror = () => { /* silent */ };
      ws.onclose = () => {
        this.socket = null;
        const pending = this.connectPromise;
        this.connectPromise = null;
        if (!opened && pending) reject(new Error('WS close'));
        if (!this.intentionalClose) {
          setTimeout(() => { void this.ensureSocket().catch(() => undefined); }, 2000);
        }
      };
    });
    return this.connectPromise;
  }

  /**
   * Live ticks update ONLY the latest bucket:
   * - same timestamp → mutate OHLC of current candle
   * - newer timestamp → open a new candle
   * - older timestamp → ignore
   */
  private handleQuote(q: Quote): void {
    if (!Number.isFinite(q.ltp) || q.ltp <= 0) return;

    for (const sub of this.barSubs.values()) {
      if (sub.instrumentKey !== q.instrumentKey) continue;
      const bucketSec = resolutionBucketSec(sub.resolution);
      const t = Math.floor(q.ts / 1000);
      const bucketMs = (t - (t % bucketSec)) * 1000;
      const last = sub.lastBar;

      if (last && bucketMs < last.time) continue;

      if (last && last.time === bucketMs) {
        const next: Bar = {
          time: bucketMs,
          open: last.open,
          high: Math.max(last.high, q.ltp),
          low: Math.min(last.low, q.ltp),
          close: q.ltp,
          volume: last.volume ?? 0,
        };
        sub.lastBar = next;
        sub.cb(next);
      } else {
        const next: Bar = { time: bucketMs, open: q.ltp, high: q.ltp, low: q.ltp, close: q.ltp, volume: 0 };
        sub.lastBar = next;
        sub.cb(next);
      }
    }
  }
}

/** Singleton datafeed for the TradingView widget. */
let shared: PTSDatafeed | null = null;
export function getTVDatafeed(): PTSDatafeed {
  if (!shared) shared = new PTSDatafeed();
  return shared;
}
