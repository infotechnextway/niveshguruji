---
kind: build_system
name: NestJS Monorepo Build, Docker Packaging & GitHub Actions CI
category: build_system
scope:
    - '**'
source_files:
    - .github/workflows/ci.yml
    - backend/Dockerfile
    - deploy/docker-compose.yml
    - deploy/nginx/nginx.conf
    - deploy/nginx/site.conf
    - backend/package.json
    - backend/nest-cli.json
    - backend/tsconfig.build.json
    - backend/test/e2e/jest-e2e.json
    - frontend/trader/package.json
    - frontend/trader/next.config.mjs
---

## Build System Overview

The repository uses a **NestJS monorepo** (via `nest-cli.json`) with two backend applications (`apps/api` and `apps/engine`) sharing a `libs/shared` library, plus a separate Next.js frontend (`frontend/trader`). There is no top-level Makefile; build orchestration lives in npm scripts, the Nest CLI, and GitHub Actions.

### Backend build pipeline
- **Toolchain**: Node 20, TypeScript 5.5, NestJS CLI 10, ts-jest 29 for unit tests, Jest for e2e.
- **Build command**: `npm run build` runs `nest build api && nest build engine`, producing compiled output under `dist/apps/api` and `dist/apps/engine`. The shared library is built as part of each app via `tsconfig.build.json`.
- **Type checking**: `npm run typecheck` (`tsc --noEmit`) is executed before tests in CI.
- **Testing**: Unit tests via `jest` (pattern `*.spec.ts`), coverage collected from `libs/**` and `apps/**`; e2e suite via `jest --config test/e2e/jest-e2e.json --runInBand` against live MongoDB 7 and Redis 7 containers.
- **Scripts directory**: `backend/scripts/` contains seeders (`seed-admin.ts`, `seed-config.ts`, `seed-instruments.ts`, `seed-trader.ts`), dev bootstrap (`bootstrap-dev.ts`), key generation (`generate-keys.ts`), and instrument sync utilities — all invoked via `ts-node -r tsconfig-paths/register ...`.

### Containerization
- **Dockerfile** (`backend/Dockerfile`) is a multi-stage build:
  - **build stage** (`node:20-alpine`): installs `python3 make g++` (for native deps like `argon2`), runs `npm ci`, then `nest build`.
  - **runtime stage** (`node:20-alpine`): creates a non-root `app` user, installs production-only deps (`npm ci --omit=dev`), copies only `dist/` from the build stage, and cleans caches.
  - **Process selection**: the runtime entrypoint is `node dist/apps/${APP_PROCESS:-api}/src/main.js`, controlled by the `APP_PROCESS` env var — same image serves both the API server (port 4000) and the background engine (port 4100).
- **docker-compose** (`deploy/docker-compose.yml`) defines four services: `redis` (with appendonly + 1gb maxmemory), `api`, `engine`, and `nginx` (1.27-alpine). `api` and `engine` are built from `../backend` using the same Dockerfile but with different `APP_PROCESS` values. Persistent volumes: `redis-data`, `kyc-storage`, and an external `certbot-certs` volume for TLS certs. Health checks probe `/health` on ports 4000 and 4100.
- **Nginx reverse proxy**: configuration mounted from `deploy/nginx/nginx.conf` and `deploy/nginx/site.conf` (not shown here) routes traffic to the API and engine services.

### CI pipeline (GitHub Actions)
- **Trigger**: pushes to `main` and all pull requests.
- **Jobs**:
  - `backend`: Ubuntu runner, Node 20 with npm cache keyed on `backend/package-lock.json`. Runs `npm ci`, `npm run typecheck`, `npm test -- --ci`, `npm run build`, then validates the Dockerfile by running `docker build -t pts-backend:ci .`.
  - `e2e`: Same setup, spins up `mongo:7` and `redis:7` as GitHub Actions services, sets `E2E_MONGO_URI` and `E2E_REDIS_URL`, then runs `npm run test:e2e`.
- No deployment step is present in CI; artifacts are not published to a registry.

### Frontend build
- Standalone Next.js 14 app under `frontend/trader/` with its own `package.json`. Scripts: `dev` (Next dev on 127.0.0.1:3075), `build` (`next build`), `start` (`next start`), `lint`, `typecheck`.
- Not included in the GitHub Actions CI workflow; builds are presumably done locally or via Vercel (a `.vercel/` directory exists).

### Versioning
- Both `backend/package.json` and `frontend/trader/package.json` declare `"version": "0.1.0"`. There is no automated version bump script or tag-based release process visible in the repo.

### Conventions observed
- All Node tooling targets Node 20 consistently across CI, Dockerfile, and lockfiles.
- Production images run as a non-root user (`USER app`).
- Secrets and config are injected exclusively via environment variables (see `deploy/.env.example` and `backend/.env.example`); no secrets are committed.
- The single Docker image is reused for both processes via the `APP_PROCESS` environment variable rather than maintaining separate images.