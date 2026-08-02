# P5 — Trading Core (Virtual Execution Engine): Design, API Reference & Runbook

## Module delivered
`backend/apps/api/src/modules/trading/`, split like P4:
- **TradingApiModule** (api) — order placement, cancellation, order book, portfolio.
- **TradingEngineModule** (engine) — the tick-driven matching loop and the square-off scheduler.

New live collections: `orders`, `positions`, `holdings`, `trades`. `challenges` and `ledger_entries` (defined in P3) now receive live equity/P&L/charge writes.

## Design highlights

### Single-writer-per-account (ADR-3) — the correctness foundation
Every mutation to a challenge's orders/positions/equity runs inside the P0 Redis lock `lock:account:<challengeId>`. Order acceptance, market fills, resting-limit fills, SL/Target triggers, and square-off all serialize per account, so equity and drawdown math are race-free **without** heavyweight multi-document transactions. Two orders on the same account never interleave; orders on different accounts run fully in parallel.

### Pure domain core (exhaustively tested)
- **position-math.ts** — weighted-average, signed positions. `applyFill` handles open / add / reduce / exact-close / flip and returns the realized P&L produced by that fill. `unrealizedPnl` marks an open position. 8 tests cover every branch including short covers and long→short flips.
- **fill-model.ts** — market fills price at the counter-side quote (buy@ask, sell@bid) plus configurable slippage bps; limit fills only when the quote crosses the limit; charges = flat + turnover-bps from the config model (default zero).
- **pre-trade.ts** — fail-fast validation in SRS order: challenge tradable → market open → instrument enabled → segment permitted by the plan snapshot → lot-size multiple → freeze-qty → limit price present → trigger sanity → capital sufficiency.

### Placement flow
`POST /orders` runs under the account lock: validate → persist the order → for MARKET, fill immediately against the cached quote (reject if no live price); for LIMIT, fill if already crossable, else rest as OPEN. Settlement updates the position (weighted-average), writes a trade, marks the order FILLED, applies charges, moves challenge equity, appends PNL/CHARGE ledger entries, updates peak equity, counts the trading day, and publishes `trading.equity.updated` for the P6 evaluator.

### Tick-driven matching (engine)
`TradingEngineService` subscribes to quote channels for instruments that have OPEN orders and routes each tick into `ExecutionService.onQuote`, which (under the account lock) fills crossable limits and fires SL/Target exits. A per-minute check flattens INTRADAY positions at the segment square-off cutoff (config, default 15:15 IST), once per trading day.

### SL/Target mutual exclusivity (C-5, US-TRD-4)
Enforced structurally: an order carries at most one `trigger` field with a single `kind`. It's impossible to attach both a stop-loss and a target — the DTO, the schema, and the domain all model one optional trigger.

### Carry-forward vs intraday
Positions are keyed by `(challenge, instrument, product)`. CARRY_FORWARD net positions mirror into `holdings` for overnight display; INTRADAY positions are auto-squared at cutoff.

## API reference (`/api/v1`, user JWT)
| Method & Path | Notes |
|---|---|
| POST `/orders` | place; body: challengeId, instrumentKey, side, type, product, qty, limitPricePaise?, trigger? |
| DELETE `/orders/:orderId` | cancel an OPEN order |
| GET `/orders/:challengeId/book` | `{open, executed}` |
| GET `/portfolio/:challengeId/positions` | positions + live MTM, unrealized P&L, equity, mtmEquity |
| GET `/portfolio/:challengeId/holdings` | CF holdings with invested/current/pnl |
| GET `/portfolio/:challengeId/trades` | recent trades |

All money fields are integer **paise**.

## Testing
- **Unit (98 total, +22 for P5):** position math (all branches), fill/slippage/charge model, pre-trade validation (each rejection path).
- **e2e (CI) — deterministic replay:** seeds a challenge+instrument, primes the Redis quote cache with scripted quotes, drives `ExecutionService` (the same code REST and the engine call), and asserts exact outcomes: market buy fills at ask and opens the position; selling higher realizes exactly (109.50−100.50)×100 = ₹900 into equity with a matching PNL ledger row; a buy limit rests then fills at the limit when the quote crosses; a disallowed segment is rejected. This is the correctness anchor the P4 simulator's `pushTick` primitive was built for.

## Verified this session
Strict tsc clean; 98/98 unit tests; both bundles build; replay e2e loads + self-skips locally, runs against Mongo+Redis in CI.

## Note for P6
`trading.equity.updated` is published on every fill with `{challengeId, equityPaise, realizedDeltaPaise, dateKey}`. The P6 evaluator consumes this plus MTM ticks to enforce profit-target / max-drawdown / daily-drawdown / expiry and drive PASS/FAIL. P5 keeps equity and positions correct; P6 adds the rules on top.
