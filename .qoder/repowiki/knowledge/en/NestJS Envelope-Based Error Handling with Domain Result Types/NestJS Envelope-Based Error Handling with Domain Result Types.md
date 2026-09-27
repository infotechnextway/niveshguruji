---
kind: error_handling
name: NestJS Envelope-Based Error Handling with Domain Result Types
category: error_handling
scope:
    - '**'
source_files:
    - backend/libs/shared/src/kernel/result.ts
    - backend/libs/shared/src/http/app-exception.ts
    - backend/libs/shared/src/http/global-exception.filter.ts
    - backend/libs/shared/src/http/api-envelope.ts
    - backend/libs/shared/src/http/envelope.interceptor.ts
    - backend/apps/api/src/api.module.ts
    - backend/libs/shared/src/http/__tests__/exception-filter.spec.ts
    - backend/apps/api/src/modules/admin/application/config-admin.service.ts
    - backend/apps/api/src/modules/admin/application/employee-admin.service.ts
    - backend/apps/api/src/modules/admin/application/user-admin.service.ts
---

## Overview

The backend uses a layered error-handling strategy built on NestJS, centered around three pillars: (1) a `Result<T>` / `DomainError` type in the domain/application layers that avoids exceptions for business failures, (2) an `AppException` that wraps domain errors into HTTP responses with stable machine-readable codes, and (3) a single `GlobalExceptionFilter` that normalizes every response — success or failure — into a uniform JSON envelope.

## Core Types and Conventions

- **Domain layer**: Errors are represented by `DomainError`, a simple value object carrying a stable `code: string`, a human-readable `message: string`, and optional `details?: Record<string, unknown>`. It is created via `DomainError.of(code, message, details)`.
- **Application/Domain return values**: Functions return `Result<T, E = DomainError>` instead of throwing. `Result.ok(value)` signals success; `Result.fail(error)` carries a `DomainError`. The result exposes `isOk`, `isFail`, `value`, `error`, `map`, and `flatMap` so callers can chain operations without try/catch.
- **Presentation layer boundary**: Controllers convert application-layer results into either `AppException` (via `AppException.fromDomain(domainError, status)`) or plain Nest `HttpException`s. `AppException` extends Nest's `HttpException` and adds a public `code` and optional `details` field, enabling stable machine codes to flow through to the client.
- **Envelope contract**: All successful controller returns are wrapped by `EnvelopeInterceptor` into `{ success: true, data }`. All errors become `{ success: false, error: { code, message, details? } }`. This is the single API contract enforced at the framework edge.

## Centralized Exception Filter

`GlobalExceptionFilter` (`backend/libs/shared/src/http/global-exception.filter.ts`) is registered globally as `APP_FILTER` in `apps/api/src/api.module.ts`:

```ts
{ provide: APP_FILTER, useClass: GlobalExceptionFilter },
```

It implements a strict cascade:

1. `AppException` → use its `status`, `code`, `message`, `details` verbatim.
2. Any other Nest `HttpException` → map `HttpStatus` to a stable string code via `httpStatusToCode` (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE`, `RATE_LIMITED`, or `HTTP_<status>` fallback). Validation arrays become `details`; scalar messages become `message`.
3. Unknown `Error` → log via Nest `Logger` (with stack), set status `500 INTERNAL_SERVER_ERROR`, and return `{ success: false, error: { code: 'INTERNAL', message: 'An unexpected error occurred' } }`.
4. In non-production (`NODE_ENV !== 'production'`), the raw error message is surfaced in the response body for debugging.

This behavior is fully covered by unit tests in `libs/shared/src/http/__tests__/exception-filter.spec.ts`, which assert the mapping from `AppException.fromDomain(DomainError.of(...))`, the `NotFoundException` → `NOT_FOUND` code, and the production vs. development leakage rules.

## Where It Is Used

- **Domain/Application services** consistently return `Result` and throw no exceptions for business logic. Examples include `config-admin.service.ts` (`Result.fail(DomainError.of('UNKNOWN_CONFIG_KEY', ...))`), `employee-admin.service.ts` (`Result.fail(DomainError.of('DUPLICATE', ...))`, `Result.fail(DomainError.of('SELF_LOCKOUT', ...))`, `Result.fail(DomainError.of('ROLE_LOCKED', ...))`), and `user-admin.service.ts` (`Result.fail(DomainError.of('NOT_FOUND', ...))`).
- **Controllers** translate these into `AppException` or Nest `HttpException`s; they never catch and rethrow manually because the global filter handles everything.
- **Enforcement source**: The global registration in `api.module.ts` plus the envelope interceptor ensure every HTTP response conforms to the `ApiEnvelope<T>` shape defined in `libs/shared/src/http/api-envelope.ts`.

## Architecture Decisions

| Decision | Rationale / Evidence |
|---|---|
| No thrown exceptions in domain/app layers | `Result<T>` comment explicitly states "explicit success/failure without exceptions in the domain layer" and that only the presentation layer converts failures into HTTP errors. |
| Stable machine-readable error codes | `DomainError.code` + `AppException.code` + `httpStatusToCode` produce codes like `QTY_LOT_MISMATCH`, `DUPLICATE`, `NOT_FOUND`, `RATE_LIMITED` consumed by clients. |
| Single error-shape envelope | `ApiSuccess` / `ApiFailure` discriminated union ensures clients branch on `success` rather than HTTP status alone. |
| Production safety | Unknown errors are logged but never leak stack traces in production; only the generic `INTERNAL` message is returned. |
| Framework integration via filters/interceptors | Nest's `@Catch()` filter and `NestInterceptor` enforce the convention uniformly across all controllers without per-handler boilerplate. |

## Key Files

- `backend/libs/shared/src/kernel/result.ts` — `DomainError` and `Result<T>` types used throughout domain/application code.
- `backend/libs/shared/src/http/app-exception.ts` — `AppException` bridging domain errors to Nest HTTP exceptions with stable codes.
- `backend/libs/shared/src/http/global-exception.filter.ts` — Global `@Catch()` filter that normalizes all errors into the envelope and enforces production safety.
- `backend/libs/shared/src/http/api-envelope.ts` — `ApiSuccess` / `ApiFailure` discriminated union defining the response contract.
- `backend/libs/shared/src/http/envelope.interceptor.ts` — Wraps all successful controller returns into `{ success: true, data }`.
- `backend/apps/api/src/api.module.ts` — Registers `GlobalExceptionFilter` as `APP_FILTER` and applies the envelope interceptor.
- `backend/libs/shared/src/http/__tests__/exception-filter.spec.ts` — Unit tests asserting the envelope contract, code mapping, and production leakage behavior.
- `backend/apps/api/src/modules/admin/application/*.service.ts` — Representative consumers of `Result`/`DomainError` showing the pattern in application services.