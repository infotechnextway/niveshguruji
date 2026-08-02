import { PasswordService } from '../infrastructure/password.service';

describe('PasswordService (Argon2id)', () => {
  const svc = new PasswordService();

  it('hashes and verifies', async () => {
    const hash = await svc.hash('Str0ngPass!');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await svc.verify(hash, 'Str0ngPass!')).toBe(true);
    expect(await svc.verify(hash, 'wrong')).toBe(false);
  });

  it('never throws on malformed hashes', async () => {
    expect(await svc.verify('not-a-hash', 'x')).toBe(false);
  });
});
