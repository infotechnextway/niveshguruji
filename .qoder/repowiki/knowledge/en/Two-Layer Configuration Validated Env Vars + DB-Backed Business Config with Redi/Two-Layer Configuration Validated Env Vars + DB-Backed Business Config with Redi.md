---
kind: configuration_system
name: 'Two-Layer Configuration: Validated Env Vars + DB-Backed Business Config with Redis Hot Reload'
category: configuration_system
scope:
    - '**'
source_files:
    - backend/libs/shared/src/config/env.schema.ts
    - backend/libs/shared/src/config/config-keys.ts
    - backend/libs/shared/src/config/app-config.service.ts
    - backend/libs/shared/src/config/app-config.schema.ts
    - backend/scripts/seed-config.ts
    - backend/apps/api/src/main.ts
    - backend/apps/engine/src/main.ts
    - backend/.env.example
    - deploy/.env.example
    - frontend/trader/.env.example
---

## What system/approach is used

The backend uses a **two-layer configuration model**:

1. **Infrastructure environment variables** — validated at process boot using `zod` schemas (`backend/libs/shared/src/config/env.schema.ts`). The `validateEnv` function rejects the process if required keys (e.g. `MONGO_URI`, `JWT_PRIVATE_KEY_B64`, `JWT_PUBLIC_KEY_B64`, `DATA_ENC_SECRET`, `OTP_PEPPER`) are missing or invalid, and enforces cross-field constraints (e.g. `MSG91_AUTH_KEY`/`MSG91_TEMPLATE_ID` required when `SMS_PROVIDER=msg91`; SMTP URL required for `MAIL_PROVIDER=smtp`; all three Razorpay keys required when `PAYMENT_PROVIDER=razorpay`).
2. **Business/runtime configuration** — stored in a MongoDB collection `app_config` and accessed via `AppConfigService`. Each key is declared in a central registry (`config-keys.ts`) with its Zod schema, default value, and description. Values are read from an in-memory cache; writes persist to Mongo, update the cache, and publish an invalidation message on a Redis channel so every running instance (API + Engine) reloads the key.

Environment variable loading is delegated to NestJS's built-in `@nestjs/config` (`ConfigService.getOrThrow`), which reads from `.env` files automatically. The frontend Next.js app reads its own runtime config from `NEXT_PUBLIC_API_ORIGIN` and `NEXT_PUBLIC_WS_URL` via `frontend/trader/.env.local`.

## Key files and packages

- `backend/libs/shared/src/config/env.schema.ts` — Zod schema defining every infrastructure env var, defaults, and cross-field validation rules.
- `backend/libs/shared/src/config/config-keys.ts` — Central registry of all business config keys (`market.window.*`, `trading.squareoff.*`, `auth.otp.*`, `plan.allowMultipleActiveChallenges`, etc.), each with a Zod schema, default, and description.
- `backend/libs/shared/src/config/app-config.service.ts` — In-memory cached service that loads all keys from Mongo on startup, subscribes to a Redis pub/sub channel (`config:invalidate`), and provides typed `get()` / `set()` accessors.
- `backend/libs/shared/src/config/app-config.schema.ts` — Mongoose schema for the `app_config` collection (`key`, `value`, `updatedBy`).
- `backend/scripts/seed-config.ts` — Idempotent script that inserts registry defaults into `app_config` using `$setOnInsert` so admin overrides are never overwritten.
- `backend/apps/api/src/main.ts` and `backend/apps/engine/src/main.ts` — Bootstrap entry points that use `ConfigService` to read `API_PORT`, `ENGINE_PORT`, `CORS_ORIGINS`, and start the processes.
- `backend/.env.example` and `deploy/.env.example` — Complete reference of all env vars for local dev and Docker Compose deployments.
- `frontend/trader/.env.example` — Frontend-only env vars (`NEXT_PUBLIC_*`).

## Architecture and conventions

- **Fail-fast boot**: Infrastructure config is parsed and validated before any module initializes. A missing or malformed `MONGO_URI`, JWT keypair, or encryption secret stops the process immediately rather than failing later.
- **Strict separation of concerns**: Infrastructure secrets and deployment knobs live in env vars; business numbers (trading windows, slippage, charge models, OTP TTLs, challenge behavior) live in the `app_config` collection. This is documented as NFR-8 in the code comments.
- **Centralized key registry**: Every business config key must be added to `CONFIG_REGISTRY` in `config-keys.ts` — there is no ad-hoc string-key lookup elsewhere. The registry supplies type-safe `ConfigKey` union types and `ConfigValue<K>` inference so callers get compile-time guarantees.
- **Hot-reload across instances**: `AppConfigService.onModuleInit` loads all rows into a `Map` cache, then subscribes to Redis channel `config:invalidate`. When `set(key, value, updatedBy)` is called, it publishes the key name on that channel; every subscriber reloads just that key from Mongo and updates its cache. This keeps multi-instance API and Engine services consistent without restarts.
- **Schema enforcement on both read and write**: Stored values are re-parsed through the registry's Zod schema on load (unknown/malformed values are logged and fall back to defaults); writes are validated before persisting.
- **Seed-first defaults**: `seed-config.ts` runs once per environment to populate `app_config` with registry defaults. It uses `$setOnInsert` so existing admin-tuned values are preserved on re-run.
- **Frontend env is separate**: The Next.js app has its own `.env.local` with only public-facing URLs (`NEXT_PUBLIC_API_ORIGIN`, `NEXT_PUBLIC_WS_URL`). These are not shared with the backend.

## Conventions and constraints

- **Never inline business numbers in code** — the registry comment states this explicitly: adding a business number means adding it to `CONFIG_REGISTRY`, never hardcoding it in domain logic.
- **Required env vars cannot be omitted** — `validateEnv` throws during boot if `MONGO_URI`, `JWT_PRIVATE_KEY_B64`, `JWT_PUBLIC_KEY_B64`, `DATA_ENC_SECRET`, or `OTP_PEPPER` are missing. Cross-field constraints enforce provider-specific requirements (Msg91 SMS, SMTP mail, Razorpay payments).
- **Unknown stored keys are ignored safely** — `reloadAll` skips entries whose key is not registered, preventing unknown Mongo data from crashing the process.
- **Defaults always exist** — every registry entry has a `default`; `get()` returns the default when no row exists in Mongo, so callers never see undefined.
- **Admin-only mutation path** — `set()` requires an `updatedBy` identity string; the seed script uses the literal `'seed'`. There is no public API endpoint exposed here — mutations go through the admin layer which persists via this service.
- **Deployment env templates are authoritative** — `backend/.env.example` documents all backend vars; `deploy/.env.example` documents the production Docker Compose set; `frontend/trader/.env.example` documents frontend vars. New env vars should be added to these templates alongside their schema definition.