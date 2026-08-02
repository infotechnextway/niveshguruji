# P0 — Foundation: Design & Runbook

## What P0 delivers
The platform layer every later module (AUTH → RWD) plugs into, with zero business features and zero throwaway code:

| Component | Location | Purpose |
|---|---|---|
| Shared kernel | `backend/libs/shared/src/kernel` | `Result`/`DomainError`, `Money` (integer paise, ADR-4), `Quantity` (lot-size aware), `DomainEvent`/`EventBus` contract |
| Business config | `libs/shared/src/config` | zod-validated env (fail-fast boot) + `AppConfigService`: DB-backed key registry with in-memory cache and cluster-wide Pub/Sub invalidation. **Every business number lives in `config-keys.ts` — NFR-8 enforced by convention + review** |
| Redis platform | `libs/shared/src/redis` | client providers, `RedisEventBus` (ADR-2), `RedisLockService` (SET NX PX + Lua release — the ADR-3 primitive the VEE will use) |
| HTTP contract | `libs/shared/src/http` | `EnvelopeInterceptor` (`{success:true,data}`), `AppException`, `GlobalExceptionFilter` (`{success:false,error:{code,message,details}}`, no internals leakage) |
| Rate limiting | `libs/shared/src/rate-limit` | Redis-backed `ThrottlerStorage` shared across api instances; supports block-duration for strict auth limits in P1 |
| Audit | `libs/shared/src/audit` | Write-once `AuditService.record()`; failures never abort business ops but alert loudly (NFR-7) |
| Exchange calendar | `libs/shared/src/calendar` | IST clock, trading-day + market-window authority; windows from config, holidays from `market_holidays` (admin-managed, seeded for 2026) |
| Health | `libs/shared/src/health` | `/health` = Mongo ping + Redis ping, 503 otherwise |
| Apps | `apps/api`, `apps/engine` | Two Nest applications sharing `@app/shared` (ADR-1). Engine ships a 15s heartbeat event proving cross-process Pub/Sub |
| Seed | `scripts/seed-config.ts` | Idempotent: config defaults ($setOnInsert — never overwrites admin values) + 2026 NSE/BSE holidays |
| Deploy | `deploy/` | docker-compose (redis + api + engine + nginx), hardened Nginx with WS routing pre-wired for P4, `.env.example` |
| CI | `.github/workflows/ci.yml` | npm ci → typecheck → tests → build → docker build |

## Verified in this session
- `tsc --noEmit` clean across the monorepo (strict mode).
- 20/20 unit tests pass (Money rounding/overflow/Indian formatting, lot-size validation, Result laws, IST date-roll, envelope/error contract, env fail-fast).
- `nest build` emits both runnable bundles; boot without `MONGO_URI` fails fast with a readable message.

## Runbook (VPS)
1. **Prereqs:** Docker + Compose plugin; DNS A record → VPS; MongoDB Atlas cluster with the VPS IP allow-listed.
2. `git clone` the repo; `cd deploy && cp .env.example .env` and fill `MONGO_URI`, `CORS_ORIGINS`.
3. **TLS (one-time):** `docker volume create certbot-certs`, then issue certs:
   `docker run --rm -p 80:80 -v certbot-certs:/etc/letsencrypt certbot/certbot certonly --standalone -d YOUR_DOMAIN`
   and `sed -i 's/YOUR_DOMAIN/your.domain/g' nginx/site.conf`.
4. **Seed:** `cd ../backend && MONGO_URI='...' npm run seed:config` (or run inside the api container). Verify the 2026 holiday list against the official exchange circular.
5. `cd ../deploy && docker compose up -d --build`.
6. **Exit criterion:** `curl https://YOUR_DOMAIN/health` → `{"success":true,...}` wrapped? No — `/health` bypasses the prefix and returns the raw report `{"status":"ok",...}`; both `api` and `engine` containers report healthy in `docker compose ps`.
7. Renewals: monthly cron `docker run --rm -p 80:80 -v certbot-certs:/etc/letsencrypt certbot/certbot renew` during a low-traffic window + `docker compose exec nginx nginx -s reload`.

## Conventions locked for all future modules
- Feature modules live in `apps/api/src/modules/<context>` (or engine) with `domain / application / infrastructure / presentation` folders (§7.2).
- Controllers return plain data; the envelope and errors are platform concerns.
- Domain code returns `Result`; presentation converts via `AppException.fromDomain`.
- All money in paise (`Money`), all quantities via `Quantity.ofLots`.
- Cross-process signals go through `EVENT_BUS` with namespaced names (`<context>.<entity>.<verb>`).
- Every admin mutation calls `AuditService.record()` — reviewers reject PRs that skip it.
- New business numbers are added to `CONFIG_REGISTRY`, never inlined.
