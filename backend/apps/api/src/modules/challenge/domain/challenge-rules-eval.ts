/**
 * Pure challenge rule evaluation (US-CHG-2). No I/O. Given the challenge's
 * snapshotted rules, its capital and running figures, the current MTM-equity,
 * and the clock, decide CONTINUE / PASS / FAIL(reason). Order of checks is the
 * SRS order and is load-bearing: daily DD → max DD → expiry → profit target.
 */

export type EvalOutcome =
  | { decision: 'CONTINUE' }
  | { decision: 'PASS' }
  | { decision: 'FAIL'; reason: FailReason };

export type FailReason = 'DAILY_DRAWDOWN' | 'MAX_DRAWDOWN' | 'EXPIRED';

export interface EvalRules {
  profitTargetPct: number;
  maxDrawdownPct: number;
  dailyDrawdownPct: number;
  minTradingDays: number;
}

export interface EvalInput {
  rules: EvalRules;
  virtualCapitalPaise: number;
  /** Equity marked to market right now (realized equity + unrealized P&L). */
  mtmEquityPaise: number;
  /** Anchor equity for today's daily-drawdown floor (prev-day close or initial). */
  dayStartEquityPaise: number;
  /** Distinct trading days with at least one fill so far. */
  tradingDaysCount: number;
  /** True once the challenge's expiry timestamp has passed. */
  expired: boolean;
}

export function evaluateChallenge(input: EvalInput): EvalOutcome {
  const { rules, virtualCapitalPaise, mtmEquityPaise, dayStartEquityPaise, tradingDaysCount, expired } = input;

  // Floors are computed off the configured bases (all percentages of an anchor).
  const dailyFloor = dayStartEquityPaise - Math.round((dayStartEquityPaise * rules.dailyDrawdownPct) / 100);
  const maxFloor = virtualCapitalPaise - Math.round((virtualCapitalPaise * rules.maxDrawdownPct) / 100);
  const profitTarget = virtualCapitalPaise + Math.round((virtualCapitalPaise * rules.profitTargetPct) / 100);

  // 1. Daily drawdown breach.
  if (mtmEquityPaise <= dailyFloor) {
    return { decision: 'FAIL', reason: 'DAILY_DRAWDOWN' };
  }
  // 2. Max (overall) drawdown breach.
  if (mtmEquityPaise <= maxFloor) {
    return { decision: 'FAIL', reason: 'MAX_DRAWDOWN' };
  }
  // 3. Expiry.
  if (expired) {
    return { decision: 'FAIL', reason: 'EXPIRED' };
  }
  // 4. Profit target reached AND minimum trading days met.
  if (mtmEquityPaise >= profitTarget && tradingDaysCount >= rules.minTradingDays) {
    return { decision: 'PASS' };
  }
  return { decision: 'CONTINUE' };
}

/** Reward computed as rewardPct of net profit above capital (never negative). */
export function computeRewardPaise(virtualCapitalPaise: number, finalEquityPaise: number, rewardPct: number): number {
  const profit = Math.max(0, finalEquityPaise - virtualCapitalPaise);
  return Math.round((profit * rewardPct) / 100);
}
