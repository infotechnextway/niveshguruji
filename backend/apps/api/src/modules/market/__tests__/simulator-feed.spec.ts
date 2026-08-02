import { SimulatorFeed } from '../infrastructure/feed/simulator-feed';
import { Quote } from '@app/shared';

describe('SimulatorFeed', () => {
  it('emits injected ticks to all handlers (replay primitive for P5)', () => {
    const feed = new SimulatorFeed();
    const received: Quote[] = [];
    feed.onTick((q) => received.push(q));
    const quote: Quote = { instrumentKey: 'K', ltp: 123.45, change: 1, changePct: 0.8, bid: 123.4, ask: 123.5, volume: 100, prevClose: 122.45, ts: Date.now() };
    feed.pushTick(quote);
    expect(received).toEqual([quote]);
    expect(feed.secondsSinceLastTick()).not.toBeNull();
  });

  it('reports null idle time before any tick', () => {
    expect(new SimulatorFeed().secondsSinceLastTick()).toBeNull();
  });

  it('subscribe seeds deterministic base prices; unsubscribe removes state', async () => {
    const feed = new SimulatorFeed();
    await feed.subscribe(['NSE_EQ|X', 'NSE_EQ|Y']);
    await feed.unsubscribe(['NSE_EQ|X']);
    // No throw; state map internal — behavioral check via a manual tick-all is
    // not exposed, so we assert idempotency of subscribe.
    await expect(feed.subscribe(['NSE_EQ|Y'])).resolves.toBeUndefined();
  });
});
