# AGENTS.md

## Cursor Cloud specific instructions

RIDGELINE CAPITAL is an Indian paper-trading / trader-evaluation platform. It runs as
**three long-lived dev processes** backed by **MongoDB** and **Redis**. Standard commands
live in `README.md`, `backend/package.json`, and `frontend/trader/package.json` — this
section only captures the non-obvious startup/run caveats.

### Services

| Service | Dir | Dev command | Port | Notes |
|---|---|---|---|---|
| API (REST + `/api/v1`) | `backend` | `npm run start:api:dev` | 4000 | `GET /health` reports mongo/redis status |
| Engine (feed, VEE, evaluators) | `backend` | `npm run start:engine:dev` | 4100 | `MARKET_FEED=simulator` emits synthetic quotes with no credentials |
| Trader web (user + admin) | `frontend/trader` | `npm run dev` | 3075 | Next 14; proxies `/api/*` → `http://localhost:4000` (see `next.config.mjs`) |

### Startup order (fresh VM)

MongoDB and Redis are installed in the VM image but are **not started on boot**. Start
them before the backend:

- `sudo service mongod start` (or `sudo -u mongodb mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --fork`)
- `sudo service redis-server start`

Config/instruments/dev-trader are already seeded in the persisted `pts` database. Re-run
`npm run bootstrap:dev` only against a fresh/empty Mongo (it is idempotent / insert-only).

### Env loading gotcha (important)

- The **api/engine** load `backend/.env` automatically via `ConfigModule.forRoot` (dotenv).
- The **plain `ts-node` seed scripts** (`bootstrap:dev`, `seed:*`, `generate:keys`) do **not**
  load `.env`. Export it first: `set -a; source backend/.env; set +a` before running them,
  otherwise they fail with `MONGO_URI is required`.

### `next build` gotcha (important)

Do **not** have `NODE_ENV=development` exported when running the frontend `npm run build`.
If the backend `.env` was sourced into the shell (see above), that value leaks in and
`next build` uses the React dev runtime during static generation, failing with
`<Html> should not be imported outside of pages/_document` / `Cannot read properties of null
(reading 'useContext')`. Run the frontend build in a clean shell (or `unset NODE_ENV`); the
build is clean and prerenders all pages.

### Lint / typecheck

There is **no ESLint config committed**, so `frontend/trader` `npm run lint` (`next lint`)
prompts interactively and hangs in non-interactive shells. Use **`npm run typecheck`** as the
type/lint gate for both apps. Backend has no lint script — its gates are `npm run typecheck`
and `npm test` (Jest). `backend/npm run build` compiles both nest apps.

### Trading requires an open market window

Order placement is gated by market hours (`market.window.EQ`, evaluated in `Asia/Kolkata`;
default `09:15`–`15:30`). The simulator emits quotes 24/7, so to place a fill outside those
hours, widen the window and hot-reload the running processes' config cache:

```
mongosh "mongodb://127.0.0.1:27017/pts" --quiet --eval 'db.app_config.updateOne({key:"market.window.EQ"},{$set:{value:{open:"00:00",close:"23:59"}}},{upsert:true})'
redis-cli publish config:invalidate market.window.EQ
```

(`AppConfigService` caches config in memory at boot and only reloads a key when it receives
that `config:invalidate` message.)

### Dev credentials (after seeding)

- Trader: `trader@test.local` / `TestPass123!`
- Admin (super admin, TOTP not yet enabled): `admin@ridgeline.local` / `AdminPass1234!`
