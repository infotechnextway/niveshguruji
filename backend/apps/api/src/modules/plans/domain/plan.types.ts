export const SEGMENTS = ['EQ', 'FO', 'CUR'] as const;
export type Segment = (typeof SEGMENTS)[number];

export type DrawdownAnchor = 'PREV_DAY_CLOSE' | 'INITIAL_CAPITAL';

/**
 * The rule-set that governs a challenge. Every value is admin-configured on the
 * plan and SNAPSHOTTED into the challenge at activation (locked ADR) so editing
 * a plan never mutates a running challenge.
 */
export interface ChallengeRules {
  profitTargetPct: number; // e.g. 8 => +8% of capital to pass
  maxDrawdownPct: number; // overall equity drawdown that fails the challenge
  dailyDrawdownPct: number; // per-day drawdown that fails the challenge
  drawdownAnchor: DrawdownAnchor;
  minTradingDays: number; // must trade at least this many distinct days to pass
  expiryDays: number; // challenge auto-expires this many days after activation
  rewardPct: number; // reward as % of profit (or capital, per reward policy) — used in P7
  segments: Segment[]; // instrument segments this plan may trade
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE', // purchasable
  ARCHIVED = 'ARCHIVED', // hidden from catalog; existing challenges unaffected
}

export enum PaymentStatus {
  CREATED = 'CREATED', // intent created, awaiting payment
  CAPTURED = 'CAPTURED', // paid & verified
  ACTIVATED = 'ACTIVATED', // capital credited + challenge created (terminal success)
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ChallengeStatus {
  PENDING = 'PENDING', // created by P3; the P6 evaluator activates real-time tracking
  ACTIVE = 'ACTIVE',
  PASSED_PENDING_REVIEW = 'PASSED_PENDING_REVIEW',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}
