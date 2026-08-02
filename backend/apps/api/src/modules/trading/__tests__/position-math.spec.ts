import { applyFill, FLAT, PositionState, unrealizedPnl } from '../domain/position-math';

describe('Position math (weighted-average, signed)', () => {
  it('opens a long position', () => {
    const { position, realizedDeltaPaise } = applyFill(FLAT, 10, 100_00);
    expect(position).toEqual({ netQty: 10, avgPricePaise: 100_00, realizedPnlPaise: 0 });
    expect(realizedDeltaPaise).toBe(0);
  });

  it('averages up when adding to a long', () => {
    const p1 = applyFill(FLAT, 10, 100_00).position;
    const p2 = applyFill(p1, 10, 120_00).position;
    expect(p2.netQty).toBe(20);
    expect(p2.avgPricePaise).toBe(110_00); // (100*10 + 120*10)/20
  });

  it('realizes profit closing a long above cost', () => {
    const long = applyFill(FLAT, 10, 100_00).position;
    const { position, realizedDeltaPaise } = applyFill(long, -10, 130_00);
    expect(position.netQty).toBe(0);
    expect(position.avgPricePaise).toBe(0);
    expect(realizedDeltaPaise).toBe(30_00 * 10); // +₹300 per unit? no: (130-100)*10 = 30000 paise*10
  });

  it('realizes correctly on a partial close, keeping avg cost', () => {
    const long = applyFill(FLAT, 10, 100_00).position; // 10 @ 100
    const { position, realizedDeltaPaise } = applyFill(long, -4, 110_00);
    expect(position.netQty).toBe(6);
    expect(position.avgPricePaise).toBe(100_00); // unchanged on reduce
    expect(realizedDeltaPaise).toBe((110_00 - 100_00) * 4);
  });

  it('realizes profit on a short covered lower', () => {
    const short = applyFill(FLAT, -10, 200_00).position; // short 10 @ 200
    const { position, realizedDeltaPaise } = applyFill(short, 10, 180_00);
    expect(position.netQty).toBe(0);
    expect(realizedDeltaPaise).toBe((200_00 - 180_00) * 10); // profit for shorts when buy < avg
  });

  it('realizes loss on a short covered higher', () => {
    const short = applyFill(FLAT, -10, 200_00).position;
    const { realizedDeltaPaise } = applyFill(short, 10, 220_00);
    expect(realizedDeltaPaise).toBe((200_00 - 220_00) * 10); // negative
  });

  it('flips long → short, realizing the closed leg and opening the remainder', () => {
    const long = applyFill(FLAT, 10, 100_00).position; // long 10 @ 100
    const { position, realizedDeltaPaise } = applyFill(long, -15, 120_00);
    expect(realizedDeltaPaise).toBe((120_00 - 100_00) * 10); // closed 10 @ profit
    expect(position.netQty).toBe(-5); // opened short 5
    expect(position.avgPricePaise).toBe(120_00); // at the fill price
  });

  it('computes unrealized P&L at a mark', () => {
    const long: PositionState = { netQty: 10, avgPricePaise: 100_00, realizedPnlPaise: 0 };
    expect(unrealizedPnl(long, 115_00)).toBe(15_00 * 10);
    const short: PositionState = { netQty: -10, avgPricePaise: 100_00, realizedPnlPaise: 0 };
    expect(unrealizedPnl(short, 90_00)).toBe((90_00 - 100_00) * -10); // +10000*10 profit
    expect(unrealizedPnl(FLAT, 100_00)).toBe(0);
  });
});
