import { parseDhanInstrumentKey } from '../infrastructure/feed/dhan-feed';

describe('parseDhanInstrumentKey', () => {
  it('parses equity and index DHAN catalog keys', () => {
    expect(parseDhanInstrumentKey('DHAN|NSE_EQ|2885')).toEqual({
      exchangeSegment: 'NSE_EQ',
      securityId: '2885',
    });
    expect(parseDhanInstrumentKey('DHAN|IDX_I|13')).toEqual({
      exchangeSegment: 'IDX_I',
      securityId: '13',
    });
  });

  it('rejects non-DHAN keys', () => {
    expect(parseDhanInstrumentKey('NSE_EQ|INE002A01018')).toBeNull();
    expect(parseDhanInstrumentKey('DHAN|NSE_EQ')).toBeNull();
  });
});
