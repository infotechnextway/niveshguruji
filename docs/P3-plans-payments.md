# P3 — Plans & Payments: Design, API Reference & Runbook

## Module delivered
`backend/apps/api/src/modules/plans/` (Clean Architecture). Introduces four new collections that later phases build on: `plans`, `payments`, `subscriptions`, `challenges`, plus the append-only `ledger_entries`.

## Design highlights

### Configurable plans (US-PLAN-1) — nothing hardcoded
`PlanService` CRUD validates every rule through `validateChallengeRules` (bounded ranges + cross-field consistency: dailyDD ≤ maxDD, minTradingDays ≤ expiryDays, non-empty segment subset). Prices and capital are entered in rupees and stored as integer **paise** via the P0 `Money` type. Editing price/capital/rules bumps `plan.version`; **existing challenges are unaffected because their rules are snapshotted at activation** (locked ADR).

### Payment provider port
Everything depends only on the `PaymentProvider` interface. Two adapters:
- **RazorpayProvider** (production) — creates orders in paise, verifies checkout (`order|payment` HMAC-SHA256 with key secret) and webhook (raw-body HMAC with webhook secret) signatures locally, issues refunds.
- **ManualPaymentProvider** (dev/e2e) — synthetic orders, signatures always verify. Never selected in a production preset.

Swapping to Cashfree/PayU later is a single new adapter.

### Idempotent activation — the crux
Virtual capital must be credited **exactly once** even though three things can race: the client checkout callback, the gateway webhook, and (future) the reconciliation poller. All funnel into one private `activate(orderId, …)` guarded by:
1. a **Redis lock** per order (`lock:activate:<orderId>`) serializing concurrent callers, and
2. the terminal-state check — once `payment.status = ACTIVATED`, every later call returns the same `challengeId` as a no-op, and
3. unique indexes on `payments.gatewayOrderId` and `payments.idempotencyKey`.

On first activation the service, in one path: creates the `challenge` (PENDING, rules+version snapshotted, equity = capital), creates the `subscription`, writes the opening **CREDIT** ledger entry, marks the payment ACTIVATED, audits it, and publishes `billing.plan.activated` on the event bus (the P6 evaluator will consume this to begin live tracking). Proven by a concurrency unit test: two simultaneous activations → one challenge, one ledger credit, same challenge id.

### Purchase gating (US-PLAN-2/5)
Order creation requires `kycStatus = APPROVED` and an `ACTIVE` plan, and — when `plan.allowMultipleActiveChallenges` (config) is false — refuses a second concurrent challenge.

### Refunds (US-PLAN-4)
Finance-only, lock-guarded: calls the gateway refund, marks the payment REFUNDED, cancels the subscription, and expires the funded challenge (if still PENDING/ACTIVE). Fully audited.

### Webhook handling
`POST /webhooks/payment` reads the **raw body** (enabled via `rawBody: true` in `main.ts`) for HMAC verification. Signature failure → 400 (gateway will retry); verified-but-unactionable → 200 (gateway stops retrying). `payment.captured` / `order.paid` events drive activation.

## API reference (`/api/v1`)
Envelope on every response.

### Public / user
| Method & Path | Auth | Notes |
|---|---|---|
| GET `/plans` | — | active catalog (price in ₹ and paise) |
| GET `/plans/:id` | — | plan detail |
| POST `/plans/order` `{planId}` | user | 403 KYC_REQUIRED, 409 ACTIVE_CHALLENGE_EXISTS; returns `{gatewayOrderId, amountPaise, publicKey}` for the checkout SDK |
| POST `/plans/confirm` `{orderId,paymentId,signature}` | user | verifies + activates; returns `{challengeId}` |
| GET `/plans/me/subscription` | user | active subscription + challenge summary |
| GET `/plans/me/payments` | user | payment history |
| POST `/webhooks/payment` | signature | gateway server-to-server; raw-body HMAC |

### Admin
| Method & Path | Perm |
|---|---|
| GET/POST `/admin/plans`, PATCH `/admin/plans/:id`, PUT `/admin/plans/:id/status` | plans.manage |
| GET `/admin/payments?status=&page=&pageSize=` | payments.view |
| POST `/admin/payments/:id/refund` `{reason}` | payments.refund |

## New environment
- `PAYMENT_PROVIDER=manual|razorpay` (default manual). For razorpay, all three are required and validated at boot: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- Configure the Razorpay dashboard webhook to `https://YOUR_DOMAIN/api/v1/webhooks/payment` for events `payment.captured` and `order.paid`, using the same webhook secret.

## Testing
- **Unit (67 total, +12 for P3):** rule validation (ranges, cross-field, dedupe); Razorpay checkout+webhook signature verify/reject; **concurrent activation → exactly-once crediting**, late-activation no-op, rules/version snapshot.
- **e2e (CI):** full purchase flow via the manual provider — catalog → order → confirm → idempotent re-confirm (one challenge, one credit) → subscription read → second-challenge block.

## Verified this session
Strict tsc clean; 67/67 unit tests; e2e loads + self-skips locally; production build emits both bundles.
