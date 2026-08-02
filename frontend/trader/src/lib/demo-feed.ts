'use client';
import type { Quote, Instrument } from './types';

/**
 * Tiny static instrument list for non-terminal demo pages (dashboard/holdings
 * sample tables). Live quotes come from the /ws quote-store — this module no
 * longer drives the trading terminal.
 */
export const DEMO_INSTRUMENTS: Instrument[] = [
  { instrumentKey: 'NSE_INDEX|Nifty 50', symbol: 'NIFTY 50', name: 'Nifty 50', exchange: 'NSE', segment: 'INDEX', lotSize: 1 },
  { instrumentKey: 'NSE_INDEX|Nifty Bank', symbol: 'BANKNIFTY', name: 'Nifty Bank', exchange: 'NSE', segment: 'INDEX', lotSize: 1 },
  { instrumentKey: 'NSE_EQ|INE002A01018', symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', segment: 'EQ', lotSize: 1 },
  { instrumentKey: 'NSE_EQ|INE467B01029', symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', segment: 'EQ', lotSize: 1 },
  { instrumentKey: 'NSE_EQ|INE040A01034', symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', segment: 'EQ', lotSize: 1 },
  { instrumentKey: 'NSE_EQ|INE009A01021', symbol: 'INFY', name: 'Infosys', exchange: 'NSE', segment: 'EQ', lotSize: 1 },
  { instrumentKey: 'NSE_EQ|INE090A01021', symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE', segment: 'EQ', lotSize: 1 },
];

/** @deprecated Terminal no longer uses synthetic ticks; kept for offline unit fixtures. */
export function demoQuote(key: string): Quote {
  const base = 1000;
  return {
    instrumentKey: key, ltp: base, change: 0, changePct: 0,
    bid: base, ask: base, volume: 0, prevClose: base, ts: Date.now(),
  };
}
