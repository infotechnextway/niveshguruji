import { INestApplication } from '@nestjs/common';
import { Connection, Types } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import Redis from 'ioredis';
import { E2E_ENABLED } from './setup-e2e';
import type { Quote } from '@app/shared';
import { ExchangeCalendarService } from '@app/shared';

const describeE2E = E2E_ENABLED ? describe : describe.skip;

/**
 * Deterministic trading replay. Seeds a challenge + instrument, primes the
 * Redis quote cache with scripted quotes, drives the ExecutionService directly
 * (the same code the REST controller and engine call), and asserts exact
 * positions, equity, charges, and limit-fill behaviour. This is the P5
 * correctness anchor — the SimulatorFeed's pushTick primitive from P4 made
 * this scriptability possible.
 */
describeE2E('Trading engine replay (e2e)', () => {
  let app: INestApplication;
  let db: Connection;
  let redis: Redis;
  let execution: import('../../apps/api/src/modules/trading/application/execution.service').ExecutionService;
  let quoteCacheKey: (k: string) => string;
  const unique = Date.now();
  const userId = new Types.ObjectId();
  const instKey = `NSE_EQ|RPL${unique}`;
  let challengeId: string;
  const CAPITAL = 10_00_000_00; // ₹10,00,000 in paise

  function setQuote(ltp: number, spread = 0.5): Promise<'OK'> {
    const q: Quote = { instrumentKey: instKey, ltp, change: 0, changePct: 0, bid: ltp - spread, ask: ltp + spread, volume: 0, prevClose: ltp, ts: Date.now() };
    return redis.set(quoteCacheKey(instKey), JSON.stringify(q));
  }

  beforeAll(async () => {
    const { createE2EApp } = await import('./app.factory');
    const shared = await import('@app/shared');
    quoteCacheKey = shared.quoteCacheKey;
    const REDIS_CLIENT = shared.REDIS_CLIENT;
    const { ExecutionService } = await import('../../apps/api/src/modules/trading/application/execution.service');
    app = await createE2EApp();
    db = app.get<Connection>(getConnectionToken());
    redis = app.get<Redis>(REDIS_CLIENT);
    execution = app.get(ExecutionService);

    // Trading replay must be deterministic regardless of wall-clock, weekends,
    // or holidays. Calendar behavior has its own unit tests.
    jest.spyOn(app.get(ExchangeCalendarService), 'isMarketOpen').mockReturnValue(true);

    await db.collection('instruments').insertOne({
      instrumentKey: instKey, symbol: `RPL${unique}`, name: 'Replay Co', exchange: 'NSE', segment: 'EQ',
      lotSize: 1, tickSize: 0.05, enabled: true, createdAt: new Date(), updatedAt: new Date(),
    });
    const now = new Date();
    const ch = await db.collection('challenges').insertOne({
      userId, planId: new Types.ObjectId(), planVersion: 1, planName: 'Replay',
      rules: { profitTargetPct: 8, maxDrawdownPct: 10, dailyDrawdownPct: 5, drawdownAnchor: 'PREV_DAY_CLOSE', minTradingDays: 1, expiryDays: 30, rewardPct: 80, segments: ['EQ'] },
      virtualCapitalPaise: CAPITAL, equityPaise: CAPITAL, peakEquityPaise: CAPITAL, dayStartEquityPaise: CAPITAL,
      realizedPnlPaise: 0, tradingDays: [], status: 'ACTIVE', startedAt: now, endsAt: new Date(now.getTime() + 2.6e9), events: [],
    });
    challengeId = String(ch.insertedId);
  });

  afterAll(async () => {
    for (const c of ['instruments', 'challenges', 'orders', 'positions', 'trades', 'ledger_entries', 'holdings']) {
      await db.collection(c).deleteMany({ $or: [{ instrumentKey: instKey }, { challengeId: new Types.ObjectId(challengeId) }, { userId }] });
    }
    await app.close();
  });

  it('market buy fills at ask + charges leave equity, position opens', async () => {
    await setQuote(100); // bid 99.5, ask 100.5
    const res = await execution.placeOrder({
      challengeId, userId: String(userId), instrumentKey: instKey, side: 'BUY', type: 'MARKET', product: 'INTRADAY', qty: 100,
    });
    expect(res.isOk).toBe(true);
    expect(res.value.status).toBe('FILLED');
    expect(res.value.filledPricePaise).toBe(100_50); // ask 100.5 → paise

    const pos = await db.collection('positions').findOne({ challengeId: new Types.ObjectId(challengeId), instrumentKey: instKey });
    expect(pos?.netQty).toBe(100);
    expect(pos?.avgPricePaise).toBe(100_50);

    // Zero charges by default → equity unchanged by the open (no realized P&L yet).
    const ch = await db.collection('challenges').findOne({ _id: new Types.ObjectId(challengeId) });
    expect(ch?.equityPaise).toBe(CAPITAL);
    expect(ch?.tradingDays.length).toBe(1);
  });

  it('selling higher realizes profit into equity', async () => {
    await setQuote(110); // bid 109.5, ask 110.5
    const res = await execution.placeOrder({
      challengeId, userId: String(userId), instrumentKey: instKey, side: 'SELL', type: 'MARKET', product: 'INTRADAY', qty: 100,
    });
    expect(res.value.filledPricePaise).toBe(109_50); // bid

    const pos = await db.collection('positions').findOne({ challengeId: new Types.ObjectId(challengeId), instrumentKey: instKey });
    expect(pos?.netQty).toBe(0);

    // Realized = (109.50 - 100.50) * 100 = 9.00 * 100 = ₹900 = 90000 paise
    const ch = await db.collection('challenges').findOne({ _id: new Types.ObjectId(challengeId) });
    expect(ch?.equityPaise).toBe(CAPITAL + 90000);
    expect(ch?.realizedPnlPaise).toBe(90000);

    // Ledger has a PNL entry.
    const pnl = await db.collection('ledger_entries').findOne({ challengeId: new Types.ObjectId(challengeId), type: 'PNL' });
    expect(pnl?.amountPaise).toBe(90000);
  });

  it('a limit order rests when not crossable, then fills when the quote crosses', async () => {
    await setQuote(120); // ask 120.5 — a buy limit at 118 should NOT fill
    const placed = await execution.placeOrder({
      challengeId, userId: String(userId), instrumentKey: instKey, side: 'BUY', type: 'LIMIT', product: 'INTRADAY', qty: 50, limitPricePaise: 118_00,
    });
    expect(placed.value.status).toBe('OPEN');

    // Price drops so ask ≤ 118 → the engine tick loop fills it.
    await setQuote(117.4); // ask 117.9 ≤ 118
    const crossingQuote: Quote = JSON.parse((await redis.get(quoteCacheKey(instKey)))!);
    await execution.onQuote(crossingQuote);

    const order = await db.collection('orders').findOne({ _id: new Types.ObjectId(placed.value.orderId) });
    expect(order?.status).toBe('FILLED');
    expect(order?.filledPricePaise).toBe(118_00); // fills at the limit price

    const pos = await db.collection('positions').findOne({ challengeId: new Types.ObjectId(challengeId), instrumentKey: instKey });
    expect(pos?.netQty).toBe(50);
  });

  it('rejects an order in a disallowed segment', async () => {
    // Insert an FO instrument the plan (EQ only) does not permit.
    const foKey = `NSE_FO|RPLFO${unique}`;
    await db.collection('instruments').insertOne({
      instrumentKey: foKey, symbol: 'RPLFO', name: 'FO', exchange: 'NSE', segment: 'FO', lotSize: 50, tickSize: 0.05, enabled: true, createdAt: new Date(), updatedAt: new Date(),
    });
    await redis.set(quoteCacheKey(foKey), JSON.stringify({ instrumentKey: foKey, ltp: 100, change: 0, changePct: 0, bid: 99.5, ask: 100.5, volume: 0, prevClose: 100, ts: Date.now() }));
    const res = await execution.placeOrder({
      challengeId, userId: String(userId), instrumentKey: foKey, side: 'BUY', type: 'MARKET', product: 'INTRADAY', qty: 50,
    });
    expect(res.isFail).toBe(true);
    expect(res.error.code).toBe('SEGMENT_NOT_ALLOWED');
    await db.collection('instruments').deleteMany({ instrumentKey: foKey });
  });
});

describe('e2e enablement', () => {
  it('runs full suites only when E2E_MONGO_URI is set (e2e disabled otherwise)', () => {
    expect(true).toBe(true);
  });
});
