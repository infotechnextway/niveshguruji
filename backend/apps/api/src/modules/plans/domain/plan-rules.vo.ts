import { DomainError, Result } from '@app/shared';
import { ChallengeRules, DrawdownAnchor, Segment, SEGMENTS } from './plan.types';

/** Validates and normalizes admin-supplied challenge rules (nothing hardcoded; only bounded). */
export function validateChallengeRules(raw: Record<string, unknown>): Result<ChallengeRules> {
  const input = raw as Partial<ChallengeRules>;
  const pct = (v: unknown, field: string, min: number, max: number): Result<number> => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
      return Result.fail(DomainError.of('RULE_INVALID', `${field} must be a number between ${min} and ${max}`, { field }));
    }
    return Result.ok(v);
  };

  const profit = pct(input.profitTargetPct, 'profitTargetPct', 0.1, 100);
  if (profit.isFail) return Result.fail(profit.error);
  const maxDd = pct(input.maxDrawdownPct, 'maxDrawdownPct', 0.1, 100);
  if (maxDd.isFail) return Result.fail(maxDd.error);
  const dailyDd = pct(input.dailyDrawdownPct, 'dailyDrawdownPct', 0.1, 100);
  if (dailyDd.isFail) return Result.fail(dailyDd.error);
  const reward = pct(input.rewardPct, 'rewardPct', 0, 100);
  if (reward.isFail) return Result.fail(reward.error);

  if (dailyDd.value > maxDd.value) {
    return Result.fail(DomainError.of('RULE_INCONSISTENT', 'dailyDrawdownPct cannot exceed maxDrawdownPct'));
  }

  const anchor = input.drawdownAnchor;
  if (anchor !== 'PREV_DAY_CLOSE' && anchor !== 'INITIAL_CAPITAL') {
    return Result.fail(DomainError.of('RULE_INVALID', 'drawdownAnchor must be PREV_DAY_CLOSE or INITIAL_CAPITAL'));
  }

  const minDays = input.minTradingDays;
  if (!Number.isInteger(minDays) || (minDays as number) < 0 || (minDays as number) > 365) {
    return Result.fail(DomainError.of('RULE_INVALID', 'minTradingDays must be an integer 0–365'));
  }
  const expiry = input.expiryDays;
  if (!Number.isInteger(expiry) || (expiry as number) < 1 || (expiry as number) > 365) {
    return Result.fail(DomainError.of('RULE_INVALID', 'expiryDays must be an integer 1–365'));
  }
  if ((minDays as number) > (expiry as number)) {
    return Result.fail(DomainError.of('RULE_INCONSISTENT', 'minTradingDays cannot exceed expiryDays'));
  }

  const segments = input.segments;
  if (!Array.isArray(segments) || segments.length === 0 || !segments.every((s) => SEGMENTS.includes(s as Segment))) {
    return Result.fail(DomainError.of('RULE_INVALID', `segments must be a non-empty subset of ${SEGMENTS.join(', ')}`));
  }

  return Result.ok({
    profitTargetPct: profit.value,
    maxDrawdownPct: maxDd.value,
    dailyDrawdownPct: dailyDd.value,
    drawdownAnchor: anchor as DrawdownAnchor,
    minTradingDays: minDays as number,
    expiryDays: expiry as number,
    rewardPct: reward.value,
    segments: [...new Set(segments)] as Segment[],
  });
}
