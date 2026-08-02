import {
  compareCatalogBrowse,
  NIFTY_50_SYMBOLS,
  INDEX_PRIORITY_SYMBOLS,
} from '../infrastructure/catalog-priority';

describe('catalog-priority', () => {
  it('NIFTY 50 list has ~50 large-cap symbols', () => {
    expect(NIFTY_50_SYMBOLS.length).toBeGreaterThanOrEqual(48);
    expect(NIFTY_50_SYMBOLS.length).toBeLessThanOrEqual(55);
    expect(NIFTY_50_SYMBOLS[0]).toBe('RELIANCE');
    expect(NIFTY_50_SYMBOLS.slice(0, 5)).toEqual([
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
    ]);
  });

  it('compareCatalogBrowse pins NIFTY 50 EQ before obscure codes', () => {
    const rows = [
      { symbol: '011NSETEST', instrumentKey: 'NSE_EQ|test1' },
      { symbol: 'RELIANCE', instrumentKey: 'NSE_EQ|reliance' },
      { symbol: 'TCS', instrumentKey: 'NSE_EQ|tcs' },
      { symbol: 'ZZZZOBSCURE', instrumentKey: 'NSE_EQ|zz' },
    ];
    const sorted = [...rows].sort((a, b) => compareCatalogBrowse(a, b, 'EQ'));
    expect(sorted.slice(0, 2).map((r) => r.symbol)).toEqual(['RELIANCE', 'TCS']);
    expect(sorted[sorted.length - 1].symbol).toBe('ZZZZOBSCURE');
  });

  it('compareCatalogBrowse pins NIFTY 50 / BANKNIFTY indices first', () => {
    const rows = [
      { symbol: 'NIFTY 500', instrumentKey: 'NSE_INDEX|Nifty 500' },
      { symbol: 'BANKNIFTY', instrumentKey: 'NSE_INDEX|Nifty Bank' },
      { symbol: 'NIFTY 50', instrumentKey: 'NSE_INDEX|Nifty 50' },
      { symbol: 'AAAINDEX', instrumentKey: 'NSE_INDEX|AAA' },
    ];
    const sorted = [...rows].sort((a, b) => compareCatalogBrowse(a, b, 'INDEX'));
    expect(sorted[0].symbol).toBe('NIFTY 50');
    expect(sorted[1].symbol).toBe('BANKNIFTY');
    expect(INDEX_PRIORITY_SYMBOLS).toContain('NIFTY 50');
    expect(INDEX_PRIORITY_SYMBOLS).toContain('BANKNIFTY');
  });
});
