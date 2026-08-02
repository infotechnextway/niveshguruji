import { computeChargesPaise, limitFillPricePaise, marketFillPricePaise } from '../domain/fill-model';
import { Quote } from '@app/shared';

function q(bid: number, ask: number, ltp = (bid + ask) / 2): Quote {
  return { instrumentKey: 'K', ltp, change: 0, changePct: 0, bid, ask, volume: 0, prevClose: ltp, ts: Date.now() };
}

describe('Fill model', () => {
  it('market buy lifts the ask, sell hits the bid', () => {
    expect(marketFillPricePaise(q(99.5, 100.5), 'BUY', 0)).toBe(100_50);
    expect(marketFillPricePaise(q(99.5, 100.5), 'SELL', 0)).toBe(99_50);
  });

  it('slippage widens against the taker', () => {
    // 100 bps = 1%
    expect(marketFillPricePaise(q(100, 100), 'BUY', 100)).toBe(100_00 + 100); // +1% of 10000
    expect(marketFillPricePaise(q(100, 100), 'SELL', 100)).toBe(100_00 - 100);
  });

  it('limit buy fills only when ask ≤ limit', () => {
    expect(limitFillPricePaise(q(99, 100), 'BUY', 100_00)).toBe(100_00); // ask 100 ≤ 100
    expect(limitFillPricePaise(q(100.5, 101), 'BUY', 100_00)).toBeNull(); // ask 101 > 100
  });

  it('limit sell fills only when bid ≥ limit', () => {
    expect(limitFillPricePaise(q(100, 101), 'SELL', 100_00)).toBe(100_00); // bid 100 ≥ 100
    expect(limitFillPricePaise(q(99, 99.5), 'SELL', 100_00)).toBeNull();
  });

  it('charges = flat + turnover bps', () => {
    expect(computeChargesPaise(100_00, 10, { flatPerOrderPaise: 0, turnoverBps: 0 })).toBe(0);
    expect(computeChargesPaise(100_00, 10, { flatPerOrderPaise: 2000, turnoverBps: 0 })).toBe(2000);
    // turnover 10000 paise * 10 = 100,000 paise; 3 bps = 30
    expect(computeChargesPaise(100_00, 10, { flatPerOrderPaise: 0, turnoverBps: 3 })).toBe(30);
  });
});
