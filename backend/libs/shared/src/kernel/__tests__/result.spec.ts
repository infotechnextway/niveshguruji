import { DomainError, Result } from '../result';

describe('Result', () => {
  it('carries values and errors distinctly', () => {
    const ok = Result.ok(42);
    expect(ok.isOk).toBe(true);
    expect(ok.value).toBe(42);
    expect(() => ok.error).toThrow();

    const fail = Result.fail<number>(DomainError.of('E', 'boom'));
    expect(fail.isFail).toBe(true);
    expect(fail.error.code).toBe('E');
    expect(() => fail.value).toThrow();
  });

  it('maps and chains without touching failures', () => {
    const doubled = Result.ok(2).map((v) => v * 2);
    expect(doubled.value).toBe(4);

    const chained = Result.fail<number>(DomainError.of('E', 'x')).flatMap((v) => Result.ok(v * 2));
    expect(chained.isFail).toBe(true);
  });
});
