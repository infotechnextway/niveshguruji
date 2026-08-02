import { SimulatorFeed } from '../infrastructure/feed/simulator-feed';
import { CandleAggregator } from '../domain/candle-aggregator';
import { Quote, quoteCacheKey, quoteChannel } from '@app/shared';

/**
 * Wires the real SimulatorFeed to a hand-rolled version of the ingestion
 * pipeline's core (cache write + fan-out + candle aggregation) to prove the
 * data path end to end without Mongo/Redis. This mirrors MarketDataService.handleTick.
 */
describe('Market data pipeline (in-process smoke)', () => {
  it('caches last quote, fans out on the right channel, and aggregates candles', async () => {
    const feed = new SimulatorFeed();
    const cache = new Map<string, string>();
    const published: Array<{ channel: string; quote: Quote }> = [];
    const agg = new CandleAggregator();
    const completedBars: unknown[] = [];

    feed.onTick((q) => {
      cache.set(quoteCacheKey(q.instrumentKey), JSON.stringify(q));
      published.push({ channel: quoteChannel(q.instrumentKey), quote: q });
      const bar = agg.add(q);
      if (bar) completedBars.push(bar);
    });

    const base = Date.now();
    // Two ticks in minute 0, one in minute 1 → exactly one completed bar.
    feed.pushTick(mk('NSE_INDEX|Nifty 50', 22000, base));
    feed.pushTick(mk('NSE_INDEX|Nifty 50', 22010, base + 5_000));
    feed.pushTick(mk('NSE_INDEX|Nifty 50', 22020, base + 61_000));

    expect(cache.get(quoteCacheKey('NSE_INDEX|Nifty 50'))).toBeDefined();
    expect(JSON.parse(cache.get(quoteCacheKey('NSE_INDEX|Nifty 50'))!).ltp).toBe(22020);
    expect(published).toHaveLength(3);
    expect(published[0].channel).toBe('quotes.NSE_INDEX|Nifty 50');
    expect(completedBars).toHaveLength(1);
    expect((completedBars[0] as { o: number; c: number }).o).toBe(22000);
    expect((completedBars[0] as { c: number }).c).toBe(22010);
  });
});

function mk(key: string, ltp: number, ts: number): Quote {
  return { instrumentKey: key, ltp, change: 0, changePct: 0, bid: ltp, ask: ltp, volume: 0, prevClose: ltp, ts };
}
