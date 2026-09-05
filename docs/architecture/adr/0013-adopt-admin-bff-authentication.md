# 0013: Adopt Admin BFF Authentication

**Status:** Accepted

## Context

The owner requires authentication to be decided server-side before protected Admin pages render. The earlier direct browser-to-API flow rendered a client bootstrap state and then called separate CSRF and current-identity endpoints. It also prevented a Next.js Proxy from reliably seeing host-only API cookies across production subdomains.

## Decision

Adopt a same-origin Next.js Backend-for-Frontend for Admin. Browser API traffic uses `/api/v1/**` on the Admin origin; bounded Route Handlers forward it to NestJS. A Next.js 16 `proxy.ts` invokes `POST /auth/bootstrap` before protected page rendering. The Backend validates current Access and Refresh credentials, session revocation/expiry, Admin status, and effective `admin.access`; when Access is absent or invalid and Refresh remains valid, it atomically rotates or recovers credentials. Proxy forwards every Backend `Set-Cookie` header and injects only the validated safe identity/authorization snapshot into the server render.

Access and Refresh remain host-only HttpOnly cookies. The session-bound CSRF credential becomes a host-only, non-HttpOnly, `SameSite=Strict`, production-`Secure` cookie and is copied into `X-CSRF-Token` for unsafe requests. Its presence is never evidence of authentication. Login, bootstrap, and logout issue, restore, or expire it through server responses. Definitive authentication failures clear all three cookies; transport uncertainty does not.

Every protected NestJS endpoint continues to enforce current authentication, authorization, and CSRF independently. Proxy is a pre-render orchestration gate, not the authorization authority.

Storefront remains public. When Customer authentication is approved, it must use the same architectural pattern with completely separate Customer identities, sessions, cookie names, authorization, and Backend contracts; Admin credentials are never shared.

## Reasons

The design prevents protected UI from appearing before authentication is resolved, supports missing-Access recovery from a valid Refresh credential, keeps authentication tokens inaccessible to JavaScript, removes cross-origin browser credential handling, and preserves Backend authority and atomic refresh behavior.

## Consequences

Admin deployments must configure the server-only `API_BASE_URL`; all authenticated browser API traffic must remain behind the BFF. Proxy may run for RSC navigation and prefetch requests, so refresh recovery must remain concurrency-safe. The readable CSRF cookie is exposed to same-origin JavaScript under XSS, but it is not an authentication credential; XSS prevention remains mandatory. Credential-bearing responses are never cached or logged.

This decision supersedes the Admin topology and memory-only CSRF portions of ADR 0010 and resolves ADR 0011 for Admin only.
