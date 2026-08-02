import { Candle, Quote } from '@app/shared';

/** Aligns an epoch-ms timestamp down to its containing minute. */
export function minuteBucket(ts: number): number {
  return Math.floor(ts / 60_000) * 60_000;
}

/**
 * Pure 1-minute OHLCV aggregator. Feed it ticks; it emits a completed Candle
 * whenever a tick crosses into a new minute for that instrument. Kept pure so
 * it is exhaustively unit-testable and reusable in replay tests.
 */
export class CandleAggregator {
  private readonly open = new Map<string, Candle>();

  /** Returns a completed candle if this tick closed the previous minute. */
  add(quote: Quote): Candle | null {
    const bucket = minuteBucket(quote.ts);
    const current = this.open.get(quote.instrumentKey);

    if (!current) {
      this.open.set(quote.instrumentKey, this.newBar(quote, bucket));
      return null;
    }
    if (bucket === current.ts) {
      current.h = Math.max(current.h, quote.ltp);
      current.l = Math.min(current.l, quote.ltp);
      current.c = quote.ltp;
      current.v = quote.volume;
      return null;
    }
    // New minute — close the prior bar and open a fresh one.
    const completed = current;
    this.open.set(quote.instrumentKey, this.newBar(quote, bucket));
    return completed;
  }

  /** Force-close all open bars (used at session end / shutdown). */
  flush(): Candle[] {
    const bars = [...this.open.values()];
    this.open.clear();
    return bars;
  }

  private newBar(quote: Quote, bucket: number): Candle {
    return {
      instrumentKey: quote.instrumentKey, ts: bucket,
      o: quote.ltp, h: quote.ltp, l: quote.ltp, c: quote.ltp, v: quote.volume,
    };
  }
}
