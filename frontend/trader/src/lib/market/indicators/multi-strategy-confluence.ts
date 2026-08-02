import type { Bar } from '../datafeed';
import {
  aggregateBars,
  crossedAbove,
  crossedBelow,
  emaSeries,
  pivotHigh,
  pivotLow,
  rsiSeries,
  smaSeries,
  toLinePoints,
} from './helpers';
import type {
  ChartMarker,
  ConfluenceResult,
  ConfluenceSettings,
  FibLevel,
  MtfRow,
  TrendlineSegment,
} from './types';

const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

/** MTF rows from 1-minute bars (or pre-aggregated source bars). */
export function computeMtfFromBars(bars1m: Bar[]): MtfRow[] {
  const tfs = [
    { label: '1m', minutes: 1 },
    { label: '3m', minutes: 3 },
    { label: '5m', minutes: 5 },
    { label: '15m', minutes: 15 },
  ];
  return tfs.map(({ label, minutes }) => {
    const agg = minutes === 1 ? bars1m : aggregateBars(bars1m, minutes);
    const closes = agg.map((b) => b.close);
    const e9 = emaSeries(closes, 9);
    const e15 = emaSeries(closes, 15);
    const last = agg.length - 1;
    const v9 = e9[last];
    const v15 = e15[last];
    if (Number.isNaN(v9) || Number.isNaN(v15)) {
      return { tf: label, bias: 'Neutral' as const, ema9: v9, ema15: v15 };
    }
    const bias: MtfRow['bias'] = v9 > v15 ? 'Bull' : v9 < v15 ? 'Bear' : 'Neutral';
    return { tf: label, bias, ema9: v9, ema15: v15 };
  });
}

function findSwingRange(bars: Bar[], lookback: number): { high: number; low: number; highIdx: number; lowIdx: number } {
  const start = Math.max(0, bars.length - lookback);
  const slice = bars.slice(start);
  if (!slice.length) return { high: 0, low: 0, highIdx: 0, lowIdx: 0 };

  const indexed = slice.map((bar, i) => ({ bar, idx: start + i }));
  const closes = slice.map((b) => b.close).sort((a, b) => a - b);
  const median = closes[Math.floor(closes.length / 2)] ?? slice[slice.length - 1].close;
  const band = Math.max(median * 0.12, 1);
  const filtered = indexed.filter(({ bar }) => bar.low >= median - band && bar.high <= median + band);
  const use = filtered.length >= Math.min(3, slice.length) ? filtered : indexed;

  let high = -Infinity;
  let low = Infinity;
  let highIdx = start;
  let lowIdx = start;
  for (const { bar, idx } of use) {
    if (bar.high > high) { high = bar.high; highIdx = idx; }
    if (bar.low < low) { low = bar.low; lowIdx = idx; }
  }
  return { high, low, highIdx, lowIdx };
}

function buildTrendlines(bars: Bar[], pivotLen: number): TrendlineSegment[] {
  const segs: TrendlineSegment[] = [];
  const pivotsLow: { time: number; price: number }[] = [];
  const pivotsHigh: { time: number; price: number }[] = [];

  for (let i = pivotLen; i < bars.length - pivotLen; i++) {
    const pl = pivotLow(bars, i, pivotLen, pivotLen);
    const ph = pivotHigh(bars, i, pivotLen, pivotLen);
    if (pl != null) pivotsLow.push({ time: bars[i].time, price: pl });
    if (ph != null) pivotsHigh.push({ time: bars[i].time, price: ph });
  }

  if (pivotsLow.length >= 2) {
    const a = pivotsLow[pivotsLow.length - 2];
    const b = pivotsLow[pivotsLow.length - 1];
    segs.push({ time1: a.time, price1: a.price, time2: b.time, price2: b.price, direction: 'up' });
  }
  if (pivotsHigh.length >= 2) {
    const a = pivotsHigh[pivotsHigh.length - 2];
    const b = pivotsHigh[pivotsHigh.length - 1];
    segs.push({ time1: a.time, price1: a.price, time2: b.time, price2: b.price, direction: 'down' });
  }
  return segs;
}

function trendlinePrice(seg: TrendlineSegment, time: number): number {
  const dt = seg.time2 - seg.time1;
  if (dt === 0) return seg.price2;
  const slope = (seg.price2 - seg.price1) / dt;
  return seg.price1 + slope * (time - seg.time1);
}

/**
 * Multi-Strategy Confluence — ports Pine v5 overlay logic to client-side TypeScript.
 * @param bars - chart timeframe bars used for all strategies except MTF
 * @param settings - display / parameter toggles
 * @param mtfBars - optional 1m bars for MTF panel (falls back to `bars` when resolution is 1m)
 */
export function computeConfluence(
  bars: Bar[],
  settings: ConfluenceSettings,
  mtfBars?: Bar[],
): ConfluenceResult {
  const empty: ConfluenceResult = {
    emaFast: [], emaSlow: [], emaGolden: [], markers: [], fibLevels: [],
    goldenZoneTop: 0, goldenZoneBottom: 0, trendlines: [], mtf: [],
    lastBullScore: 0, lastBearScore: 0, strongSignal: null,
  };
  if (bars.length < 30) return empty;

  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume ?? 0);
  const pl = settings.pivotLookback;

  const emaFast = emaSeries(closes, settings.emaFast);
  const emaSlow = emaSeries(closes, settings.emaSlow);
  const emaGolden = emaSeries(closes, settings.goldenEmaLength);
  const rsi = rsiSeries(closes, settings.rsiLength);
  const volMa = smaSeries(volumes, settings.volMaLength);

  const markers: ChartMarker[] = [];
  let lastSwHigh = bars[0].high;
  let lastSwLow = bars[0].low;

  const trendlines = settings.showTrend ? buildTrendlines(bars, pl) : [];
  const upSeg = trendlines.find((s) => s.direction === 'up');
  const downSeg = trendlines.find((s) => s.direction === 'down');

  let lastBull = 0;
  let lastBear = 0;

  for (let i = pl * 2; i < bars.length; i++) {
    let bull = 0;
    let bear = 0;
    const bar = bars[i];

    // 1. EMA crossover
    if (settings.showEMA) {
      if (crossedAbove(emaFast, emaSlow, i)) {
        bull++;
        markers.push({
          time: bar.time, position: 'belowBar', color: '#22c55e',
          shape: 'arrowUp', text: 'EMA↑', size: 1,
        });
      }
      if (crossedBelow(emaFast, emaSlow, i)) {
        bear++;
        markers.push({
          time: bar.time, position: 'aboveBar', color: '#ef4444',
          shape: 'arrowDown', text: 'EMA↓', size: 1,
        });
      }
      if (emaFast[i] > emaSlow[i]) bull++;
      else if (emaFast[i] < emaSlow[i]) bear++;
    }

    // Update swing pivots for sweep
    const ph = pivotHigh(bars, i - pl, pl, pl);
    const plow = pivotLow(bars, i - pl, pl, pl);
    if (ph != null) lastSwHigh = ph;
    if (plow != null) lastSwLow = plow;

    // 2. Liquidity sweep
    if (settings.showSweep) {
      const bullSweep = bar.high > lastSwHigh && bar.close < lastSwHigh;
      const bearSweep = bar.low < lastSwLow && bar.close > lastSwLow;
      if (bullSweep) {
        bull++;
        markers.push({
          time: bar.time, position: 'belowBar', color: '#06b6d4',
          shape: 'circle', text: 'Sweep↑', size: 1,
        });
      }
      if (bearSweep) {
        bear++;
        markers.push({
          time: bar.time, position: 'aboveBar', color: '#f97316',
          shape: 'circle', text: 'Sweep↓', size: 1,
        });
      }
    }

    // 3. Trendline break
    if (settings.showTrend) {
      if (downSeg) {
        const tl = trendlinePrice(downSeg, bar.time);
        if (bar.close > tl && bars[i - 1].close <= trendlinePrice(downSeg, bars[i - 1].time)) {
          bull++;
          markers.push({
            time: bar.time, position: 'belowBar', color: '#a855f7',
            shape: 'square', text: 'TL↑', size: 1,
          });
        }
      }
      if (upSeg) {
        const tl = trendlinePrice(upSeg, bar.time);
        if (bar.close < tl && bars[i - 1].close >= trendlinePrice(upSeg, bars[i - 1].time)) {
          bear++;
          markers.push({
            time: bar.time, position: 'aboveBar', color: '#a855f7',
            shape: 'square', text: 'TL↓', size: 1,
          });
        }
      }
    }

    // 4. Golden Trio
    if (settings.showGolden && !Number.isNaN(emaGolden[i]) && !Number.isNaN(rsi[i]) && !Number.isNaN(volMa[i])) {
      const volOk = volumes[i] > volMa[i];
      const goldenBull = bar.close > emaGolden[i] && rsi[i] > 50 && volOk;
      const goldenBear = bar.close < emaGolden[i] && rsi[i] < 50 && volOk;
      if (goldenBull) {
        bull++;
        markers.push({
          time: bar.time, position: 'belowBar', color: '#eab308',
          shape: 'arrowUp', text: 'GT', size: 1,
        });
      }
      if (goldenBear) {
        bear++;
        markers.push({
          time: bar.time, position: 'aboveBar', color: '#eab308',
          shape: 'arrowDown', text: 'GT', size: 1,
        });
      }
    }

    // 5. Fibonacci golden zone proximity
    if (settings.showFib && i === bars.length - 1) {
      const swing = findSwingRange(bars, settings.swingLookback);
      const range = swing.high - swing.low;
      if (range > 0) {
        const mid = swing.low + range * 0.5;
        const golden618 = swing.low + range * 0.618;
        if (bar.close >= mid && bar.close <= golden618) bull++;
        else if (bar.close <= swing.low + range * 0.382) bear++;
      }
    }

    // 6. Confluence strong signals
    if (settings.showSignals) {
      if (bull >= settings.confluenceThreshold) {
        markers.push({
          time: bar.time, position: 'belowBar', color: '#16a34a',
          shape: 'arrowUp', text: `BUY ${bull}`, size: 2,
        });
      }
      if (bear >= settings.confluenceThreshold) {
        markers.push({
          time: bar.time, position: 'aboveBar', color: '#dc2626',
          shape: 'arrowDown', text: `SELL ${bear}`, size: 2,
        });
      }
    }

    if (i === bars.length - 1) {
      lastBull = bull;
      lastBear = bear;
    }
  }

  // Fib levels from latest swing
  const fibLevels: FibLevel[] = [];
  let goldenZoneTop = 0;
  let goldenZoneBottom = 0;
  if (settings.showFib) {
    const swing = findSwingRange(bars, settings.swingLookback);
    const range = swing.high - swing.low;
    const base = swing.lowIdx < swing.highIdx ? swing.low : swing.high;
    const top = swing.lowIdx < swing.highIdx ? swing.high : swing.low;
    const dir = swing.lowIdx < swing.highIdx ? 1 : -1;
    for (const r of FIB_RATIOS) {
      const price = base + dir * range * r;
      fibLevels.push({ ratio: r, price, label: `${(r * 100).toFixed(1)}%` });
    }
    goldenZoneBottom = base + dir * range * 0.5;
    goldenZoneTop = base + dir * range * 0.618;
    if (goldenZoneBottom > goldenZoneTop) {
      const t = goldenZoneTop; goldenZoneTop = goldenZoneBottom; goldenZoneBottom = t;
    }
  }

  const mtf = settings.showMTF
    ? computeMtfFromBars(mtfBars ?? bars)
    : [];

  let strongSignal: ConfluenceResult['strongSignal'] = null;
  if (lastBull >= settings.confluenceThreshold) strongSignal = 'buy';
  else if (lastBear >= settings.confluenceThreshold) strongSignal = 'sell';

  return {
    emaFast: settings.showEMA ? toLinePoints(bars, emaFast) : [],
    emaSlow: settings.showEMA ? toLinePoints(bars, emaSlow) : [],
    emaGolden: settings.showGolden ? toLinePoints(bars, emaGolden) : [],
    markers: settings.enabled ? markers : [],
    fibLevels: settings.showFib ? fibLevels : [],
    goldenZoneTop,
    goldenZoneBottom,
    trendlines: settings.showTrend ? trendlines : [],
    mtf,
    lastBullScore: lastBull,
    lastBearScore: lastBear,
    strongSignal,
  };
}

/** Extend trendline segments to the last bar time for drawing. */
export function extendTrendline(
  seg: TrendlineSegment,
  toTime: number,
  clamp?: { min: number; max: number },
): { time: number; value: number }[] {
  const slope = (seg.price2 - seg.price1) / (seg.time2 - seg.time1 || 1);
  let endPrice = seg.price1 + slope * (toTime - seg.time1);
  if (clamp) {
    endPrice = Math.max(clamp.min, Math.min(clamp.max, endPrice));
  }
  return [
    { time: seg.time1, value: seg.price1 },
    { time: seg.time2, value: seg.price2 },
    { time: toTime, value: endPrice },
  ];
}
