---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### RIDGELINE CAPITAL
- Definition：The brand and legal entity behind the paper-trading simulator; the project's product name appears in every doc header and README.
- Aliases：Ridgeline Capital、ridgeline

### paper trading
- Definition：Virtual trading of NSE/BSE equities, futures/options, indices and currency without real money or broker settlement; explicitly stated as 'not a broker, not an exchange' in the README.
- Aliases：virtual trading

### challenge
- Definition：A trader-evaluation engagement created when a user activates a paid plan; carries a snapshot of plan rules (daily-DD, max-DD, expiry, target+min-days), initial equity, and lifecycle states (PENDING/ACTIVE/FAIL/PASS). Evaluator runs in the engine process and triggers terminal side effects on PASS/FAIL.
- Aliases：evaluation、funded challenge

### VEE
- Definition：Virtual Execution Engine — the single-writer-per-account position math engine that processes market + limit orders, resting-limit tick fills, SL/target mutual exclusion, live MTM, intraday auto-square-off, and append-only ledger entries under a lock per account.
- Aliases：Virtual Execution Engine

### plan
- Definition：Configurable evaluation offering whose price, capital, and rule set (dailyDD ≤ maxDD, minTradingDays ≤ expiryDays, segment subset) are stored in Mongo with versioning; editing a plan bumps its version but does not retroactively affect active challenges because rules are snapshotted at activation.
- Aliases：evaluation plan

### subscription
- Definition：Active plan binding tied to a user; created on successful plan activation and cancelled on refund. Drives whether a user may purchase another concurrent challenge depending on `allowMultipleActiveChallenges`.

### KYC
- Definition：Know-Your-Customer verification flow storing encrypted documents (AES-GCM) in a reviewer queue; gate blocks plan purchase until `kycStatus = APPROVED`.
- Aliases：KYC document、KYC approval

### instrumentKey
- Definition：Unique composite key for an instrument in the master table (NSE/BSE EQ/FO/INDEX/CUR); used as the lookup key for quotes, candles, option chain, and watchlist operations.

### paise
- Definition：Monetary unit used everywhere in the system — prices, capital, ledger entries are stored as integer paise (₹ × 100) to avoid floating-point rounding.

### market feed
- Definition：Pluggable upstream market-data source selected by `MARKET_FEED`; defaults to `simulator` (synthetic ticks) and switches to `upstox` (live WSS) in production. Can be reconfigured at runtime via Admin → Upstox integration without redeploy.
- Aliases：feed mode、market data source

### option chain
- Definition：Strike-level view of CE/PE contracts built from the instrument master around a spot price; optional `atmSpan` narrows strikes for UI performance.

### watchlist
- Definition：Per-tab list of instruments grouped by STOCKS / INDICES / OPTIONS / CURRENCY tabs, backed by the full instrument master search.
