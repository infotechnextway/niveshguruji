---
kind: dependency_management
name: npm-based Monorepo Dependency Management with Lockfiles and CI Pinning
category: dependency_management
scope:
    - '**'
source_files:
    - backend/package.json
    - backend/package-lock.json
    - frontend/trader/package.json
    - frontend/trader/package-lock.json
    - .github/workflows/ci.yml
    - backend/Dockerfile
    - deploy/docker-compose.yml
---

## System / Approach

The repository uses **npm** as the package manager across two independent Node.js projects — a NestJS backend (`backend/`) and a Next.js frontend (`frontend/trader/`). There is no npm workspaces monorepo setup; each project manages its own `package.json` and `package-lock.json` independently. No vendoring, private registries, or `GOPRIVATE`-style configuration exists.

## Key Files

- `backend/package.json` — declares runtime dependencies (NestJS ecosystem, Mongoose, ioredis, protobufjs, razorpay, pino, etc.) and dev dependencies (Jest, ts-jest, TypeScript, @types/*). Internal shared code lives in `backend/libs/shared` and is referenced via the `@app/shared` path alias configured in Jest's `moduleNameMapper`, not via npm packages.
- `backend/package-lock.json` (lockfileVersion 3) — pins every transitive dependency tree for reproducible installs.
- `frontend/trader/package.json` — declares Next.js 14, React 18, lightweight-charts, framer-motion, zustand, three.js stack.
- `frontend/trader/package-lock.json` — locks the frontend dependency tree.
- `.github/workflows/ci.yml` — pins the install to `npm ci` using `cache-dependency-path: backend/package-lock.json` and `node-version: 20`, ensuring deterministic builds.
- `backend/Dockerfile` — copies both `package.json` and `package-lock.json*` into the image and runs `npm ci` (build stage) and `npm ci --omit=dev` (production runtime), then deletes build-time deps and cleans the npm cache.
- `deploy/docker-compose.yml` — orchestrates the built images alongside Redis and Nginx; does not manage JS dependencies itself.

## Architecture and Conventions

- **Per-project manifests**: Each subproject owns its own dependency surface. The backend bundles two Nest apps (`api`, `engine`) plus a shared library under `libs/shared`, but they are resolved through TypeScript path aliases (`@app/shared`) rather than published npm packages.
- **Caret ranges for major/minor, exact for critical libs**: Runtime deps mostly use caret ranges (e.g. `^10.4.0` for Nest packages) allowing patch-level updates, while some libraries like `lightweight-charts` and `next` are pinned to exact versions (`4.1.3`, `14.2.5`). Dev dependencies follow similar patterns.
- **Lockfiles are committed**: Both `package-lock.json` files are tracked in version control, so `npm ci` produces identical trees on CI and production.
- **CI enforces lockfile-only installs**: The workflow uses `npm ci` (not `npm install`) and caches the lockfile-backed dependency tree, preventing drift between local and CI environments.
- **Docker multi-stage build isolates dev deps**: The production image installs only runtime dependencies (`--omit=dev`) and removes native build toolchain (`python3 make g++`) after compilation, keeping the final image small.
- **No workspace sharing**: Although the backend contains `apps/` and `libs/`, there is no `workspaces` field in any manifest, so each directory is treated as an independent npm project during install.

## Conventions and Constraints

- **Node version pinning**: CI and Dockerfiles both target Node 20 (`node-version: 20`, `FROM node:20-alpine`), constraining the runtime environment for all dependency resolution.
- **Deterministic installs required**: CI and Docker builds rely on `npm ci`, which will fail if `package-lock.json` is out of sync with `package.json`; this enforces that dependency changes must be committed together with their lockfile updates.
- **No private registry or scoped auth**: All dependencies resolve from the public `registry.npmjs.org` (visible in lockfile `resolved` URLs); no `.npmrc` or `npmrc` configuration was found.
- **Internal modules stay internal**: Cross-app sharing within the backend is done via TypeScript path mapping (`"^@app/shared(|/.*)$": "<rootDir>/libs/shared/src/$1"`) rather than publishing a local package, avoiding inter-package versioning concerns.