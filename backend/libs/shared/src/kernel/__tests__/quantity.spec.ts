import { Quantity } from '../quantity';

describe('Quantity', () => {
  it('accepts positive integers only', () => {
    expect(Quantity.of(75).value.value).toBe(75);
    expect(Quantity.of(0).isFail).toBe(true);
    expect(Quantity.of(-5).isFail).toBe(true);
    expect(Quantity.of(1.5).isFail).toBe(true);
  });

  it('enforces lot-size multiples (e.g. NIFTY lot 75)', () => {
    expect(Quantity.ofLots(150, 75).isOk).toBe(true);
    const bad = Quantity.ofLots(100, 75);
    expect(bad.isFail).toBe(true);
    expect(bad.error.code).toBe('QTY_LOT_MISMATCH');
  });

  it('rejects invalid lot sizes', () => {
    expect(Quantity.ofLots(10, 0).isFail).toBe(true);
  });
});
