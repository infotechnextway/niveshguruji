import {
  formatExpiry, mapUpstoxInstrument, normalizeTickSize,
} from '../infrastructure/instrument-mapper';
import { normalizeFeeds } from '../infrastructure/feed/upstox-protobuf';
import { parseCandles } from '../infrastructure/upstox-history.client';

describe('mapUpstoxInstrument', () => {
  it('maps NSE equity rows', () => {
    const doc = mapUpstoxInstrument({
      instrument_key: 'NSE_EQ|INE002A01018',
      trading_symbol: 'RELIANCE',
      name: 'Reliance Industries',
      exchange: 'NSE',
      segment: 'NSE_EQ',
      instrument_type: 'EQ',
      lot_size: 1,
      tick_size: 5,
      freeze_quantity: 100000,
    });
    expect(doc).toMatchObject({
      instrumentKey: 'NSE_EQ|INE002A01018',
      symbol: 'RELIANCE',
      exchange: 'NSE',
      segment: 'EQ',
      tickSize: 0.05,
      enabled: true,
    });
  });

  it('maps index + FO option with inferred underlying', () => {
    const opt = mapUpstoxInstrument({
      instrument_key: 'NSE_FO|NIFTY25AUG22000CE',
      trading_symbol: 'NIFTY 22000 CE',
      name: 'NIFTY',
      exchange: 'NSE',
      segment: 'NSE_FO',
      instrument_type: 'CE',
      lot_size: 75,
      tick_size: 5,
      strike_price: 22000,
      expiry: '2025-08-28',
    });
    expect(opt).toMatchObject({
      segment: 'FO',
      optType: 'CE',
      strike: 22000,
      expiry: '2025-08-28',
      underlyingKey: 'NSE_INDEX|Nifty 50',
    });
  });

  it('skips MF / MCX segments', () => {
    expect(mapUpstoxInstrument({
      instrument_key: 'NSE_MF|X', segment: 'NSE_MF', exchange: 'NSE', trading_symbol: 'X',
    })).toBeNull();
    expect(mapUpstoxInstrument({
      instrument_key: 'MCX_FO|X', segment: 'MCX_FO', exchange: 'MCX', trading_symbol: 'X',
    })).toBeNull();
  });

  it('normalizes tick and expiry helpers', () => {
    expect(normalizeTickSize(5)).toBe(0.05);
    expect(normalizeTickSize(0.05)).toBe(0.05);
    expect(formatExpiry('2026-01-15T00:00:00Z')).toBe('2026-01-15');
    expect(formatExpiry(1_700_000_000_000)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('parseCandles (Upstox history)', () => {
  it('parses candle arrays into HistoryCandle', () => {
    const bars = parseCandles({
      data: {
        candles: [
          ['2024-01-02T09:15:00+05:30', 100, 110, 95, 105, 1000, 0],
          [1_700_000_000_000, 105, 106, 104, 105.5, 200],
        ],
      },
    });
    expect(bars).toHaveLength(2);
    expect(bars[1]).toMatchObject({ t: 1_700_000_000_000, o: 105, h: 106, l: 104, c: 105.5, v: 200 });
  });
});

describe('normalizeFeeds (protobuf / JSON feed)', () => {
  it('extracts LTPC from fullFeed.marketFF', () => {
    const quotes = normalizeFeeds({
      'NSE_EQ|INE002A01018': {
        fullFeed: {
          marketFF: {
            ltpc: { ltp: 2900, cp: 2880 },
            marketLevel: { bidAskQuote: [{ bidP: 2899.5, askP: 2900.5 }] },
            vtt: 12345,
          },
        },
      },
    }, 1_700_000_000_000);
    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({
      instrumentKey: 'NSE_EQ|INE002A01018',
      ltp: 2900,
      prevClose: 2880,
      change: 20,
      bid: 2899.5,
      ask: 2900.5,
      volume: 12345,
    });
  });

  it('handles indexFF and bare ltpc', () => {
    const quotes = normalizeFeeds({
      'NSE_INDEX|Nifty 50': { fullFeed: { indexFF: { ltpc: { ltp: 22000, cp: 21900 } } } },
      'NSE_EQ|X': { ltpc: { ltp: 10, cp: 10 } },
    });
    expect(quotes).toHaveLength(2);
    expect(quotes[0].ltp).toBe(22000);
    expect(quotes[1].change).toBe(0);
  });
});
