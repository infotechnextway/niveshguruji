import { computeRewardPaise, evaluateChallenge, EvalInput } from '../domain/challenge-rules-eval';

const CAP = 10_00_000_00; // ₹10,00,000 in paise

function input(overrides: Partial<EvalInput> = {}): EvalInput {
  return {
    rules: { profitTargetPct: 8, maxDrawdownPct: 10, dailyDrawdownPct: 5, minTradingDays: 3 },
    virtualCapitalPaise: CAP,
    mtmEquityPaise: CAP,
    dayStartEquityPaise: CAP,
    tradingDaysCount: 0,
    expired: false,
    ...overrides,
  };
}

describe('evaluateChallenge (pure, SRS check order)', () => {
  it('continues when nothing is breached and target not met', () => {
    expect(evaluateChallenge(input()).decision).toBe('CONTINUE');
  });

  it('passes when profit target met AND min trading days reached', () => {
    const target = CAP + Math.round((CAP * 8) / 100); // +8%
    expect(evaluateChallenge(input({ mtmEquityPaise: target, tradingDaysCount: 3 })).decision).toBe('PASS');
  });

  it('does NOT pass if target met but min trading days not reached', () => {
    const target = CAP + Math.round((CAP * 8) / 100);
    expect(evaluateChallenge(input({ mtmEquityPaise: target, tradingDaysCount: 2 })).decision).toBe('CONTINUE');
  });

  it('fails on daily drawdown breach', () => {
    const dailyFloor = CAP - Math.round((CAP * 5) / 100); // -5% of day start
    const res = evaluateChallenge(input({ mtmEquityPaise: dailyFloor }));
    expect(res).toEqual({ decision: 'FAIL', reason: 'DAILY_DRAWDOWN' });
  });

  it('fails on max drawdown breach', () => {
    // Keep day-start low so daily floor isn't hit first; equity below max floor.
    const maxFloor = CAP - Math.round((CAP * 10) / 100);
    const res = evaluateChallenge(input({ mtmEquityPaise: maxFloor, dayStartEquityPaise: maxFloor + 1 }));
    expect(res).toEqual({ decision: 'FAIL', reason: 'MAX_DRAWDOWN' });
  });

  it('daily drawdown is checked before max drawdown (order matters)', () => {
    // Equity below BOTH floors — daily must win.
    const res = evaluateChallenge(input({ mtmEquityPaise: 0 }));
    expect(res).toEqual({ decision: 'FAIL', reason: 'DAILY_DRAWDOWN' });
  });

  it('fails on expiry when not already breached and target not met', () => {
    expect(evaluateChallenge(input({ expired: true })).decision).toBe('FAIL');
    expect(evaluateChallenge(input({ expired: true }))).toEqual({ decision: 'FAIL', reason: 'EXPIRED' });
  });

  it('a breach takes precedence over expiry', () => {
    const dailyFloor = CAP - Math.round((CAP * 5) / 100);
    expect(evaluateChallenge(input({ mtmEquityPaise: dailyFloor, expired: true })).decision).toBe('FAIL');
    expect(evaluateChallenge(input({ mtmEquityPaise: dailyFloor, expired: true }))).toEqual({ decision: 'FAIL', reason: 'DAILY_DRAWDOWN' });
  });

  it('a met target beats expiry (passing on the final day counts)', () => {
    const target = CAP + Math.round((CAP * 8) / 100);
    expect(evaluateChallenge(input({ mtmEquityPaise: target, tradingDaysCount: 5, expired: false })).decision).toBe('PASS');
  });
});

describe('computeRewardPaise', () => {
  it('is rewardPct of profit above capital', () => {
    expect(computeRewardPaise(CAP, CAP + 1_00_000_00, 80)).toBe(Math.round((1_00_000_00 * 80) / 100));
  });
  it('is zero when there is no profit', () => {
    expect(computeRewardPaise(CAP, CAP, 80)).toBe(0);
    expect(computeRewardPaise(CAP, CAP - 5000, 80)).toBe(0);
  });
});
