import type { HistoryCandle } from '../infrastructure/upstox-history.client';
import type { UpstoxCandleInterval } from '../infrastructure/upstox-history.client';
import { intervalBucketMs } from '../infrastructure/upstox-history.client';

/** True when OHLC is finite, positive, and wick-consistent. */
export function isValidHistoryCandle(c: HistoryCandle): boolean {
  const { t, o, h, l, c: close, v } = c;
  if (!Number.isFinite(t) || t <= 0) return false;
  if (![o, h, l, close].every((n) => Number.isFinite(n) && n > 0)) return false;
  if (!Number.isFinite(v) || v < 0) return false;
  if (h < l) return false;
  if (h + 1e-9 < Math.max(o, close)) return false;
  if (l - 1e-9 > Math.min(o, close)) return false;
  return true;
}

/** Normalize wick extremes and coerce volume. */
export function normalizeHistoryCandle(c: HistoryCandle): HistoryCandle {
  return {
    t: c.t,
    o: c.o,
    h: Math.max(c.h, c.o, c.c),
    l: Math.min(c.l, c.o, c.c),
    c: c.c,
    v: Number.isFinite(c.v) && c.v > 0 ? c.v : 0,
  };
}

/**
 * Sort ascending, drop invalids, dedupe by timestamp (keep last).
 * Optionally clamp to [fromMs, toMs].
 */
export function sanitizeHistoryCandles(
  bars: HistoryCandle[],
  fromMs?: number,
  toMs?: number,
): HistoryCandle[] {
  const cleaned: HistoryCandle[] = [];
  for (const raw of bars) {
    if (!isValidHistoryCandle(raw)) continue;
    if (fromMs != null && raw.t < fromMs) continue;
    if (toMs != null && raw.t > toMs) continue;
    cleaned.push(normalizeHistoryCandle(raw));
  }
  cleaned.sort((a, b) => a.t - b.t);
  const out: HistoryCandle[] = [];
  for (const b of cleaned) {
    const prev = out[out.length - 1];
    if (prev && prev.t === b.t) out[out.length - 1] = b;
    else out.push(b);
  }
  return out;
}

/**
 * Drop bars whose mid-price is wildly off the series median.
 * This removes polluted simulator / wrong-symbol 1m bars that otherwise
 * inflate aggregated highs/lows into "giant candles".
 */
export function filterPriceOutliers(bars: HistoryCandle[], band = 0.25): HistoryCandle[] {
  if (bars.length < 8) return bars;
  const mids = bars.map((b) => (b.h + b.l) / 2).sort((a, b) => a - b);
  const median = mids[Math.floor(mids.length / 2)];
  if (!(median > 0)) return bars;
  const lo = median * (1 - band);
  const hi = median * (1 + band);
  const kept = bars.filter((b) => {
    const mid = (b.h + b.l) / 2;
    return mid >= lo && mid <= hi && b.h <= hi * 1.05 && b.l >= lo * 0.95;
  });
  // If filtering wiped most of the series, keep original sanitized set.
  return kept.length >= Math.max(5, Math.floor(bars.length * 0.5)) ? kept : bars;
}

/** IST offset used for exchange session bucketing. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istDayStartMs(tsMs: number): number {
  const ist = tsMs + IST_OFFSET_MS;
  return Math.floor(ist / 86_400_000) * 86_400_000 - IST_OFFSET_MS;
}

/**
 * Align candle open time to NSE-friendly buckets.
 * Intraday intervals use UTC epoch modulo (valid for 1/5/15m because
 * 09:15 IST = 03:45 UTC lands on those grids). Day bars use IST midnight.
 */
export function bucketStartMs(tsMs: number, interval: UpstoxCandleInterval): number {
  if (interval === 'day') return istDayStartMs(tsMs);
  const bucketMs = intervalBucketMs(interval);
  return tsMs - (tsMs % bucketMs);
}

/** Aggregate 1m OHLC into a higher timeframe — open=first, high=max, low=min, close=last. */
export function aggregateFrom1m(bars: HistoryCandle[], interval: UpstoxCandleInterval): HistoryCandle[] {
  if (interval === '1minute' || !bars.length) return bars;
  const clean = filterPriceOutliers(sanitizeHistoryCandles(bars));
  const buckets = new Map<number, HistoryCandle>();
  for (const b of clean) {
    const bucket = bucketStartMs(b.t, interval);
    const cur = buckets.get(bucket);
    if (!cur) {
      buckets.set(bucket, { t: bucket, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v });
    } else {
      cur.h = Math.max(cur.h, b.h);
      cur.l = Math.min(cur.l, b.l);
      cur.c = b.c;
      cur.v += b.v;
    }
  }
  return sanitizeHistoryCandles([...buckets.values()]);
}

/**
 * Merge local Mongo bars with remote history.
 * Remote wins on timestamp collisions (real broker data > simulator pollution).
 * Local-only bars after the last remote timestamp are kept for live continuation.
 * Local-only bars inside the remote span are kept only when price-compatible.
 */
export function mergeRemotePreferring(
  remote: HistoryCandle[],
  local: HistoryCandle[],
): HistoryCandle[] {
  const remoteClean = sanitizeHistoryCandles(remote);
  const localClean = sanitizeHistoryCandles(local);
  if (!remoteClean.length) return filterPriceOutliers(localClean);
  if (!localClean.length) return remoteClean;

  const remoteByTs = new Map(remoteClean.map((c) => [c.t, c] as const));
  const lastRemoteTs = remoteClean[remoteClean.length - 1].t;
  const remoteMids = remoteClean.map((b) => (b.h + b.l) / 2).sort((a, b) => a - b);
  const median = remoteMids[Math.floor(remoteMids.length / 2)];
  const lo = median * 0.75;
  const hi = median * 1.25;

  const map = new Map<number, HistoryCandle>(remoteByTs);
  for (const c of localClean) {
    if (remoteByTs.has(c.t)) continue; // never overwrite broker history
    if (c.t > lastRemoteTs) {
      map.set(c.t, c); // live continuation
      continue;
    }
    const mid = (c.h + c.l) / 2;
    if (mid >= lo && mid <= hi) map.set(c.t, c);
  }
  return filterPriceOutliers(sanitizeHistoryCandles([...map.values()]));
}
