import { AuthService } from '../application/auth.service';
import { TokenService } from '../infrastructure/token.service';

/**
 * Refresh rotation + reuse detection (US-AUTH-4) against an in-memory
 * session store faking the Mongoose surface AuthService touches.
 */
type SessionRow = {
  principalId: string;
  actor: string;
  refreshHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByHash?: string;
  save: () => Promise<void>;
};

function buildHarness() {
  const rows: SessionRow[] = [];
  const sessions = {
    findOne: async (q: { refreshHash: string }) => rows.find((r) => r.refreshHash === q.refreshHash) ?? null,
    updateMany: async (q: { familyId: string }, u: { $set: { revokedAt: Date } }) => {
      rows.filter((r) => r.familyId === q.familyId && !r.revokedAt).forEach((r) => (r.revokedAt = u.$set.revokedAt));
    },
    create: async (doc: Omit<SessionRow, 'save'>) => {
      const row: SessionRow = { ...doc, save: async () => undefined };
      rows.push(row);
      return row;
    },
  };
  const tokens = {
    newRefreshToken: () => {
      const raw = Math.random().toString(36).slice(2).padEnd(40, 'x');
      return { raw, hash: TokenService.hashRefresh(raw), expiresAt: new Date(Date.now() + 86_400_000) };
    },
    signAccess: () => 'access.jwt',
    accessTtlSec: 900,
  };
  const audit = { record: jest.fn(async () => undefined) };

  const svc = new AuthService(
    {} as never, // users — untouched by refresh()
    sessions as never,
    {} as never, // loginHistory — untouched by refresh()
    {} as never,
    tokens as never,
    {} as never,
    {} as never,
    audit as never,
    {} as never,
  );
  return { svc, rows, sessions, audit };
}

describe('Refresh rotation & reuse detection', () => {
  it('rotates: old token revoked, new token in the same family works', async () => {
    const { svc, rows } = buildHarness();
    const first = { raw: 'first-token-raw-value-here-1234567890', hash: '', familyId: 'fam-1' };
    first.hash = TokenService.hashRefresh(first.raw);
    rows.push({
      principalId: '64b000000000000000000001', actor: 'USER', refreshHash: first.hash, familyId: 'fam-1',
      expiresAt: new Date(Date.now() + 86_400_000), save: async () => undefined,
    });

    const rotated = await svc.refresh(first.raw, {});
    expect(rotated.isOk).toBe(true);
    const oldRow = rows.find((r) => r.refreshHash === first.hash)!;
    expect(oldRow.revokedAt).toBeDefined();
    expect(oldRow.replacedByHash).toBe(TokenService.hashRefresh(rotated.value.refreshToken));

    const again = await svc.refresh(rotated.value.refreshToken, {});
    expect(again.isOk).toBe(true);
    expect(rows.every((r) => r.familyId === 'fam-1')).toBe(true);
  });

  it('reuse of a rotated token revokes the ENTIRE family and audits it', async () => {
    const { svc, rows, audit } = buildHarness();
    const first = { raw: 'stolen-token-raw-value-here-1234567890' };
    const hash = TokenService.hashRefresh(first.raw);
    rows.push({
      principalId: '64b000000000000000000001', actor: 'USER', refreshHash: hash, familyId: 'fam-x',
      expiresAt: new Date(Date.now() + 86_400_000), save: async () => undefined,
    });

    const rotated = await svc.refresh(first.raw, {});
    expect(rotated.isOk).toBe(true);

    // Attacker replays the original token
    const replay = await svc.refresh(first.raw, { ip: '1.2.3.4' });
    expect(replay.isFail).toBe(true);
    expect(replay.error.code).toBe('SESSION_REVOKED');
    expect(rows.filter((r) => r.familyId === 'fam-x').every((r) => r.revokedAt)).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'SESSION_FAMILY_REVOKED_REUSE' }));

    // The legitimate rotated token is now dead too — family containment
    const victim = await svc.refresh(rotated.value.refreshToken, {});
    expect(victim.isFail).toBe(true);
  });

  it('rejects unknown and expired tokens', async () => {
    const { svc, rows } = buildHarness();
    expect((await svc.refresh('completely-unknown-token-0123456789', {})).isFail).toBe(true);

    const raw = 'expired-token-raw-value-here-1234567890';
    rows.push({
      principalId: '64b000000000000000000001', actor: 'USER', refreshHash: TokenService.hashRefresh(raw), familyId: 'fam-e',
      expiresAt: new Date(Date.now() - 1000), save: async () => undefined,
    });
    const res = await svc.refresh(raw, {});
    expect(res.isFail).toBe(true);
    expect(res.error.code).toBe('SESSION_REVOKED');
  });
});
