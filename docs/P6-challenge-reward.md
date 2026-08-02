# P6 — Challenge Rules & Reward: Design, API Reference & Runbook

## Modules delivered
`backend/apps/api/src/modules/challenge/`, split like every phase:
- **ChallengeApiModule** (api) — user challenge dashboard, admin reward queue.
- **ChallengeEngineModule** (engine) — the real-time evaluator, driver, and daily anchor job.

New live collection: `rewards`. `challenges.status` now transitions through `PENDING → ACTIVE → PASSED_PENDING_REVIEW → PASSED | FAILED` under the same account lock the VEE uses.

## Design highlights

### The evaluator is pure and load-bearingly ordered
`challenge-rules-eval.ts`'s `evaluateChallenge` returns `CONTINUE | PASS | FAIL(reason)` given a challenge's snapshotted rules, its capital and running figures, current MTM-equity, trading-day count, and the clock. Order matters and is fixed to the SRS: **daily-drawdown → max-drawdown → expiry → profit-target-with-min-days**. Eleven tests cover every branch including the precedence cases (daily beats max when both floors are breached; a met target beats expiry; a breach beats expiry).

### Evaluation runs under the account lock (ADR-3)
`ChallengeEvalService` takes `lock:account:<challengeId>` — the exact lock the VEE holds when writing fills — so a fill and its rule check never interleave. Equity is always internally consistent when rules are evaluated.

### Two triggers, one path
`ChallengeEvalDriver` subscribes to `trading.equity.updated` (published by P5 on every fill) and also runs a 5-second MTM sweep across active challenges. This matters: an open losing position moving against the trader can breach drawdown with no new fill, and the sweep catches that in real time.

### MTM equity, not realized equity, drives drawdown
`mtmEquity = realized equity + unrealized P&L across open positions at cached quotes`. This is the honest number for drawdown floors.

### Terminal side effects (deterministic)
- **FAIL**: `ExecutionService.forceFlatten` closes every open position at market (already holding the lock, no re-lock), cancels every open order with `CHALLENGE_FAILED`, sets status to `FAILED`, publishes `challenge.failed`.
- **PASS**: with the approved `challenge.freezeOnPass=true` default, flatten and cancel; set status to `PASSED_PENDING_REVIEW`; upsert a `Reward` in `ELIGIBLE`; publish `challenge.passed`.

### Reward flow
`reward.schema.ts` transitions `ELIGIBLE → APPROVED → PAID | REJECTED`, with `overrideAmountPaise` for admin overrides and a timeline of every state change (audited via `AuditService`). Approval flips the challenge to `PASSED`. Payout itself is off-platform per your approved default — the platform tracks eligibility and status only.

### Daily anchor (config-driven)
`DailyAnchorService` runs shortly before EQ open each trading day and resets `dayStartEquityPaise` from `challenge.dailyDD.anchor` (default `PREV_DAY_CLOSE` per your approval; `INITIAL_CAPITAL` also supported). This is what makes daily drawdown honest across sessions.

## API reference (`/api/v1`)
User (JWT):
| Method & Path | Notes |
|---|---|
| GET `/challenge/current` | active challenge with progress: profit %, drawdown used %, days, reward status |
| GET `/challenge/history` | all challenges for the user, newest first |
| GET `/challenge/:id` | one challenge with full progress |
| GET `/challenge/:id/reward` | reward status for a passed challenge |

Admin (Employee JWT + permission):
| Method & Path | Permission | Notes |
|---|---|---|
| GET `/admin/rewards/queue?status&page&pageSize` | rewards.review | default ELIGIBLE |
| GET `/admin/rewards/:id` | rewards.review | detail + linked challenge |
| POST `/admin/rewards/:id/approve` `{overrideAmountPaise?, reason?}` | rewards.approve | audited |
| POST `/admin/rewards/:id/reject` `{reason}` | rewards.approve | audited |
| POST `/admin/rewards/:id/mark-paid` `{reason?}` | rewards.approve | audited |

## Testing
- **Unit (109 total, +11 for P6):** every branch of `evaluateChallenge` (CONTINUE / PASS / four FAIL reasons), the precedence pairs (daily beats max, breach beats expiry, target beats expiry), min-trading-days gate, and `computeRewardPaise` including zero-profit edges.

## Verified this session
Strict tsc clean; 109/109 unit tests; both api + engine bundles build. `challenge.failed` and `challenge.passed` events are published for downstream P7 notifications.
