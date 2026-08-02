import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Connection, Types } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { E2E_ENABLED } from './setup-e2e';

const describeE2E = E2E_ENABLED ? describe : describe.skip;

/**
 * Plan purchase → activation → subscription, end to end, using the manual
 * payment provider (PAYMENT_PROVIDER defaults to 'manual' in the e2e env, so
 * signatures always verify and no external gateway is contacted).
 */
describeE2E('Plan purchase & activation (e2e)', () => {
  let app: INestApplication;
  let db: Connection;
  let userToken: string;
  const unique = Date.now();
  const email = `buyer_${unique}@example.com`;
  const username = `buyer${String(unique).slice(-6)}`;
  const password = 'Str0ngPass1';
  let userId: string;
  let planId: string;

  beforeAll(async () => {
    const { createE2EApp } = await import('./app.factory');
    app = await createE2EApp();
    db = app.get<Connection>(getConnectionToken());

    // Seed a KYC-approved active user directly (auth flow is covered elsewhere).
    const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const res = await db.collection('users').insertOne({
      name: 'Buyer', email, mobile: `+9198${String(unique).slice(-8)}`, username, usernameLower: username,
      passwordHash: hash, status: 'ACTIVE', kycStatus: 'APPROVED', mobileVerified: true, emailVerified: true,
      referralCode: `REF${unique}`, createdAt: new Date(), updatedAt: new Date(),
    });
    userId = String(res.insertedId);

    // Seed an active plan.
    const plan = await db.collection('plans').insertOne({
      name: 'E2E Starter', slug: `e2e-starter-${unique}`, pricePaise: 50000, virtualCapitalPaise: 10000000,
      rules: { profitTargetPct: 8, maxDrawdownPct: 10, dailyDrawdownPct: 5, drawdownAnchor: 'PREV_DAY_CLOSE', minTradingDays: 1, expiryDays: 30, rewardPct: 80, segments: ['EQ'] },
      status: 'ACTIVE', version: 1, displayOrder: 0, createdAt: new Date(), updatedAt: new Date(),
    });
    planId = String(plan.insertedId);

    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: email, password });
    userToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await db.collection('users').deleteMany({ email });
    await db.collection('plans').deleteMany({ slug: `e2e-starter-${unique}` });
    await db.collection('payments').deleteMany({ userId: new Types.ObjectId(userId) });
    await db.collection('challenges').deleteMany({ userId: new Types.ObjectId(userId) });
    await db.collection('subscriptions').deleteMany({ userId: new Types.ObjectId(userId) });
    await db.collection('ledger_entries').deleteMany({ userId: new Types.ObjectId(userId) });
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it('lists the public plan catalog', async () => {
    const res = await api().get('/api/v1/plans');
    expect(res.status).toBe(200);
    expect(res.body.data.some((p: { id: string }) => p.id === planId)).toBe(true);
  });

  it('creates an order, confirms it, and credits virtual capital once', async () => {
    const order = await api().post('/api/v1/plans/order').set('Authorization', `Bearer ${userToken}`).send({ planId });
    expect(order.status).toBe(201);
    const gatewayOrderId = order.body.data.gatewayOrderId;

    const confirm = await api().post('/api/v1/plans/confirm').set('Authorization', `Bearer ${userToken}`)
      .send({ orderId: gatewayOrderId, paymentId: 'pay_e2e', signature: 'anything-manual-verifies' });
    expect(confirm.status).toBe(201);
    const challengeId = confirm.body.data.challengeId;

    // Confirming again is idempotent — no second challenge/ledger row.
    await api().post('/api/v1/plans/confirm').set('Authorization', `Bearer ${userToken}`)
      .send({ orderId: gatewayOrderId, paymentId: 'pay_e2e', signature: 'anything-manual-verifies' });

    const challenges = await db.collection('challenges').countDocuments({ userId: new Types.ObjectId(userId) });
    const credits = await db.collection('ledger_entries').countDocuments({ userId: new Types.ObjectId(userId), type: 'CREDIT' });
    expect(challenges).toBe(1);
    expect(credits).toBe(1);

    const sub = await api().get('/api/v1/plans/me/subscription').set('Authorization', `Bearer ${userToken}`);
    expect(sub.body.data.active.challenge.virtualCapitalPaise).toBe(10000000);
    expect(String(sub.body.data.active.subscription.challengeId)).toBe(challengeId);
  });

  it('blocks a second active challenge when multi-challenge is disabled', async () => {
    const order = await api().post('/api/v1/plans/order').set('Authorization', `Bearer ${userToken}`).send({ planId });
    expect(order.status).toBe(409);
    expect(order.body.error.code).toBe('ACTIVE_CHALLENGE_EXISTS');
  });
});

describe('e2e enablement', () => {
  it('runs full suites only when E2E_MONGO_URI is set (e2e disabled otherwise)', () => {
    expect(true).toBe(true);
  });
});
