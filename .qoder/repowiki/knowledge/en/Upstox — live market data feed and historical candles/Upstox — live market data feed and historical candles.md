---
kind: external_dependency
name: Upstox — live market data feed and historical candles
slug: upstox
category: external_dependency
category_hints:
    - vendor_identity
    - sdk_real_api
scope:
    - '**'
---

Upstox is the production market-data upstream when `MARKET_FEED=upstox`. The engine connects via Upstox WSS using protobuf frames from the official MarketDataFeed V3 schema and falls back to JSON control frames; it reconnects with exponential backoff. Historical OHLC candles are fetched through the Upstox v2 history API (intraday for today). The full instrument master is downloaded from `https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz` and mapped into Mongo. Credentials (`UPSTOX_ACCESS_TOKEN`, `UPSTOX_API_KEY`, `UPSTOX_API_SECRET`) can be set at boot or hot-reloaded via Admin → Upstox integration.