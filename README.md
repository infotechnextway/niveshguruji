# RIDGELINE CAPITAL — Indian Paper Trading Simulator

Challenge-based paper trading and trader-evaluation platform for the Indian market (NSE / BSE / indices / options / currency). **Not a broker. Not an exchange. All trades are virtual.**

Backend and web frontend are both in this repo. Backend is production-quality through P6 (109 unit tests green); frontend is the institutional-modern web app (user + admin, light + dark, 22 pages, `next build` clean).

## Repo layout

```
backend/                  NestJS modular monolith
├── apps/api/             REST + WebSocket surface
├── apps/engine/          Feed ingestion, VEE, evaluators, schedulers
└── libs/shared/          Kernel, config, redis, auth, kyc, plans,
                          market, trading, challenge, reward modules

frontend/trader/          Next.js 14 web app (user + admin)
├── src/app/              Route tree — user pages + /admin/*
├── src/components/       AppHeader, dashboard/, admin/, Terminal parts
├── src/lib/              theme, auth, api, quote-store, types, format
└── src/styles/           Design tokens (light + dark)

deploy/                   docker-compose + nginx for Ubuntu VPS
docs/                     SRS + phase docs P0-P6 + frontend design doc
.github/workflows/        CI (typecheck + tests, backend + frontend)
```

## Quick start (dev)

**Backend** — needs MongoDB (Atlas is fine) and Redis:
```bash
cd backend
npm install
export MONGO_URI='mongodb+srv://…' REDIS_URL='redis://localhost:6379'
export JWT_PRIVATE_KEY_B64='…' JWT_PUBLIC_KEY_B64='…' DATA_ENC_SECRET='…'
npm run seed:config
npm run seed:instruments
npm run start:api:dev       # http://localhost:4000/health
npm run start:engine:dev    # http://localhost:4100/health
npm test                    # 109 unit tests
```

**Frontend** — proxies `/api/*` to the backend:
```bash
cd frontend/trader
npm install
npm run dev                 # http://localhost:3000
npm run typecheck           # strict TS pass
npm run build               # 22 static pages
```

The frontend defaults to demo mode when no session is present, so you can browse the entire user + admin app without the backend running — the "Try the demo dashboard" button on `/login` sets this up.

## Route map

**User (top-nav)** — `/dashboard`, `/terminal`, `/orders`, `/holdings`, `/positions`, `/challenge`, `/funds`, `/settings`, `/login`

**Admin (sidebar-nav)** — `/admin/kyc`, `/admin/rewards`, `/admin/users`, `/admin/plans`, `/admin/employees`, `/admin/config`, `/admin/audit`, `/admin/instruments`

## Phase status

- [x] **P0 Foundation** — platform module, config registry (DB-backed), Redis event bus + locks, calendar, audit
- [x] **P1 Identity & Access** — register→OTP→email→login, opaque rotating refresh tokens with family reuse-revocation, RS256 JWTs, Argon2, admin TOTP
- [x] **P2 KYC & Admin base** — deny-wins RBAC, employee/user/config/audit services, AES-GCM encrypted KYC documents, reviewer queue
- [x] **P3 Plans & Payments** — plan CRUD with rule versioning, Razorpay + manual providers, idempotent lock-guarded plan activation crediting virtual capital exactly once, refunds
- [x] **P4 Market Data** — Upstox WSS feed + deterministic simulator, room-per-instrument WS fan-out, 1m candle aggregator, watchlist, option chain, expiries
- [x] **P5 Trading Core (VEE)** — single-writer-per-account under lock, pure position math, market + limit orders, resting-limit tick fills, SL/Target mutual exclusion, live MTM, intraday auto-square-off, append-only ledger
- [x] **P6 Challenge & Reward** — real-time evaluator (daily-DD → max-DD → expiry → target+min-days), terminal side effects (FAIL: force-flatten + lock, PASS: freeze + eligible reward), reward admin approve/reject/mark-paid, override + audit
- [x] **Frontend web** — institutional-modern user + admin apps with real light+dark theme system

## Next up

- Wire real API calls into user dashboard, challenge, positions, orders, holdings, funds
- Drop TradingView Lightweight Charts into `Chart.tsx`
- Add WebSocket subscription to the `/ws` gateway
- Build register / OTP-verify pages for the auth state machine
- Plan-purchase flow
- P7 Statements & notifications · P8 Mobile · P9 Public website + compliance · P10 Hardening

## Architecture at a glance

- Modular monolith, 2 processes: **api** + **engine**
- Redis Pub/Sub event bus for cross-process events
- Single-writer-per-account under `lock:account:<challengeId>` — no race conditions on equity or drawdown
- Money as integer paise everywhere — no floats
- Plan rules snapshotted into challenges — rule changes don't retroactively fail active users
- Config lives in a DB-backed registry (not env), edited via admin UI, audited on every change
