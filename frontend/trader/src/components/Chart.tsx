'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type IPriceLine,
  type SeriesMarker,
  type Time,
  type LineData,
  ColorType,
} from 'lightweight-charts';
import type { Instrument } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useQuotes } from '@/lib/quote-store';
import { getDataFeed, barBucketSec, SUPPORTED_RESOLUTIONS, type Bar, type Resolution, type SymbolInfo } from '@/lib/market/datafeed';
import {
  computeConfluence,
  extendTrendline,
  DEFAULT_CONFLUENCE_SETTINGS,
  sanitizeBars,
  barPriceRange,
  isValidBar,
  type ConfluenceSettings,
  type ConfluenceResult,
} from '@/lib/market/indicators';

const TIMEFRAMES: { label: string; res: Resolution }[] = [
  { label: '1m', res: '1' },
  { label: '5m', res: '5' },
  { label: '15m', res: '15' },
  { label: '1h', res: '60' },
];

const LOAD_TIMEOUT_MS = 8000;

/** Overlays must not expand the candlestick price scale. */
const OVERLAY_SERIES_OPTS = {
  priceLineVisible: false,
  lastValueVisible: false,
  autoscaleInfoProvider: () => null,
} as const;

function fitChartScale(chart: IChartApi, barCount = 0): void {
  if (barCount > 80) {
    chart.timeScale().setVisibleLogicalRange({
      from: barCount - Math.min(120, barCount),
      to: barCount - 1 + 0.5,
    });
  } else {
    chart.timeScale().fitContent();
  }
  chart.priceScale('right').applyOptions({ autoScale: true });
}

function refreshPriceAutoscale(chart: IChartApi): void {
  chart.priceScale('right').applyOptions({ autoScale: true });
}

function quoteSeedBar(ltp: number, resolution: Resolution): Bar {
  const bucket = barBucketSec(resolution, Date.now());
  return { time: bucket, open: ltp, high: ltp, low: ltp, close: ltp, volume: 0 };
}

function priceFormatFromInfo(info: SymbolInfo) {
  const tick = info.pricescale > 0 ? 1 / info.pricescale : 0.05;
  const precision = tick >= 1 ? 0 : Math.max(0, Math.ceil(-Math.log10(tick) - 1e-9));
  return { type: 'price' as const, precision, minMove: tick };
}

/** Clean watchlist chart — confluence overlays stay off unless re-enabled later. */
const CLEAN_SETTINGS: ConfluenceSettings = { ...DEFAULT_CONFLUENCE_SETTINGS, enabled: false };

function historySpanSec(resolution: Resolution): number {
  switch (resolution) {
    case '60': return 86400 * 30;
    case '15': return 86400 * 14;
    case '5': return 86400 * 7;
    default: return 86400 * 3;
  }
}

function toLineData(pts: { time: number; value: number }[]): LineData<Time>[] {
  return pts
    .filter((p) => Number.isFinite(p.value))
    .map((p) => ({ time: p.time as Time, value: p.value }));
}

function toLwMarkers(markers: ConfluenceResult['markers']): SeriesMarker<Time>[] {
  return markers.map((m) => ({
    time: m.time as Time,
    position: m.position,
    color: m.color,
    shape: m.shape,
    text: m.text,
    size: m.size ?? 1,
  }));
}

/** Candlestick chart for the watchlist — clean by default, confluence optional. */
export function Chart({ inst }: { inst: Instrument }) {
  const { theme } = useTheme();
  const liveQuote = useQuotes((s) => s.quotes[inst.instrumentKey]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const emaFastRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSlowRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaGoldenRef = useRef<ISeriesApi<'Line'> | null>(null);
  const trendUpRef = useRef<ISeriesApi<'Line'> | null>(null);
  const trendDownRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const barsRef = useRef<Bar[]>([]);
  const mtfBarsRef = useRef<Bar[]>([]);
  const listenerRef = useRef(`chart-${Math.random().toString(36).slice(2)}`);
  const [resolution, setResolution] = useState<Resolution>('1');
  const [status, setStatus] = useState('');
  const [barsLoading, setBarsLoading] = useState(false);
  const [chartEpoch, setChartEpoch] = useState(0);
  const settingsRef = useRef<ConfluenceSettings>(CLEAN_SETTINGS);
  const [, setConfluence] = useState<ConfluenceResult | null>(null);
  const liveQuoteRef = useRef(liveQuote);
  const confluenceRafRef = useRef<number | null>(null);

  useEffect(() => {
    liveQuoteRef.current = liveQuote;
  }, [liveQuote]);

  const clearPriceLines = useCallback(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const pl of priceLinesRef.current) series.removePriceLine(pl);
    priceLinesRef.current = [];
  }, []);

  const clearOverlaySeries = useCallback(() => {
    emaFastRef.current?.setData([]);
    emaSlowRef.current?.setData([]);
    emaGoldenRef.current?.setData([]);
    trendUpRef.current?.setData([]);
    trendDownRef.current?.setData([]);
    seriesRef.current?.setMarkers([]);
    clearPriceLines();
  }, [clearPriceLines]);

  const applyConfluence = useCallback((
    bars: Bar[],
    cfg: ConfluenceSettings,
    refit: 'full' | 'price' | false = 'price',
  ) => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    if (!cfg.enabled) {
      clearOverlaySeries();
      setConfluence(null);
      if (refit === 'full') fitChartScale(chart, bars.length);
      else if (refit === 'price') refreshPriceAutoscale(chart);
      return;
    }

    const result = computeConfluence(bars, cfg, mtfBarsRef.current.length ? mtfBarsRef.current : undefined);
    setConfluence(result);

    // EMA lines
    emaFastRef.current?.setData(cfg.enabled && cfg.showEMA ? toLineData(result.emaFast) : []);
    emaSlowRef.current?.setData(cfg.enabled && cfg.showEMA ? toLineData(result.emaSlow) : []);
    emaGoldenRef.current?.setData(cfg.enabled && cfg.showGolden ? toLineData(result.emaGolden) : []);

    // Trendlines — clamp extrapolated endpoints to recent candle range
    const lastTime = bars.length ? bars[bars.length - 1].time : 0;
    const upSeg = result.trendlines.find((s) => s.direction === 'up');
    const downSeg = result.trendlines.find((s) => s.direction === 'down');
    const priceSpan = barPriceRange(bars, Math.min(bars.length, 120));
    const trendClamp = priceSpan
      ? {
          min: priceSpan.min - (priceSpan.max - priceSpan.min) * 0.15,
          max: priceSpan.max + (priceSpan.max - priceSpan.min) * 0.15,
        }
      : undefined;
    trendUpRef.current?.setData(
      cfg.enabled && cfg.showTrend && upSeg ? toLineData(extendTrendline(upSeg, lastTime, trendClamp)) : [],
    );
    trendDownRef.current?.setData(
      cfg.enabled && cfg.showTrend && downSeg ? toLineData(extendTrendline(downSeg, lastTime, trendClamp)) : [],
    );

    // Fib price lines — skip levels far outside recent price action
    clearPriceLines();
    if (cfg.enabled && cfg.showFib) {
      const fibColors: Record<number, string> = {
        0: '#6b7280', 0.236: '#9ca3af', 0.382: '#d1d5db',
        0.5: '#fbbf24', 0.618: '#f59e0b', 0.786: '#d97706', 1: '#6b7280',
      };
      const fibClamp = priceSpan
        ? {
            min: priceSpan.min - (priceSpan.max - priceSpan.min) * 0.25,
            max: priceSpan.max + (priceSpan.max - priceSpan.min) * 0.25,
          }
        : null;
      for (const fl of result.fibLevels) {
        if (fibClamp && (fl.price < fibClamp.min || fl.price > fibClamp.max)) continue;
        const pl = series.createPriceLine({
          price: fl.price,
          color: fibColors[fl.ratio] ?? '#9ca3af',
          lineWidth: fl.ratio === 0.5 || fl.ratio === 0.618 ? 2 : 1,
          lineStyle: fl.ratio === 0.5 || fl.ratio === 0.618 ? 0 : 2,
          axisLabelVisible: true,
          title: fl.label,
        });
        priceLinesRef.current.push(pl);
      }
    }

    // Markers on candlestick series
    series.setMarkers(cfg.enabled ? toLwMarkers(result.markers) : []);

    if (refit === 'full') fitChartScale(chart, bars.length);
    else if (refit === 'price') refreshPriceAutoscale(chart);
  }, [clearOverlaySeries, clearPriceLines]);

  // Create / recreate chart when theme changes.
  // non-zero size — lightweight-charts paints nothing when mounted at 0×0.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let chart: IChartApi | null = null;
    let cancelled = false;

    const mount = () => {
      if (cancelled || chart || el.clientWidth < 32 || el.clientHeight < 32) return;

      const dark = theme === 'dark';
      chart = createChart(el, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: dark ? '#9ca3af' : '#6b7280',
        },
        grid: {
          vertLines: { color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
          horzLines: { color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
        },
        rightPriceScale: { autoScale: true, borderVisible: false },
        timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
        crosshair: { mode: 1 },
      });
      const series = chart.addCandlestickSeries({
        upColor: '#16a34a', downColor: '#dc2626',
        borderUpColor: '#16a34a', borderDownColor: '#dc2626',
        wickUpColor: '#16a34a', wickDownColor: '#dc2626',
      });
      const emaFast = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, ...OVERLAY_SERIES_OPTS });
      const emaSlow = chart.addLineSeries({ color: '#f97316', lineWidth: 1, ...OVERLAY_SERIES_OPTS });
      const emaGolden = chart.addLineSeries({ color: '#eab308', lineWidth: 1, lineStyle: 2, ...OVERLAY_SERIES_OPTS });
      const trendUp = chart.addLineSeries({ color: '#22c55e', lineWidth: 1, lineStyle: 2, ...OVERLAY_SERIES_OPTS });
      const trendDown = chart.addLineSeries({ color: '#ef4444', lineWidth: 1, lineStyle: 2, ...OVERLAY_SERIES_OPTS });

      chartRef.current = chart;
      seriesRef.current = series;
      emaFastRef.current = emaFast;
      emaSlowRef.current = emaSlow;
      emaGoldenRef.current = emaGolden;
      trendUpRef.current = trendUp;
      trendDownRef.current = trendDown;
      priceLinesRef.current = [];
      setChartEpoch((n) => n + 1);
    };

    const ro = new ResizeObserver(() => mount());
    ro.observe(el);
    mount();

    return () => {
      cancelled = true;
      ro.disconnect();
      chart?.remove();
      chartRef.current = null;
      seriesRef.current = null;
      emaFastRef.current = null;
      emaSlowRef.current = null;
      emaGoldenRef.current = null;
      trendUpRef.current = null;
      trendDownRef.current = null;
      priceLinesRef.current = [];
    };
  }, [theme]);

  // Load bars once the chart instance exists.
  useEffect(() => {
    const feed = getDataFeed();
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || chartEpoch === 0) return;

    let cancelled = false;
    const guid = listenerRef.current;
    setBarsLoading(true);
    setStatus('');
    clearOverlaySeries();
    series.setData([]);
    series.setMarkers([]);
    barsRef.current = [];
    mtfBarsRef.current = [];
    feed.unsubscribeBars(guid);

    if (!getSession()?.accessToken) {
      setBarsLoading(false);
      setStatus('Sign in for chart data — demo mode has no candles API');
      return () => { cancelled = true; };
    }

    const fallbackInfo: SymbolInfo = {
      ticker: inst.instrumentKey,
      name: inst.symbol,
      description: inst.name,
      exchange: inst.exchange,
      listed_exchange: inst.exchange,
      type: inst.segment,
      session: '0915-1530',
      timezone: 'Asia/Kolkata',
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      supported_resolutions: [...SUPPORTED_RESOLUTIONS],
      volume_precision: 0,
      data_status: 'streaming',
      instrumentKey: inst.instrumentKey,
      lotSize: inst.lotSize,
      segment: inst.segment,
    };

    const finish = (msg: string) => {
      if (cancelled) return;
      setBarsLoading(false);
      setStatus(msg);
    };

    const timer = window.setTimeout(() => {
      finish('Market data timed out — check API / Upstox token');
    }, LOAD_TIMEOUT_MS);

    const loadBars = (info: SymbolInfo) => {
      series.applyOptions({ priceFormat: priceFormatFromInfo(info) });
      const to = Math.floor(Date.now() / 1000);
      const span = historySpanSec(resolution);

      const applyLoaded = (bars: Bar[]) => {
        window.clearTimeout(timer);
        if (cancelled) return;
        let displayBars = sanitizeBars(bars);
        const ltp = liveQuoteRef.current?.ltp;
        if (!displayBars.length && ltp && ltp > 0) {
          displayBars = sanitizeBars([quoteSeedBar(ltp, resolution)]);
        }
        barsRef.current = [...displayBars];
        series.setData(displayBars as CandlestickData[]);
        applyConfluence(displayBars, settingsRef.current, 'full');
        setBarsLoading(false);
        setStatus(
          displayBars.length
            ? ''
            : 'No candle data — sync instruments or wait for live quotes',
        );
        const seedBar = displayBars.length ? displayBars[displayBars.length - 1] : undefined;
        feed.subscribeBars(info, resolution, (bar) => {
          if (!isValidBar(bar)) return;
          const prev = barsRef.current;
          const last = prev[prev.length - 1];
          if (last && bar.time < last.time) return;

          try {
            series.update(bar as CandlestickData);
          } catch {
            return;
          }
          setStatus('');

          if (last && last.time === bar.time) {
            prev[prev.length - 1] = bar;
          } else {
            prev.push(bar);
          }
          barsRef.current = prev;

          if (!settingsRef.current.enabled) return;

          if (confluenceRafRef.current != null) cancelAnimationFrame(confluenceRafRef.current);
          confluenceRafRef.current = requestAnimationFrame(() => {
            confluenceRafRef.current = null;
            applyConfluence(barsRef.current, settingsRef.current, false);
          });
        }, guid, seedBar);
      };

      feed.getBars(
        info,
        resolution,
        { from: to - span, to, countBack: 2000 },
        (bars) => {
          applyLoaded(bars);
          if (settingsRef.current.enabled && resolution !== '1') {
            feed.getBars(
              info,
              '1',
              { from: to - 86400 * 3, to, countBack: 2000 },
              (bars1m) => {
                if (!cancelled) {
                  mtfBarsRef.current = sanitizeBars(bars1m);
                  applyConfluence(barsRef.current, settingsRef.current, 'price');
                }
              },
              () => { mtfBarsRef.current = []; },
            );
          } else if (resolution === '1') {
            mtfBarsRef.current = sanitizeBars(bars);
          }
        },
        (err) => {
          window.clearTimeout(timer);
          const soft = err.includes('503') || err.toLowerCase().includes('token')
            ? 'Candles need Upstox access token (Admin → Upstox API)'
            : err.includes('404') || err.toLowerCase().includes('not found')
              ? 'Instrument not found — sync master in Admin'
              : err.includes('500') || /failed|fetch|network|refused/i.test(err)
                ? 'Market data unavailable — is the API running?'
                : err;
          finish(soft);
        },
      );
    };

    feed.resolveSymbol(
      inst.instrumentKey,
      (info) => { if (!cancelled) loadBars(info); },
      () => { if (!cancelled) loadBars(fallbackInfo); },
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (confluenceRafRef.current != null) cancelAnimationFrame(confluenceRafRef.current);
      feed.unsubscribeBars(guid);
    };
  }, [inst, resolution, chartEpoch, applyConfluence, clearOverlaySeries]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center',
        borderBottom: '1px solid var(--line-soft)', fontSize: 10,
        color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.res}
            type="button"
            onClick={() => setResolution(tf.res)}
            style={{
              color: resolution === tf.res ? 'var(--text)' : 'var(--text-faint)',
              fontWeight: resolution === tf.res ? 600 : 400,
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '2px 6px', fontSize: 10, letterSpacing: '0.06em',
              textTransform: 'uppercase', fontFamily: 'inherit',
            }}
          >
            {tf.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0 }}>
          {barsLoading ? 'Loading…' : status}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 280, width: '100%', position: 'relative' }}>
        <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }} />
      </div>
    </div>
  );
}
