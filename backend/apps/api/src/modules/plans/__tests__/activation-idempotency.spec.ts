import { Types } from 'mongoose';
import { PurchaseService } from '../application/purchase.service';
import { PaymentStatus, ChallengeStatus } from '../domain/plan.types';

/** In-memory serial lock matching RedisLockService.withLock semantics. */
class FakeLock {
  private chains = new Map<string, Promise<unknown>>();
  async withLock<T>(key: string, _ttl: number, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => (release = r));
    this.chains.set(key, prev.then(() => gate));
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

function buildHarness() {
  const planId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const plan = {
    _id: planId, version: 2, name: 'Starter', virtualCapitalPaise: 10_000_00,
    rules: { profitTargetPct: 8, maxDrawdownPct: 10, dailyDrawdownPct: 5, drawdownAnchor: 'PREV_DAY_CLOSE', minTradingDays: 1, expiryDays: 30, rewardPct: 80, segments: ['EQ'] },
  };
  const paymentDoc: Record<string, unknown> = {
    _id: new Types.ObjectId(), userId, planId, amountPaise: 500_00,
    status: PaymentStatus.CREATED, gatewayOrderId: 'order_1', provider: 'manual',
    save: async function () { return this; },
  };

  const challengesCreated: unknown[] = [];
  const subsCreated: unknown[] = [];
  const ledgerCreated: unknown[] = [];

  const svc = new PurchaseService(
    { findById: () => ({ lean: async () => plan }) } as never, // plans
    { findOne: async () => paymentDoc } as never, // payments
    { create: async (d: unknown) => { const s = { _id: new Types.ObjectId(), ...(d as object) }; subsCreated.push(s); return s; } } as never, // subscriptions
    { create: async (d: unknown) => { const c = { _id: new Types.ObjectId(), ...(d as object) }; challengesCreated.push(c); return c; } } as never, // challenges
    { create: async (d: unknown) => { ledgerCreated.push(d); return d; } } as never, // ledger
    {} as never, // users
    {} as never, // gateway
    new FakeLock() as never, // locks
    {} as never, // appConfig
    { record: async () => undefined } as never, // audit
    { publish: async () => undefined } as never, // bus
  );

  return { svc, paymentDoc, challengesCreated, subsCreated, ledgerCreated };
}

describe('Idempotent plan activation (exactly-once crediting)', () => {
  it('concurrent checkout + webhook credit virtual capital exactly once', async () => {
    const { svc, paymentDoc, challengesCreated, ledgerCreated } = buildHarness();

    // Fire both activation paths concurrently against the same order.
    const [a, b] = await Promise.all([
      (svc as unknown as { activate: (o: string, p: string, c: object) => Promise<{ isOk: boolean; value: { challengeId: string } }> })
        .activate('order_1', 'pay_checkout', { source: 'checkout' }),
      (svc as unknown as { activate: (o: string, p: string, c: object) => Promise<{ isOk: boolean; value: { challengeId: string } }> })
        .activate('order_1', 'pay_webhook', { source: 'webhook' }),
    ]);

    expect(a.isOk && b.isOk).toBe(true);
    // Exactly one challenge, one ledger CREDIT — despite two concurrent calls.
    expect(challengesCreated).toHaveLength(1);
    expect(ledgerCreated).toHaveLength(1);
    expect((ledgerCreated[0] as { type: string; amountPaise: number }).type).toBe('CREDIT');
    expect((ledgerCreated[0] as { amountPaise: number }).amountPaise).toBe(10_000_00);
    expect(paymentDoc.status).toBe(PaymentStatus.ACTIVATED);
    // Both calls resolve to the same challenge id.
    expect(a.value.challengeId).toBe(b.value.challengeId);
  });

  it('a third late activation is a no-op returning the same challenge', async () => {
    const { svc, challengesCreated } = buildHarness();
    const activate = (svc as unknown as { activate: (o: string, p: string, c: object) => Promise<{ isOk: boolean; value: { challengeId: string } }> }).activate.bind(svc);
    const first = await activate('order_1', 'pay_1', { source: 'checkout' });
    const second = await activate('order_1', 'pay_1', { source: 'webhook' });
    expect(challengesCreated).toHaveLength(1);
    expect(first.value.challengeId).toBe(second.value.challengeId);
  });

  it('snapshots plan rules and version into the challenge', async () => {
    const { svc, challengesCreated } = buildHarness();
    await (svc as unknown as { activate: (o: string, p: string, c: object) => Promise<unknown> }).activate('order_1', 'pay_1', { source: 'checkout' });
    const ch = challengesCreated[0] as { planVersion: number; rules: { profitTargetPct: number }; status: string; equityPaise: number };
    expect(ch.planVersion).toBe(2);
    expect(ch.rules.profitTargetPct).toBe(8);
    expect(ch.status).toBe(ChallengeStatus.PENDING);
    expect(ch.equityPaise).toBe(10_000_00);
  });
});
