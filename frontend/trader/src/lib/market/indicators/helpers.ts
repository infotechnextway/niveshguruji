import type { Bar } from '../datafeed';

export interface LinePoint {
  time: number;
  value: number;
}

/** Exponential moving average aligned to bar index (NaN until warmup). */
export function emaSeries(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  out[period - 1] = ema;
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

/** Simple moving average aligned to bar index. */
export function smaSeries(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;
  let sum = values.slice(0, period).reduce((s, v) => s + v, 0);
  out[period - 1] = sum / period;
  for (let i = period; i < values.length; i++) {
    sum += values[i] - values[i - period];
    out[i] = sum / period;
  }
  return out;
}

/** Wilder RSI. */
export function rsiSeries(closes: number[], period: number): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length <= period) return out;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) avgGain += d;
    else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/** Pivot high at index (confirmed after `right` bars). */
export function pivotHigh(bars: Bar[], i: number, left: number, right: number): number | null {
  if (i < left || i >= bars.length - right) return null;
  const h = bars[i].high;
  for (let j = i - left; j <= i + right; j++) {
    if (j === i) continue;
    if (bars[j].high >= h) return null;
  }
  return h;
}

/** Pivot low at index (confirmed after `right` bars). */
export function pivotLow(bars: Bar[], i: number, left: number, right: number): number | null {
  if (i < left || i >= bars.length - right) return null;
  const l = bars[i].low;
  for (let j = i - left; j <= i + right; j++) {
    if (j === i) continue;
    if (bars[j].low <= l) return null;
  }
  return l;
}

/** Aggregate 1-minute bars into N-minute bars (N must divide cleanly into bar times). */
export function aggregateBars(bars: Bar[], minutes: number): Bar[] {
  if (minutes <= 1 || bars.length === 0) return bars;
  const bucketSec = minutes * 60;
  const out: Bar[] = [];
  let cur: Bar | null = null;
  for (const b of bars) {
    const bucket = Math.floor(b.time / bucketSec) * bucketSec;
    if (!cur || cur.time !== bucket) {
      if (cur) out.push(cur);
      cur = { time: bucket, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume ?? 0 };
    } else {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.volume = (cur.volume ?? 0) + (b.volume ?? 0);
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** True when OHLC is finite and internally consistent. */
export function isValidBar(b: Bar): boolean {
  const { open: o, high: h, low: l, close: c } = b;
  if (!Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) return false;
  if (o <= 0 || h <= 0 || l <= 0 || c <= 0) return false;
  if (h < l) return false;
  if (h < Math.max(o, c) - 1e-9 || l > Math.min(o, c) + 1e-9) return false;
  return true;
}

/** Drop invalid bars, normalize wicks, sort ascending, dedupe by time (keep last). */
export function sanitizeBars(bars: Bar[]): Bar[] {
  const out: Bar[] = [];
  for (const b of bars) {
    if (!isValidBar(b)) continue;
    out.push({
      ...b,
      high: Math.max(b.high, b.open, b.close),
      low: Math.min(b.low, b.open, b.close),
    });
  }
  out.sort((a, b) => a.time - b.time);
  const deduped: Bar[] = [];
  for (const b of out) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.time === b.time) deduped[deduped.length - 1] = b;
    else deduped.push(b);
  }
  return deduped;
}

/** Min/max close+wick range for a bar slice (defaults to all bars). */
export function barPriceRange(bars: Bar[], lookback?: number): { min: number; max: number } | null {
  const slice = lookback != null && lookback > 0
    ? bars.slice(Math.max(0, bars.length - lookback))
    : bars;
  if (!slice.length) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const b of slice) {
    min = Math.min(min, b.low);
    max = Math.max(max, b.high);
  }
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
}

export function toLinePoints(bars: Bar[], series: number[]): LinePoint[] {
  const pts: LinePoint[] = [];
  for (let i = 0; i < bars.length; i++) {
    const v = series[i];
    if (!Number.isNaN(v)) pts.push({ time: bars[i].time, value: v });
  }
  return pts;
}

export function crossedAbove(a: number[], b: number[], i: number): boolean {
  if (i < 1 || Number.isNaN(a[i]) || Number.isNaN(b[i]) || Number.isNaN(a[i - 1]) || Number.isNaN(b[i - 1])) return false;
  return a[i - 1] <= b[i - 1] && a[i] > b[i];
}

export function crossedBelow(a: number[], b: number[], i: number): boolean {
  if (i < 1 || Number.isNaN(a[i]) || Number.isNaN(b[i]) || Number.isNaN(a[i - 1]) || Number.isNaN(b[i - 1])) return false;
  return a[i - 1] >= b[i - 1] && a[i] < b[i];
}
