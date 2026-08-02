import { validateChallengeRules } from '../domain/plan-rules.vo';

const valid = {
  profitTargetPct: 8, maxDrawdownPct: 10, dailyDrawdownPct: 5,
  drawdownAnchor: 'PREV_DAY_CLOSE', minTradingDays: 3, expiryDays: 30,
  rewardPct: 80, segments: ['EQ', 'FO'],
};

describe('validateChallengeRules', () => {
  it('accepts a well-formed rule set and dedupes segments', () => {
    const res = validateChallengeRules({ ...valid, segments: ['EQ', 'EQ', 'FO'] });
    expect(res.isOk).toBe(true);
    expect(res.value.segments).toEqual(['EQ', 'FO']);
  });

  it('rejects percentages out of range', () => {
    expect(validateChallengeRules({ ...valid, profitTargetPct: 0 }).isFail).toBe(true);
    expect(validateChallengeRules({ ...valid, maxDrawdownPct: 150 }).isFail).toBe(true);
  });

  it('rejects dailyDrawdown greater than maxDrawdown', () => {
    const res = validateChallengeRules({ ...valid, dailyDrawdownPct: 12, maxDrawdownPct: 10 });
    expect(res.isFail).toBe(true);
    expect(res.error.code).toBe('RULE_INCONSISTENT');
  });

  it('rejects minTradingDays greater than expiryDays', () => {
    expect(validateChallengeRules({ ...valid, minTradingDays: 40, expiryDays: 30 }).error.code).toBe('RULE_INCONSISTENT');
  });

  it('rejects bad anchor and empty/unknown segments', () => {
    expect(validateChallengeRules({ ...valid, drawdownAnchor: 'FOO' }).isFail).toBe(true);
    expect(validateChallengeRules({ ...valid, segments: [] }).isFail).toBe(true);
    expect(validateChallengeRules({ ...valid, segments: ['XYZ'] }).isFail).toBe(true);
  });

  it('requires integer day counts', () => {
    expect(validateChallengeRules({ ...valid, minTradingDays: 2.5 }).isFail).toBe(true);
    expect(validateChallengeRules({ ...valid, expiryDays: 0 }).isFail).toBe(true);
  });
});
