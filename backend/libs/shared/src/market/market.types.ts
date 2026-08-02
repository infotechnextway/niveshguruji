/** Market-data contracts shared by the engine (producer) and api (consumer). */

export type MarketSegment = 'EQ' | 'FO' | 'CUR' | 'INDEX';

export interface Quote {
  /** Canonical instrument key (Upstox instrument_key form, e.g. "NSE_EQ|INE002A01018"). */
  instrumentKey: string;
  ltp: number; // last traded price in rupees
  change: number; // absolute change vs previous close
  changePct: number; // percentage change vs previous close
  bid: number;
  ask: number;
  volume: number;
  prevClose: number;
  ts: number; // epoch ms of the tick
}

/** Redis keys and pub/sub channels for the tick pipeline (ADR-2, ADR-7). */
export const QUOTE_CACHE_PREFIX = 'quote:';
export const QUOTE_CHANNEL_PREFIX = 'quotes.'; // published on the event bus as events:quotes.<key>

export function quoteCacheKey(instrumentKey: string): string {
  return QUOTE_CACHE_PREFIX + instrumentKey;
}

export function quoteChannel(instrumentKey: string): string {
  return QUOTE_CHANNEL_PREFIX + instrumentKey;
}

export interface Candle {
  instrumentKey: string;
  ts: number; // epoch ms of the bar's open (minute-aligned)
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}
