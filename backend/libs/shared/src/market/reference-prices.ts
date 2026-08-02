/**
 * Realistic reference closes for indices and liquid names — used to seed the
 * simulator and as a last-resort quote/candle fallback when live/history is
 * unavailable (market closed, no Upstox token, etc.).
 */
import type { Quote } from './market.types';

export const REFERENCE_CLOSES: Record<string, number> = {
  'NSE_INDEX|Nifty 50': 24_850,
  'NSE_INDEX|Nifty Bank': 52_400,
  'NSE_INDEX|Nifty Fin Service': 23_650,
  'NSE_EQ|INE002A01018': 2_870, // RELIANCE
  'NSE_EQ|INE467B01029': 3_810, // TCS
  'NSE_EQ|INE040A01034': 1_612, // HDFCBANK
  'NSE_EQ|INE009A01021': 1_492, // INFY
  'NSE_EQ|INE090A01021': 1_090, // ICICIBANK
};

/** Lookup a reference close (rupees) for an instrument key, or null if unknown. */
export function referenceClose(instrumentKey: string): number | null {
  if (REFERENCE_CLOSES[instrumentKey] != null) return REFERENCE_CLOSES[instrumentKey];
  return null;
}

/** Build a synthetic Quote from a reference close. */
export function referenceQuote(instrumentKey: string, close?: number): Quote | null {
  const ltp = close ?? referenceClose(instrumentKey);
  if (ltp == null) return null;
  const ts = Date.now();
  return {
    instrumentKey,
    ltp,
    prevClose: ltp,
    change: 0,
    changePct: 0,
    bid: ltp,
    ask: ltp,
    volume: 0,
    ts,
  };
}
