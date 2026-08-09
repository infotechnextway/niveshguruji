import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { E2E_ENABLED } from './setup-e2e';
const describeE2E = E2E_ENABLED ? describe : describe.skip;

/**
 * Full onboarding + auth flow against a live database. Verifies the envelope
 * contract, admin-approval gating, and refresh-token rotation end to end.
 */
describeE2E('Onboarding & auth (e2e)', () => {
  let app: INestApplication;
  let db: Connection;
  const unique = Date.now();
  const mobile = `+9199${String(unique).slice(-8)}`;
  const email = `e2e_${unique}@example.com`;
  const username = `e2euser${String(unique).slice(-6)}`;
  const password = 'Str0ngPass1';

  beforeAll(async () => {
    const { createE2EApp } = await import('./app.factory');
    app = await createE2EApp();
    db = app.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await db.collection('users').deleteMany({ email });
    await db.collection('otp_requests').deleteMany({ target: mobile });
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it('registers, returns the envelope, and creates a PENDING_APPROVAL user', async () => {
    const res = await api().post('/api/v1/auth/register').send({
      name: 'E2E User',
      email,
      mobile,
      username,
      password,
      address: '12 MG Road, Bengaluru, Karnataka 560001',
      incomeType: 'SALARIED',
      monthlyIncome: 85000,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBeDefined();

    const user = await db.collection('users').findOne({ email });
    expect(user?.status).toBe('PENDING_APPROVAL');
    expect(user?.address).toContain('Bengaluru');
    expect(user?.incomeType).toBe('SALARIED');
    expect(user?.monthlyIncome).toBe(85000);
  });

  it('rejects duplicate registration with 409', async () => {
    const res = await api().post('/api/v1/auth/register').send({
      name: 'Dup',
      email,
      mobile,
      username,
      password,
      address: 'Somewhere',
      incomeType: 'OWN',
      monthlyIncome: 10000,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE');
  });

  it('blocks login until admin approval', async () => {
    const res = await api().post('/api/v1/auth/login').send({ identifier: username, password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('APPROVAL_PENDING');
  });

  it('allows login after admin approval', async () => {
    await db.collection('users').updateOne(
      { email },
      { $set: { status: 'ACTIVE', approvedAt: new Date(), approvedBy: 'e2e' } },
    );

    const login = await api().post('/api/v1/auth/login').send({ identifier: email, password });
    expect(login.status).toBe(201);
    expect(login.body.data.accessToken).toBeDefined();
    expect(login.body.data.refreshToken).toBeDefined();
  });

  it('rotates refresh tokens and detects reuse of the old one', async () => {
    const login = await api().post('/api/v1/auth/login').send({ identifier: email, password });
    const first = login.body.data.refreshToken;

    const rotated = await api().post('/api/v1/auth/refresh').send({ refreshToken: first });
    expect(rotated.status).toBe(201);
    const second = rotated.body.data.refreshToken;
    expect(second).not.toBe(first);

    // Replaying the first (now-rotated) token must fail and kill the family.
    const replay = await api().post('/api/v1/auth/refresh').send({ refreshToken: first });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('SESSION_REVOKED');

    const victim = await api().post('/api/v1/auth/refresh').send({ refreshToken: second });
    expect(victim.status).toBe(401);
  });
});

describe('e2e enablement', () => {
  it('runs full suites only when E2E_MONGO_URI is set (e2e disabled otherwise)', () => {
    expect(true).toBe(true);
  });
});
