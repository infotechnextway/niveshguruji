# P2 — KYC + Admin base: Design, API Reference & Runbook

## Modules delivered
`backend/apps/api/src/modules/admin/` and `.../kyc/` (Clean Architecture per §7.2).

### RBAC engine (M10 core)
- **Permission catalog** (`admin/domain/permissions.ts`) — a platform-wide, forward-declared set of keys covering P2–P10 (`users.*`, `kyc.*`, `employees.*`, `roles.manage`, `config.manage`, `audit.view`, `plans.manage`, `payments.*`, `instruments.manage`, `challenges.view`, `rewards.*`, `reports.view`, `support.tickets`, and `*`). Declaring them now keeps role definitions stable as later modules attach handlers.
- **Six default roles** seeded insert-only on boot: SUPER_ADMIN (`*`, locked/uneditable), ADMIN, FINANCE, KYC, SUPPORT, OPERATIONS.
- **Resolution** = `union(role grants) ∪ permAllow − permDeny`. **Deny always wins**, including over `*` — so `permDeny: ['*']` is an instant lockout even for a super admin. Pure function, exhaustively unit-tested.
- **`PermissionsGuard`** runs after `EmployeeAuthGuard`, reads `@RequirePermissions(...)`, and resolves against the **live** employee record — role/override/disable changes take effect immediately, not at token expiry. `RoleCacheService` keeps the role→permissions map hot (refreshed on every mutation + every 60s).

### Admin services
- **EmployeeAdminService** — list/create/update employees, per-user allow/deny overrides, password reset, and role permission editing. Guards against self-lockout (can't disable or demote your own super-admin account) and against editing the locked SUPER_ADMIN role. Every mutation → audit with before/after.
- **UserAdminService** — paginated search (regex-escaped), 360° detail (profile + active sessions + recent logins; grows with later modules), suspend (revokes all sessions) / unsuspend (restores to the correct verification state).
- **ConfigAdminService** — exposes the P0 business-config registry; writes are validated against each key's zod schema and audited. This is how Operations tunes drawdown anchors, square-off times, charges, etc. without a deploy (NFR-8).

### KYC pipeline (M2)
- **Pure state machine** (`kyc/domain/kyc-state.ts`): `SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED`. Illegal transitions are impossible by construction; exhaustively tested.
- **Encrypted document store** — each uploaded file is AES-256-GCM encrypted (random IV, auth tag) and written to `STORAGE_DIR/kyc` under an opaque UUID path (nothing about the user or doc type leaks from the filesystem). PAN is field-encrypted. Path traversal is blocked on read.
- **Submission** requires PAN (format-validated) + all four documents (PAN, ID proof, address proof, selfie), each ≤5 MB and JPG/PNG/PDF only. A partial-unique index enforces one live application per user.
- **Reviewer flow** — queue (oldest first), detail, streamed decrypted document view (`no-store`, never cached), claim → approve/reject with reason. Claiming binds the reviewer; another officer can't approve someone else's claimed application. Each action mirrors the user's `kycStatus` and writes audit.

## API reference (`/api/v1`)
Envelope on every response. 🔒(EMP) = employee JWT + listed permission.

### User KYC (user JWT)
| Method & Path | Body | Notes |
|---|---|---|
| GET `/kyc/status` | — | current kycStatus + latest application summary |
| POST `/kyc/submit` | multipart: `panNumber`, files `pan`,`idProof`,`addressProof`,`selfie` | 5 MB/file, JPG/PNG/PDF; 409 if one is already pending |

### Admin KYC 🔒(EMP)
| Method & Path | Perm | Notes |
|---|---|---|
| GET `/admin/kyc/queue?status=&page=&pageSize=` | kyc.view | defaults to SUBMITTED+UNDER_REVIEW |
| GET `/admin/kyc/:id` | kyc.view | full application + user |
| GET `/admin/kyc/:id/document/:type` | kyc.view | streams decrypted doc inline |
| POST `/admin/kyc/:id/claim` | kyc.review | → UNDER_REVIEW, binds reviewer |
| POST `/admin/kyc/:id/approve` | kyc.review | → APPROVED, user kycStatus=APPROVED |
| POST `/admin/kyc/:id/reject` `{reason}` | kyc.review | → REJECTED, resubmission allowed |

### Admin core 🔒(EMP)
| Method & Path | Perm |
|---|---|
| GET `/admin/employees` / POST `/admin/employees` / PATCH `/admin/employees/:id` / POST `/admin/employees/:id/reset-password` | employees.view / employees.manage |
| GET `/admin/roles` / PUT `/admin/roles/:key` / GET `/admin/permissions` | employees.view / roles.manage |
| GET `/admin/users?search=&page=&pageSize=` / GET `/admin/users/:id` | users.view |
| POST `/admin/users/:id/suspend` / `/unsuspend` `{reason}` | users.suspend |
| GET `/admin/config` / PUT `/admin/config` `{key,value}` | config.manage |
| GET `/admin/audit-logs?entity=&entityId=` or `?actorId=` | audit.view |

## New environment
- `DATA_ENC_SECRET` (≥16 chars, **required**) — key material for all at-rest AES-256-GCM encryption (KYC docs, PAN, and employee TOTP secrets now migrate to this from OTP_PEPPER). Generate: `openssl rand -hex 32`.
- `STORAGE_DIR` (default `./data`) — root for encrypted document storage. In Docker this must be a persistent volume (added to compose).

## Testing
- **Unit (local + CI):** 55 passing — includes deny-wins resolution across 8 scenarios, KYC transition legality (happy path, premature approve/reject, double-claim, terminal states), and document encryption round-trip/tamper/wrong-key.
- **e2e (CI only, self-skips locally):** boots the real ApiModule against Mongo+Redis service containers. Covers registration→envelope→verification gating→activation→login, refresh rotation + reuse detection over HTTP, and RBAC denial (SUPPORT blocked from KYC queue, KYC officer allowed, unauthenticated 401). Run locally with `E2E_MONGO_URI=... E2E_REDIS_URL=... npm run test:e2e`.

## Verified this session
Strict tsc clean; 55/55 unit tests green; e2e harness loads and self-skips without Mongo; production build emits both bundles; Docker build validated in CI. CI now has a dedicated `e2e` job with Mongo 7 + Redis 7 services.
