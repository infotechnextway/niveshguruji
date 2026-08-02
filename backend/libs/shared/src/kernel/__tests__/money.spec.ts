import { Money } from '../money';

describe('Money (integer paise, ADR-4)', () => {
  it('constructs from rupees with correct rounding', () => {
    expect(Money.fromRupees(1234.56).value.paise).toBe(123456);
    expect(Money.fromRupees(0.005).value.paise).toBe(1); // half-away-from-zero
    expect(Money.fromRupees(-0.005).value.paise).toBe(-1);
    expect(Money.fromRupees(0.004).value.paise).toBe(0);
  });

  it('rejects non-finite and overflow inputs', () => {
    expect(Money.fromRupees(NaN).isFail).toBe(true);
    expect(Money.fromRupees(Infinity).isFail).toBe(true);
    expect(Money.fromPaise(1.5).isFail).toBe(true);
    expect(Money.fromPaise(Number.MAX_SAFE_INTEGER + 2).isFail).toBe(true);
  });

  it('is exact where floats are not (the classic 0.1 + 0.2 case)', () => {
    const a = Money.fromRupees(0.1).value;
    const b = Money.fromRupees(0.2).value;
    expect(a.add(b).paise).toBe(30);
    expect(a.add(b).rupees).toBe(0.3);
  });

  it('supports arithmetic, comparison and bps', () => {
    const capital = Money.fromRupees(1_00_000).value; // ₹1,00,000
    expect(capital.bps(800).rupees).toBe(8_000); // 8% profit target
    expect(capital.times(2).paise).toBe(capital.paise * 2);
    expect(capital.subtract(Money.fromRupees(500).value).rupees).toBe(99_500);
    expect(capital.gte(Money.ZERO)).toBe(true);
    expect(Money.ZERO.subtract(capital).isNegative).toBe(true);
  });

  it('formats with Indian digit grouping', () => {
    expect(Money.fromRupees(1234567.89).value.format()).toBe('₹12,34,567.89');
    expect(Money.fromRupees(-42.5).value.format()).toBe('-₹42.50');
  });

  it('serializes to paise in JSON', () => {
    expect(JSON.stringify({ amount: Money.fromRupees(10).value })).toBe('{"amount":1000}');
  });
});
