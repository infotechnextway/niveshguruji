---
kind: external_dependency
name: Redis — event bus, locks, rate limiting, quote cache
slug: redis
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

Redis (image `redis:7-alpine`, mounted to `redis-data`, with AOF enabled and `noeviction` policy) is deployed alongside the app via docker-compose and consumed by both `api` and `engine` processes through `ioredis`. It serves four durable roles: (1) Redis Pub/Sub event bus for cross-process events, (2) distributed locks such as `lock:account:<challengeId>` and `lock:activate:<orderId>`, (3) last-quote cache per instrument with 24h TTL, and (4) throttling storage via the shared `redis-throttler.storage`. Production also mounts a separate `kyc-storage` volume for encrypted KYC documents.