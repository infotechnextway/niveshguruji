import {
  indexSymbolToUnderlyingKey,
  isUpstoxInstrumentKey,
  resolveOptionUnderlyingKey,
} from '../infrastructure/option-underlying';

describe('option-underlying', () => {
  it('detects Upstox keys', () => {
    expect(isUpstoxInstrumentKey('NSE_INDEX|Nifty 50')).toBe(true);
    expect(isUpstoxInstrumentKey('NSE_EQ|INE002A01018')).toBe(true);
    expect(isUpstoxInstrumentKey('DHAN|IDX_I|89631')).toBe(false);
  });

  it('maps index symbols to NSE_INDEX underlying keys', () => {
    expect(indexSymbolToUnderlyingKey('NIFTY 50')).toBe('NSE_INDEX|Nifty 50');
    expect(indexSymbolToUnderlyingKey('BANKNIFTY')).toBe('NSE_INDEX|Nifty Bank');
  });

  it('resolves DHAN index keys via symbol', () => {
    expect(resolveOptionUnderlyingKey('DHAN|IDX_I|89631', {
      instrumentKey: 'DHAN|IDX_I|89631',
      symbol: 'NIFTY 50',
      exchange: 'NSE',
      segment: 'INDEX',
    })).toBe('NSE_INDEX|Nifty 50');
  });

  it('passes through Upstox index keys', () => {
    expect(resolveOptionUnderlyingKey('NSE_INDEX|Nifty 50', {
      instrumentKey: 'NSE_INDEX|Nifty 50',
      symbol: 'NIFTY 50',
      exchange: 'NSE',
      segment: 'INDEX',
    })).toBe('NSE_INDEX|Nifty 50');
  });

  it('uses explicit underlyingKey on FO legs', () => {
    expect(resolveOptionUnderlyingKey('NSE_FO|65697', {
      instrumentKey: 'NSE_FO|65697',
      symbol: 'NIFTY 24100 CE',
      exchange: 'NSE',
      segment: 'FO',
      underlyingKey: 'NSE_INDEX|Nifty 50',
    })).toBe('NSE_INDEX|Nifty 50');
  });
});
