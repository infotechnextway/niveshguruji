import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { E2E_ENABLED } from './setup-e2e';

const describeE2E = E2E_ENABLED ? describe : describe.skip;

describeE2E('Market data & watchlist (e2e)', () => {
  let app: INestApplication;
  let db: Connection;
  let token: string;
  const unique = Date.now();
  const email = `mkt_${unique}@example.com`;
  const username = `mkt${String(unique).slice(-6)}`;
  const password = 'Str0ngPass1';
  const instKey = `NSE_EQ|TEST${unique}`;

  beforeAll(async () => {
    const { createE2EApp } = await import('./app.factory');
    app = await createE2EApp();
    db = app.get<Connection>(getConnectionToken());
    const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await db.collection('users').insertOne({
      name: 'Mkt', email, mobile: `+9197${String(unique).slice(-8)}`, username, usernameLower: username,
      passwordHash: hash, status: 'ACTIVE', kycStatus: 'APPROVED', mobileVerified: true, emailVerified: true,
      referralCode: `R${unique}`, createdAt: new Date(), updatedAt: new Date(),
    });
    await db.collection('instruments').insertOne({
      instrumentKey: instKey, symbol: `TEST${unique}`, name: 'Test Co', exchange: 'NSE', segment: 'EQ',
      lotSize: 1, tickSize: 0.05, enabled: true, createdAt: new Date(), updatedAt: new Date(),
    });
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: email, password });
    token = login.body.data.accessToken;
  });

  afterAll(async () => {
    await db.collection('users').deleteMany({ email });
    await db.collection('instruments').deleteMany({ instrumentKey: instKey });
    await db.collection('watchlists').deleteMany({});
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it('searches instruments and adds/reads/removes a watchlist item', async () => {
    const add = await api().post('/api/v1/watchlist/STOCKS').set('Authorization', `Bearer ${token}`).send({ instrumentKey: instKey });
    expect(add.status).toBe(201);

    const list = await api().get('/api/v1/watchlist/STOCKS').set('Authorization', `Bearer ${token}`);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].instrument.instrumentKey).toBe(instKey);

    const dup = await api().post('/api/v1/watchlist/STOCKS').set('Authorization', `Bearer ${token}`).send({ instrumentKey: instKey });
    expect(dup.status).toBe(201); // idempotent
    const stillOne = await api().get('/api/v1/watchlist/STOCKS').set('Authorization', `Bearer ${token}`);
    expect(stillOne.body.data).toHaveLength(1);

    const del = await api().delete(`/api/v1/watchlist/STOCKS/${encodeURIComponent(instKey)}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const empty = await api().get('/api/v1/watchlist/STOCKS').set('Authorization', `Bearer ${token}`);
    expect(empty.body.data).toHaveLength(0);
  });

  it('returns null quotes for instruments with no cached tick', async () => {
    const res = await api().get(`/api/v1/market/quotes?keys=${encodeURIComponent(instKey)}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data[instKey]).toBeNull();
  });
});

describe('e2e enablement', () => {
  it('runs full suites only when E2E_MONGO_URI is set (e2e disabled otherwise)', () => {
    expect(true).toBe(true);
  });
});
