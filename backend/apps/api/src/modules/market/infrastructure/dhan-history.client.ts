import { Injectable, Logger } from '@nestjs/common';
import { DhanCredentialsService } from '../application/dhan-credentials.service';
import type { HistoryCandle, UpstoxCandleInterval } from './upstox-history.client';
import { aggregateFrom1m } from '../domain/candle-sanitize';

const INTRADAY_URL = 'https://api.dhan.co/v2/charts/intraday';
const HISTORICAL_URL = 'https://api.dhan.co/v2/charts/historical';
/** Dhan caps intraday polls at ~90 days per request. */
const INTRADAY_CHUNK_MS = 89 * 86_400_000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface DhanChartTarget {
  securityId: string;
  exchangeSegment: string;
  instrument: string;
}

interface DhanCandleArrays {
  open?: unknown[];
  high?: unknown[];
  low?: unknown[];
  close?: unknown[];
  volume?: unknown[];
  timestamp?: unknown[];
}

/**
 * Dhan historical + intraday candle REST client.
 * Prefer this over Upstox when live feed / catalog keys are DHAN|….
 */
@Injectable()
export class DhanHistoryClient {
  private readonly logger = new Logger(DhanHistoryClient.name);

  constructor(private readonly credentials: DhanCredentialsService) {}

  hasToken(): boolean {
    return Boolean(this.credentials.getAccessToken());
  }

  async fetchCandles(
    target: DhanChartTarget,
    interval: UpstoxCandleInterval,
    fromMs: number,
    toMs: number,
  ): Promise<HistoryCandle[]> {
    const token = this.credentials.getAccessToken();
    if (!token) throw new Error('Dhan access token is not configured (Admin → Dhan API)');

    const native = dhanNativePlan(interval);
    let candles: HistoryCandle[];

    if (native.kind === 'daily') {
      candles = await this.fetchDaily(target, fromMs, toMs, token);
    } else if (native.kind === 'intraday') {
      candles = await this.fetchIntradayChunks(target, native.interval, fromMs, toMs, token);
    } else {
      // 30m: pull 15m then aggregate
      const base = await this.fetchIntradayChunks(target, native.from, fromMs, toMs, token);
      candles = aggregateFrom1m(base, interval);
    }

    return candles
      .filter((c) => c.t >= fromMs && c.t <= toMs)
      .sort((a, b) => a.t - b.t);
  }

  private async fetchDaily(
    target: DhanChartTarget,
    fromMs: number,
    toMs: number,
    token: string,
  ): Promise<HistoryCandle[]> {
    const body = {
      securityId: target.securityId,
      exchangeSegment: target.exchangeSegment,
      instrument: target.instrument,
      expiryCode: 0,
      oi: false,
      fromDate: formatIstDate(fromMs),
      toDate: formatIstDate(toMs + 86_400_000), // API toDate is non-inclusive
    };
    const json = await this.postJson(HISTORICAL_URL, body, token);
    return parseDhanCandles(json);
  }

  private async fetchIntradayChunks(
    target: DhanChartTarget,
    interval: string,
    fromMs: number,
    toMs: number,
    token: string,
  ): Promise<HistoryCandle[]> {
    const merged = new Map<number, HistoryCandle>();
    let cursor = fromMs;
    while (cursor <= toMs) {
      const chunkEnd = Math.min(cursor + INTRADAY_CHUNK_MS, toMs);
      const body = {
        securityId: target.securityId,
        exchangeSegment: target.exchangeSegment,
        instrument: target.instrument,
        interval,
        oi: false,
        fromDate: formatIstDateTime(cursor),
        toDate: formatIstDateTime(chunkEnd),
      };
      try {
        const json = await this.postJson(INTRADAY_URL, body, token);
        for (const c of parseDhanCandles(json)) merged.set(c.t, c);
      } catch (err) {
        this.logger.warn(
          `Dhan intraday chunk failed ${target.exchangeSegment}:${target.securityId} `
          + `${formatIstDate(cursor)}→${formatIstDate(chunkEnd)}: ${(err as Error).message}`,
        );
        // Continue other chunks; partial history is better than none.
      }
      cursor = chunkEnd + 1;
    }
    return [...merged.values()].sort((a, b) => a.t - b.t);
  }

  private async postJson(
    url: string,
    body: Record<string, unknown>,
    token: string,
  ): Promise<DhanCandleArrays> {
    const headers: Record<string, string> = {
      'access-token': token,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const clientId = this.credentials.getClientId();
    if (clientId) headers['client-id'] = clientId;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Dhan history ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as DhanCandleArrays;
  }
}

/** Parse Dhan parallel OHLC arrays into normalized HistoryCandle rows. */
export function parseDhanCandles(body: DhanCandleArrays | null | undefined): HistoryCandle[] {
  const ts = body?.timestamp ?? [];
  const open = body?.open ?? [];
  const high = body?.high ?? [];
  const low = body?.low ?? [];
  const close = body?.close ?? [];
  const volume = body?.volume ?? [];
  const n = Math.min(ts.length, open.length, high.length, low.length, close.length);
  const out: HistoryCandle[] = [];

  for (let i = 0; i < n; i++) {
    let t = Number(ts[i]);
    if (!Number.isFinite(t) || t <= 0) continue;
    // Seconds → milliseconds
    if (t < 1e11) t *= 1000;

    const o = Number(open[i]);
    const h = Number(high[i]);
    const l = Number(low[i]);
    const c = Number(close[i]);
    const v = Number(volume[i] ?? 0);
    if (![o, h, l, c].every((x) => Number.isFinite(x) && x > 0)) continue;
    if (h < l || h < Math.max(o, c) || l > Math.min(o, c)) continue;

    out.push({
      t,
      o,
      h: Math.max(h, o, c),
      l: Math.min(l, o, c),
      c,
      v: Number.isFinite(v) && v > 0 ? v : 0,
    });
  }
  return out;
}

export function resolveDhanChartTarget(
  instrumentKey: string,
  inst: {
    segment: string;
    symbol?: string;
    name?: string;
    optType?: string;
    dhanSecurityId?: string;
    dhanExchangeSegment?: string;
  },
): DhanChartTarget | null {
  let securityId = inst.dhanSecurityId?.trim();
  let exchangeSegment = inst.dhanExchangeSegment?.trim();

  if ((!securityId || !exchangeSegment) && instrumentKey.startsWith('DHAN|')) {
    const parts = instrumentKey.split('|');
    if (parts.length >= 3) {
      exchangeSegment = exchangeSegment || parts[1];
      securityId = securityId || parts.slice(2).join('|');
    }
  }
  if (!securityId || !exchangeSegment) return null;

  return {
    securityId,
    exchangeSegment,
    instrument: mapDhanInstrumentEnum(inst),
  };
}

/** Dhan `instrument` enum for charts API. */
export function mapDhanInstrumentEnum(inst: {
  segment: string;
  symbol?: string;
  name?: string;
  optType?: string;
}): string {
  if (inst.segment === 'EQ') return 'EQUITY';
  if (inst.segment === 'INDEX') return 'INDEX';
  if (inst.segment === 'CUR') return 'CURRENCY';

  const label = `${inst.symbol ?? ''} ${inst.name ?? ''}`.toUpperCase();
  const isIdx = /NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|INDIA VIX/.test(label);
  if (inst.optType === 'CE' || inst.optType === 'PE') {
    return isIdx ? 'OPTIDX' : 'OPTSTK';
  }
  return isIdx ? 'FUTIDX' : 'FUTSTK';
}

function dhanNativePlan(
  interval: UpstoxCandleInterval,
):
  | { kind: 'intraday'; interval: string }
  | { kind: 'daily' }
  | { kind: 'aggregate'; from: string } {
  switch (interval) {
    case '1minute': return { kind: 'intraday', interval: '1' };
    case '5minute': return { kind: 'intraday', interval: '5' };
    case '15minute': return { kind: 'intraday', interval: '15' };
    case '60minute': return { kind: 'intraday', interval: '60' };
    case 'day': return { kind: 'daily' };
    case '30minute': return { kind: 'aggregate', from: '15' };
    default: return { kind: 'intraday', interval: '1' };
  }
}

/** True when Dhan returned the requested TF natively (no 1m re-aggregation needed). */
export function dhanReturnsNativeInterval(interval: UpstoxCandleInterval): boolean {
  return interval !== '30minute';
}

function formatIstDateTime(ms: number): string {
  const ist = new Date(ms + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  const ss = String(ist.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function formatIstDate(ms: number): string {
  return formatIstDateTime(ms).slice(0, 10);
}
