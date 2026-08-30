# S1-T12 Authentication Verification Trace

This trace maps the accepted Sprint 1 authentication outcomes to the implementation boundaries and automated evidence used for the final hardening gate. Detailed behavior remains canonical in the [Admin Authentication specification](../../features/admin-auth/specification.md).

| Accepted outcome | Implementation boundary | Automated evidence |
| --- | --- | --- |
| Trusted first Super Admin, exact minimum grant, safe repeat/concurrency behavior | API administration and Prisma persistence | `super-admin-provisioning.test.ts`, `super-admin-provisioning.integration.test.ts`, `prisma-schema.test.ts` |
| Enumeration-safe login, Argon2id, session creation, cookie/CSRF issuance, throttling | API authentication service/repository/controller | `authentication.integration.test.ts`, `authentication.service.test.ts`, `environment.test.ts` |
| Exact-origin/Fetch Metadata and session-bound CSRF enforcement | API application and CSRF service | `authentication.integration.test.ts`, `csrf.service.test.ts`, `refresh-authentication.integration.test.ts`, `logout-authentication.integration.test.ts` |
| Strict Ed25519 Access JWT and current Admin/session/RBAC authority | Access guard and protected authentication service | `protected-authentication.integration.test.ts`, `authentication.service.test.ts` |
| Safe CSRF bootstrap and current identity response | `/auth/csrf`, `/auth/me`, Admin bootstrap adapter/state | `protected-authentication.integration.test.ts`, `auth-api.test.ts`, `auth-state.test.ts` |
| Exact eligible refresh, atomic rotation, grace recovery, reuse revocation, throttling | API refresh service/repository and Admin HTTP coordinator | `refresh-authentication.integration.test.ts`, `http-client.test.ts` |
| One frontend refresh for concurrent expiry, one replay, bounded transport retry, cancellation | Admin Axios response boundary and refresh coordinator | `http-client.test.ts` |
| Current-session-only logout, idempotence, disabled cleanup, other-session survival | API logout service/repository/controller | `logout-authentication.integration.test.ts` |
| Accessible Admin logout pending/success/retryable/definitive transitions and memory cleanup | Admin logout adapter, provider flow, reducer, native button, protected route gate | `auth-api.test.ts`, `logout-flow.test.ts`, `auth-state.test.ts`, `logout-button.test.tsx`, `submission-gate.test.ts` |
| Persian RTL login, mixed-direction identity, safe return routing, no protected-content disclosure before auth | Admin document/login/protected state boundaries | `document-shell.test.tsx`, `login-form.test.tsx`, `return-destination.test.ts`, `auth-state.test.ts` |
| Exact secret-free login/CSRF/me/refresh/logout OpenAPI and non-production exposure | Nest Swagger decorators and environment-aware application bootstrap | Authentication integration suites and `swagger-exposure.test.ts` |
| No token persistence/Bearer construction, credential logging, broad retry, timer, or frontend cookie read | Central client/provider plus security inspection | Admin transport/state tests and final source/diff security scans |

The repository intentionally has no browser E2E dependency. Sprint 1 uses the installed Node integration harness for real Nest/PostgreSQL HTTP contracts and deterministic React/Axios boundary tests for frontend state, semantics, concurrency, and critical authentication transitions; no fake placeholder or unapproved dependency was added.
