import { Injectable, Logger } from '@nestjs/common';
import { UpstoxCredentialsService } from '../application/upstox-credentials.service';

export type UpstoxCandleInterval =
  | '1minute'
  | '5minute'
  | '15minute'
  | '30minute'
  | '60minute'
  | 'day';

/** Intervals built by aggregating stored / fetched 1m bars (Upstox V2 has no direct API). */
export function aggregatesFrom1m(interval: UpstoxCandleInterval): boolean {
  return interval === '5minute' || interval === '15minute' || interval === '60minute';
}

export function intervalBucketMs(interval: UpstoxCandleInterval): number {
  switch (interval) {
    case '1minute': return 60_000;
    case '5minute': return 5 * 60_000;
    case '15minute': return 15 * 60_000;
    case '30minute': return 30 * 60_000;
    case '60minute': return 60 * 60_000;
    case 'day': return 86_400_000;
  }
}

/** Normalized candle for chart/API consumers. */
export interface HistoryCandle {
  t: number; // epoch ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface UpstoxCandleResponse {
  status?: string;
  data?: { candles?: Array<[string | number, number, number, number, number, number, number?]> };
}

/**
 * Upstox historical + intraday candle REST client.
 * Token from UpstoxCredentialsService (admin DB → env fallback).
 */
@Injectable()
export class UpstoxHistoryClient {
  private readonly logger = new Logger(UpstoxHistoryClient.name);

  constructor(private readonly credentials: UpstoxCredentialsService) {}

  hasToken(): boolean {
    return this.credentials.hasAccessToken();
  }

  async fetchCandles(
    instrumentKey: string,
    interval: UpstoxCandleInterval,
    fromMs: number,
    toMs: number,
  ): Promise<HistoryCandle[]> {
    const token = this.credentials.getAccessToken();
    if (!token) throw new Error('UPSTOX_ACCESS_TOKEN is not configured (set via Admin → Upstox API)');

    const fromDate = toYmd(fromMs);
    const toDate = toYmd(toMs);
    const today = toYmd(Date.now());
    const encoded = encodeURIComponent(instrumentKey);

    const historical = await this.getJson(
      `https://api.upstox.com/v2/historical-candle/${encoded}/${interval}/${toDate}/${fromDate}`,
      token,
    );
    let candles = parseCandles(historical);

    if (toDate >= today) {
      try {
        const intraday = await this.getJson(
          `https://api.upstox.com/v2/historical-candle/intraday/${encoded}/${interval}`,
          token,
        );
        candles = mergeByTs(candles, parseCandles(intraday));
      } catch (err) {
        this.logger.warn(`Intraday candles unavailable: ${(err as Error).message}`);
      }
    }

    return candles
      .filter((c) => c.t >= fromMs && c.t <= toMs)
      .sort((a, b) => a.t - b.t);
  }

  private async getJson(url: string, token: string): Promise<UpstoxCandleResponse> {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Api-Version': '2.0',
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Upstox history ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as UpstoxCandleResponse;
  }
}

export function parseCandles(body: UpstoxCandleResponse): HistoryCandle[] {
  const raw = body?.data?.candles ?? [];
  const out: HistoryCandle[] = [];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const t = typeof row[0] === 'number' ? row[0] : Date.parse(String(row[0]));
    if (Number.isNaN(t)) continue;
    out.push({
      t,
      o: Number(row[1]),
      h: Number(row[2]),
      l: Number(row[3]),
      c: Number(row[4]),
      v: Number(row[5] ?? 0),
    });
  }
  return out;
}

function mergeByTs(a: HistoryCandle[], b: HistoryCandle[]): HistoryCandle[] {
  const map = new Map<number, HistoryCandle>();
  for (const c of a) map.set(c.t, c);
  for (const c of b) map.set(c.t, c);
  return [...map.values()].sort((x, y) => x.t - y.t);
}

function toYmd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Map UI timeframe labels to Upstox intervals. */
export function mapUiInterval(interval?: string): UpstoxCandleInterval {
  switch ((interval || '1minute').toLowerCase()) {
    case '1m':
    case '1min':
    case '1minute':
      return '1minute';
    case '5m':
    case '5min':
    case '5minute':
      return '5minute';
    case '15m':
    case '15min':
    case '15minute':
      return '15minute';
    case '30m':
    case '30min':
    case '30minute':
      return '30minute';
    case '1h':
    case '60m':
    case '60min':
    case '60minute':
    case '1hour':
      return '60minute';
    case '1d':
    case 'day':
    case 'd':
      return 'day';
    default:
      return '1minute';
  }
}
