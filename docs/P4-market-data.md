# P4 — Market Data: Design, API Reference & Runbook

## Module delivered
`backend/apps/api/src/modules/market/` — split into two Nest modules:
- **MarketApiModule** (loaded by `api`) — REST reads: search, quotes, candles (Upstox-backed), option chain, watchlist, instrument admin + sync.
- **MarketEngineModule** (loaded by `engine`) — the ingestion pipeline + client WebSocket gateway.

Shared contracts (`Quote`, `Candle`, cache-key/channel helpers) live in `libs/shared/src/market` so both processes agree on the wire format.

## Design highlights

### One upstream feed, room-per-instrument fan-out (ADR-7)
The engine holds a single `MarketFeed` and subscribes **on demand** when a gateway room gains its first client (refcounted via `MarketDataService.addInterest` / `removeInterest`). Each normalized tick is:
1. written to the Redis last-quote cache (`quote:<key>`, 24h TTL),
2. published on the event bus (`events:quotes.<key>`), and
3. fed to the 1-minute candle aggregator.

The client WebSocket gateway (`/ws`, in the engine — Nginx routes it there) authenticates via JWT on the connection query, primes with the cached last quote, then relays live ticks.

### Feed behind a port
`MarketFeed` adapters:
- **UpstoxFeed** (production, WSS) — protobuf decode via official MarketDataFeed V3 schema (`upstox-protobuf.ts`), JSON fallback for control frames, exponential-backoff reconnect.
- **SimulatorFeed** (dev/test/replay) — seeded walk + `pushTick()` for VEE replay. **Not** used by the trader terminal UI.

Selected by `MARKET_FEED` env.

### Historical candles
`UpstoxHistoryClient` calls Upstox v2 historical (+ intraday for today). `GET /market/candles` requires `UPSTOX_ACCESS_TOKEN` (503 if missing), normalizes to `{t,o,h,l,c,v}`, upserts 1m into `candles_1m`, and merges with live aggregated bars. Intervals: `1minute`, `30minute`, `day`.

### Instrument master
Production sync downloads `https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz`, maps NSE/BSE EQ/FO/INDEX/CUR into Mongo, ensures indexes (`instrumentKey` unique, text `{symbol,name}`, `{segment,enabled}`, `{underlyingKey,expiry,strike}`, `{symbol}`, `{exchange,segment,symbol}`).

- CLI: `MONGO_URI=... npm run sync:instruments`
- Admin: `POST /admin/instruments/sync` (permission `instruments.manage`)
- `seed:instruments` remains for CI smoke only (tiny starter set)

### Option chain
Built from the instrument master; optional `atmSpan` narrows strikes around spot for UI performance.

### Watchlist
One list per tab (STOCKS / INDICES / OPTIONS / CURRENCY).

## Frontend (trader terminal)
- `UpstoxDataFeed` — TradingView-shaped adapter: `onReady`, `resolveSymbol`, `searchSymbols`, `getBars`, `subscribeBars` / `unsubscribeBars`.
- Chart — `lightweight-charts` candlesticks driven by the DataFeed.
- Quote store — engine `/ws` only (no demo ticks on the terminal path).
- Watchlist — API tabs + full-master search + Buy/Sell/View Chart/Option Chain.
- Admin instruments — live list + Sync from Upstox.

## API reference (`/api/v1`, user JWT unless noted)
| Method & Path | Notes |
|---|---|
| GET `/market/search?q=&segment=&exchange=&limit=` | full-master search (default limit 50) |
| GET `/market/instruments/:instrumentKey` | resolveSymbol detail |
| GET `/market/segment/:segment` | list by EQ/FO/CUR/INDEX |
| GET `/market/quotes?keys=k1,k2` | batch last-quote from cache |
| GET `/market/candles?instrumentKey=&from=&to=&interval=` | Upstox-backed OHLC |
| GET `/market/option-chain?underlyingKey=&expiry=&atmSpan=` | CE/PE by strike + spot |
| GET `/market/expiries/:underlyingKey` | available expiries |
| GET/POST/DELETE/PUT `/watchlist/:tab` | watchlist CRUD |
| GET `/admin/instruments` | Operations list |
| POST `/admin/instruments/sync` | Sync master from Upstox |
| PUT `/admin/instruments/:key/enabled` | Toggle enabled |
| GET `/admin/integrations/upstox` | Masked Upstox status (feed mode, token set?) |
| PUT `/admin/integrations/upstox` | Save feed mode + encrypted credentials (hot-reload) |
| POST `/admin/integrations/upstox/test` | Verify access token via Upstox authorize |

### WebSocket (`/ws`, engine)
Connect: `wss://YOUR_DOMAIN/ws?token=<accessJWT>` (local: `ws://localhost:4100/ws`).
- client → `{action:'subscribe'|'unsubscribe', instrumentKeys:[...]}`
- server → `{type:'connected'}`, `{type:'quote', data:Quote}`, `{type:'error', message}`

## Environment
- `MARKET_FEED` / `UPSTOX_*` are **optional boot fallbacks**. Prefer **Admin → Upstox API** to set feed mode + access token dynamically (encrypted in Mongo, Redis hot-reload to api + engine — no redeploy).
- Optional `UPSTOX_API_KEY` / `UPSTOX_API_SECRET` stored for a future token-refresh job.
- Frontend: `NEXT_PUBLIC_WS_URL` (e.g. `ws://localhost:4100/ws`). If unset, localhost defaults to engine `:4100`; production uses same-host `/ws`.
- `NEXT_PUBLIC_API_ORIGIN` (default `http://localhost:4000`) for Next.js API proxy.

## Runbook
1. **Admin → Upstox API**: set feed mode to Upstox, paste access token, Save, Test connection.
2. `MONGO_URI=... npm run sync:instruments` — full Upstox master into Mongo (or Admin → Instruments → Sync from Upstox).
3. For CI/smoke only: `npm run seed:instruments` (tiny set).
4. Confirm engine serves `/ws` and Nginx `/ws` → `engine:4100`.
5. Trader `.env.local`: `NEXT_PUBLIC_WS_URL=ws://localhost:4100/ws`.

## Testing
- Unit: candle aggregation; simulator feed; pipeline smoke; **instrument mapper**; **history parseCandles**; **feed normalizeFeeds**.
- e2e (CI): watchlist add/read/dup/remove; quotes return null when uncached.
- Live Upstox protobuf frames are decoded in `decodeUpstoxFeedMessage` (fixture-normalized via `normalizeFeeds`).
