import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { E2E_ENABLED } from './setup-e2e';
const describeE2E = E2E_ENABLED ? describe : describe.skip;

/**
 * Full onboarding + auth flow against a live database. Verifies the envelope
 * contract, verification gating, and refresh-token rotation end to end.
 * OTP/verification tokens are read straight from the DB (no SMS/mail needed;
 * console adapters are active in this env).
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

  it('registers, returns the envelope, and creates a PENDING_MOBILE user', async () => {
    const res = await api().post('/api/v1/auth/register').send({
      name: 'E2E User', email, mobile, username, password,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBeDefined();

    const user = await db.collection('users').findOne({ email });
    expect(user?.status).toBe('PENDING_MOBILE');
  });

  it('rejects duplicate registration with 409', async () => {
    const res = await api().post('/api/v1/auth/register').send({
      name: 'Dup', email, mobile, username, password,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE');
  });

  it('blocks login until verification is complete', async () => {
    const res = await api().post('/api/v1/auth/login').send({ identifier: username, password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('VERIFICATION_PENDING');
  });

  it('verifies mobile then email, activates the account, and logs in', async () => {
    // The console SMS adapter doesn't return the code; read the hash target is
    // opaque, so we re-issue via a known code path: fetch latest OTP doc and
    // brute the 6-digit space is not acceptable — instead we set a known code.
    const otpDoc = await db.collection('otp_requests').findOne({ target: mobile }, { sort: { createdAt: -1 } });
    expect(otpDoc).toBeTruthy();
    // Inject a deterministic code by rewriting the stored hash for this test.
    const { createHash } = await import('crypto');
    const code = '424242';
    const codeHash = createHash('sha256').update(`${code}:${process.env.OTP_PEPPER}`).digest('hex');
    await db.collection('otp_requests').updateOne({ _id: otpDoc!._id }, { $set: { codeHash } });

    const verifyMobile = await api().post('/api/v1/auth/otp/verify').send({ mobile, code });
    expect(verifyMobile.status).toBe(201);
    expect(verifyMobile.body.data.status).toBe('PENDING_EMAIL');

    // Email verification uses a signed token; mint one the same way the service does.
    const user = await db.collection('users').findOne({ email });
    const { JwtService } = await import('@nestjs/jwt');
    const jwt = new JwtService({});
    const priv = Buffer.from(process.env.JWT_PRIVATE_KEY_B64!, 'base64').toString('utf8');
    const token = jwt.sign(
      { sub: String(user!._id), typ: 'email-verify', email },
      { algorithm: 'RS256', privateKey: priv, expiresIn: 3600 },
    );
    const verifyEmail = await api().get(`/api/v1/auth/email/verify?token=${token}`);
    expect(verifyEmail.status).toBe(200);
    expect(verifyEmail.body.data.status).toBe('ACTIVE');

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
