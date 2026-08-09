/**
 * Realistic reference closes for indices and liquid names — used to seed the
 * simulator and as a last-resort quote/candle fallback when live/history is
 * unavailable (market closed, no broker token, etc.).
 *
 * Levels refreshed Aug 2026 (post Reliance bonus-issue era). Keep roughly in
 * line with cash-market closes so simulator / stale-quote guards stay sane.
 */
import type { Quote } from './market.types';

/** Canonical Upstox-style instrument_key → rupees. */
export const REFERENCE_CLOSES: Record<string, number> = {
  'NSE_INDEX|Nifty 50': 24_855,
  'NSE_INDEX|Nifty Bank': 57_840,
  'NSE_INDEX|Nifty Fin Service': 26_400,
  'NSE_EQ|INE002A01018': 1_330, // RELIANCE (post 1:1 bonus)
  'NSE_EQ|INE467B01029': 2_430, // TCS
  'NSE_EQ|INE040A01034': 734, // HDFCBANK (post split)
  'NSE_EQ|INE009A01021': 1_174, // INFY
  'NSE_EQ|INE090A01021': 1_441, // ICICIBANK
};

/** Symbol / display-name aliases → rupees (helps DHAN|… keys & loose lookups). */
const SYMBOL_CLOSES: Record<string, number> = {
  'NIFTY 50': 24_855,
  'Nifty 50': 24_855,
  NIFTY: 24_855,
  BANKNIFTY: 57_840,
  'Nifty Bank': 57_840,
  FINNIFTY: 26_400,
  'Nifty Fin Service': 26_400,
  RELIANCE: 1_330,
  TCS: 2_430,
  HDFCBANK: 734,
  INFY: 1_174,
  ICICIBANK: 1_441,
};

/** Lookup a reference close (rupees) for an instrument key / symbol, or null if unknown. */
export function referenceClose(instrumentKey: string): number | null {
  if (REFERENCE_CLOSES[instrumentKey] != null) return REFERENCE_CLOSES[instrumentKey];

  const parts = instrumentKey.split('|');
  const tail = parts[parts.length - 1]?.trim();
  if (tail && SYMBOL_CLOSES[tail] != null) return SYMBOL_CLOSES[tail];
  if (SYMBOL_CLOSES[instrumentKey] != null) return SYMBOL_CLOSES[instrumentKey];

  // e.g. "NSE_INDEX|Nifty 50" already handled; also match embedded symbols.
  const upper = instrumentKey.toUpperCase();
  for (const [sym, px] of Object.entries(SYMBOL_CLOSES)) {
    const token = sym.toUpperCase();
    if (upper === token || upper.endsWith(`|${token}`) || upper.includes(`|${token}|`)) {
      return px;
    }
  }
  return null;
}

/** Prefer exact instrument_key, then trading symbol / display name (covers DHAN|… keys). */
export function referenceCloseFor(parts: {
  instrumentKey: string;
  symbol?: string | null;
  name?: string | null;
}): number | null {
  return (
    referenceClose(parts.instrumentKey)
    ?? (parts.symbol ? referenceClose(parts.symbol) : null)
    ?? (parts.name ? referenceClose(parts.name) : null)
  );
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
