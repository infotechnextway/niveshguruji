import { PreTradeContext, validatePreTrade } from '../domain/pre-trade';
import { PlaceOrderCommand } from '../domain/order.types';

function ctx(overrides: Partial<PreTradeContext> = {}): PreTradeContext {
  const command: PlaceOrderCommand = {
    challengeId: 'c', userId: 'u', instrumentKey: 'K', side: 'BUY', type: 'MARKET',
    product: 'INTRADAY', qty: 75,
  };
  return {
    command,
    instrument: { instrumentKey: 'K', segment: 'FO', lotSize: 75, freezeQty: 1800, enabled: true },
    challenge: { status: 'ACTIVE', segments: ['FO'], equityPaise: 10_00_000_00 },
    marketOpen: true,
    estimatedCostPaise: 100_00,
    ...overrides,
  };
}

describe('Pre-trade validation (fail-fast order)', () => {
  it('passes a valid order', () => {
    expect(validatePreTrade(ctx()).isOk).toBe(true);
  });

  it('rejects a non-tradable challenge first', () => {
    expect(validatePreTrade(ctx({ challenge: { status: 'FAILED', segments: ['FO'], equityPaise: 1 } })).error.code).toBe('CHALLENGE_NOT_TRADABLE');
  });

  it('rejects a closed market', () => {
    expect(validatePreTrade(ctx({ marketOpen: false })).error.code).toBe('MARKET_CLOSED');
  });

  it('rejects a disabled instrument', () => {
    const c = ctx();
    c.instrument.enabled = false;
    expect(validatePreTrade(c).error.code).toBe('INSTRUMENT_DISABLED');
  });

  it('rejects a segment the plan does not allow', () => {
    expect(validatePreTrade(ctx({ challenge: { status: 'ACTIVE', segments: ['EQ'], equityPaise: 10_00_000_00 } })).error.code).toBe('SEGMENT_NOT_ALLOWED');
  });

  it('rejects non-lot-multiple quantity', () => {
    const c = ctx();
    c.command.qty = 100; // lot 75
    expect(validatePreTrade(c).error.code).toBe('QTY_LOT_MISMATCH');
  });

  it('rejects quantity over the freeze limit', () => {
    const c = ctx();
    c.command.qty = 1875; // 25 lots of 75 = 1875 > freeze 1800
    expect(validatePreTrade(c).error.code).toBe('FREEZE_QTY_EXCEEDED');
  });

  it('requires a positive limit price for LIMIT orders', () => {
    const c = ctx();
    c.command.type = 'LIMIT';
    expect(validatePreTrade(c).error.code).toBe('LIMIT_PRICE_REQUIRED');
  });

  it('rejects when order value exceeds equity', () => {
    expect(validatePreTrade(ctx({ estimatedCostPaise: 20_00_000_00, challenge: { status: 'ACTIVE', segments: ['FO'], equityPaise: 10_00_000_00 } })).error.code).toBe('INSUFFICIENT_CAPITAL');
  });
});
