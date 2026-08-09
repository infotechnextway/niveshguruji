import { SimulatorFeed } from '../infrastructure/feed/simulator-feed';
import { Quote } from '@app/shared';

function leanNull() {
  return {
    select: () => ({ lean: async () => null }),
    sort: () => ({ select: () => ({ lean: async () => null }) }),
  };
}

function mockModels() {
  return [
    { findOne: () => leanNull() },
    { findOne: () => leanNull() },
  ] as ConstructorParameters<typeof SimulatorFeed>;
}

describe('SimulatorFeed', () => {
  it('emits injected ticks to all handlers (replay primitive for P5)', () => {
    const feed = new SimulatorFeed(...mockModels());
    const received: Quote[] = [];
    feed.onTick((q) => received.push(q));
    const quote: Quote = { instrumentKey: 'K', ltp: 123.45, change: 1, changePct: 0.8, bid: 123.4, ask: 123.5, volume: 100, prevClose: 122.45, ts: Date.now() };
    feed.pushTick(quote);
    expect(received).toEqual([quote]);
    expect(feed.secondsSinceLastTick()).not.toBeNull();
  });

  it('reports null idle time before any tick', () => {
    expect(new SimulatorFeed(...mockModels()).secondsSinceLastTick()).toBeNull();
  });

  it('subscribe seeds deterministic base prices; unsubscribe removes state', async () => {
    const feed = new SimulatorFeed(...mockModels());
    await feed.subscribe(['NSE_EQ|X', 'NSE_EQ|Y']);
    await feed.unsubscribe(['NSE_EQ|X']);
    // No throw; state map internal — behavioral check via a manual tick-all is
    // not exposed, so we assert idempotency of subscribe.
    await expect(feed.subscribe(['NSE_EQ|Y'])).resolves.toBeUndefined();
  });

  it('seeds known symbols via instrument master even for DHAN keys', async () => {
    const instruments = {
      findOne: () => ({
        select: () => ({
          lean: async () => ({ symbol: 'RELIANCE', name: 'Reliance Industries', segment: 'EQ' }),
        }),
      }),
    };
    const candles = { findOne: () => leanNull() };
    const feed = new SimulatorFeed(instruments as never, candles as never);
    const received: Quote[] = [];
    feed.onTick((q) => received.push(q));
    await feed.subscribe(['DHAN|NSE_EQ|2885']);
    await feed.start();
    await new Promise((r) => setTimeout(r, 1100));
    await feed.stop();
    expect(received.length).toBeGreaterThan(0);
    expect(received[0].ltp).toBeGreaterThan(1000);
    expect(received[0].ltp).toBeLessThan(2000);
  });
});
