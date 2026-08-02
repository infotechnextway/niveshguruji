import { CandleAggregator, minuteBucket } from '../domain/candle-aggregator';
import { Quote } from '@app/shared';

function tick(key: string, ltp: number, ts: number, volume = 0): Quote {
  return { instrumentKey: key, ltp, change: 0, changePct: 0, bid: ltp, ask: ltp, volume, prevClose: ltp, ts };
}

const T0 = 1_700_000_000_000; // some minute-aligned-ish base
const M0 = minuteBucket(T0);

describe('CandleAggregator (pure 1m OHLCV)', () => {
  it('aligns timestamps to the minute', () => {
    expect(minuteBucket(M0 + 5_000)).toBe(M0);
    expect(minuteBucket(M0 + 59_999)).toBe(M0);
    expect(minuteBucket(M0 + 60_000)).toBe(M0 + 60_000);
  });

  it('does not emit until a new minute begins', () => {
    const agg = new CandleAggregator();
    expect(agg.add(tick('K', 100, M0 + 1000))).toBeNull();
    expect(agg.add(tick('K', 105, M0 + 2000))).toBeNull();
    expect(agg.add(tick('K', 95, M0 + 3000))).toBeNull();
  });

  it('emits the completed bar with correct OHLC when the minute rolls', () => {
    const agg = new CandleAggregator();
    agg.add(tick('K', 100, M0 + 1000, 10)); // open
    agg.add(tick('K', 110, M0 + 2000, 40)); // high
    agg.add(tick('K', 90, M0 + 3000, 70)); // low
    agg.add(tick('K', 105, M0 + 4000, 100)); // close of minute 0
    const bar = agg.add(tick('K', 106, M0 + 61_000, 120)); // crosses into minute 1
    expect(bar).not.toBeNull();
    expect(bar).toMatchObject({ instrumentKey: 'K', ts: M0, o: 100, h: 110, l: 90, c: 105, v: 100 });
  });

  it('tracks instruments independently', () => {
    const agg = new CandleAggregator();
    agg.add(tick('A', 100, M0 + 1000));
    agg.add(tick('B', 200, M0 + 1000));
    const aBar = agg.add(tick('A', 101, M0 + 61_000));
    expect(aBar?.instrumentKey).toBe('A');
    expect(aBar?.o).toBe(100);
    // B has not rolled yet
    expect(agg.add(tick('B', 201, M0 + 2000))).toBeNull();
  });

  it('flush force-closes all open bars', () => {
    const agg = new CandleAggregator();
    agg.add(tick('A', 100, M0 + 1000));
    agg.add(tick('B', 200, M0 + 1000));
    const flushed = agg.flush();
    expect(flushed).toHaveLength(2);
    expect(agg.flush()).toHaveLength(0);
  });
});
