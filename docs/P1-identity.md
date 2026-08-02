# P1 — Identity & Access: Design, API Reference & Runbook

## Module layout (Clean Architecture, §7.2)
`backend/apps/api/src/modules/auth/`
- **domain/** — `auth.types.ts`: `UserStatus` state machine, `KycStatus`, token claims, `TokenPair`, `RequestContext`
- **application/** — `AuthService` (users), `EmployeeAuthService` (admin + TOTP)
- **infrastructure/** — Mongoose schemas (`users`, `sessions`, `otp_requests`, `login_history`, `employees`), `PasswordService` (Argon2id, OWASP params), `TokenService` (RS256 access + purpose JWTs, opaque refresh), `OtpService`, AES-256-GCM `crypto.util`, SMS/Mail ports with MSG91/SMTP + console adapters
- **presentation/** — `AuthController`, `AdminAuthController`, `UserAuthGuard`/`EmployeeAuthGuard`, validated DTOs, strict named throttlers

## Security model
- **Access JWT** RS256, TTL from `auth.accessToken.ttlSeconds` (default 900). Claims: `{sub, actor: USER|EMPLOYEE, typ: 'access', roles?}`. Guards enforce actor type per surface.
- **Refresh tokens** — 48-byte opaque, stored as sha256 only, TTL `auth.refreshToken.ttlDays` (default 30). Rotation = new session row in the same `familyId`; the old row records `replacedByHash`. **Replay of a rotated/expired token revokes the entire family** and writes audit `SESSION_FAMILY_REVOKED_REUSE` — the legitimate holder is logged out too (containment) and must sign in again.
- **OTP** — 6 digits from `crypto.randomInt`, stored as sha256(code+OTP_PEPPER), constant-time compare. Limits from config: TTL 300s, 3 attempts, 5/hour/number, 60s cooldown (all admin-tunable).
- **Email verification / password reset** — stateless RS256 purpose tokens (`typ` enforced). Reset tokens embed a fingerprint of the current password hash → single-use by construction; successful reset revokes every session.
- **Admin TOTP** — otplib v12 authenticator; secret AES-256-GCM encrypted at rest; enable requires proving one valid code. Login: password → (if enabled) TOTP → tokens carrying roles.
- **Login history** records success AND failures with reason (`BAD_PASSWORD`, `BAD_TOTP`, `SUSPENDED`, …); new-device sign-ins trigger an email alert.
- **Rate limits** — credential/OTP endpoints: 5/min then 5-min block (admin login: 10-min block); refresh: 30/min. Enforced via the P0 Redis storage, shared across instances.
- Anti-enumeration: `password/forgot` always returns ok; login failures are uniform `AUTH_FAILED`.

## User state machine
`PENDING_MOBILE → (OTP ok) → PENDING_EMAIL → (email link) → ACTIVE`; `SUSPENDED` set by admin (P2) blocks login with a distinct 403. KYC is a separate axis starting `NOT_SUBMITTED` (P2 consumes it).

## API reference (`/api/v1`)
All responses use the platform envelope. `Authorization: Bearer <access>` where marked 🔒. Optional headers: `X-Device-Id` (device tracking), set by clients.

| Method & Path | Body | Success `data` | Notes |
|---|---|---|---|
| POST `/auth/register` | name, email, mobile(+91…), username, password, referredBy? | `{userId}` | 409 DUPLICATE(field); sends OTP |
| POST `/auth/otp/request` | mobile | `{expiresInSec}` | 429 on cooldown/hourly cap |
| POST `/auth/otp/verify` | mobile, code | `{status}` | moves to PENDING_EMAIL, emails verify link |
| POST `/auth/email/resend` | email | `true` | |
| GET `/auth/email/verify?token=` | — | `{status}` | link target; moves to ACTIVE |
| POST `/auth/login` | identifier(username/email), password | TokenPair | 403 VERIFICATION_PENDING / SUSPENDED |
| POST `/auth/refresh` | refreshToken | TokenPair | 401 SESSION_REVOKED on reuse |
| POST `/auth/logout` | refreshToken | `true` | revokes that session |
| POST `/auth/logout-all` 🔒 | — | `true` | revokes all user sessions |
| POST `/auth/password/forgot` | email | `true` | always ok (no enumeration) |
| POST `/auth/password/reset` | token, newPassword | `true` | kills all sessions |
| GET `/auth/me` 🔒 | — | profile summary | |
| GET `/auth/sessions` 🔒 | — | active sessions | device, ip, ua, created/expiry |
| GET `/auth/login-history` 🔒 | — | last 50 events | US-AUTH-6 |
| POST `/admin/auth/login` | email, password, totpCode? | TokenPair+`totpEnabled` | 403 TOTP_REQUIRED when enabled and code absent |
| POST `/admin/auth/totp/setup` 🔒(EMP) | — | `{otpauthUri}` | scan in authenticator app |
| POST `/admin/auth/totp/enable` 🔒(EMP) | code | `true` | enforced on all future logins |

`TokenPair = {accessToken, accessExpiresInSec, refreshToken, refreshExpiresAt}`.

## New environment (see `deploy/.env.example`)
`APP_BASE_URL`, `JWT_PRIVATE_KEY_B64`, `JWT_PUBLIC_KEY_B64` (run `npm run generate:keys`), `OTP_PEPPER` (≥16 chars), `SMS_PROVIDER=console|msg91` (+`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` — DLT template with `##OTP##` var), `MAIL_PROVIDER=console|smtp` (+`SMTP_URL`, `MAIL_FROM`). Provider pairing is validated at boot.

## Runbook additions
1. `npm run generate:keys` → paste both lines into `deploy/.env`.
2. Set `OTP_PEPPER` (e.g. `openssl rand -hex 24`).
3. `MONGO_URI=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin` — creates the sole SUPER_ADMIN (refuses if employees exist). **First action after first login: TOTP setup + enable.**
4. Production preset MUST set `SMS_PROVIDER=msg91` and `MAIL_PROVIDER=smtp`; console adapters log secrets and are for dev only.

## Verified this session
- 37/37 tests green, strict tsc clean, production build OK.
- Covered: Argon2id round-trip; RS256 sign/verify + token-type confusion rejection; opaque refresh generation; **rotation, family reuse-revocation + audit, expired/unknown rejection** (in-memory harness); OTP range/pepper/timing-safe compare; AES-GCM round-trip, tamper and wrong-key rejection; TOTP contract; env pairing rules.
- Deferred to P2 (as planned): e2e HTTP flows with a live Mongo (testcontainers land with the KYC module), employee CRUD/RBAC resolution, change mobile/email (profile module).
