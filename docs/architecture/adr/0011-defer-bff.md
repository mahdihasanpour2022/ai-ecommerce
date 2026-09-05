# 0011: Defer a Backend for Frontend

**Status:** Superseded for Admin by [ADR 0013](0013-adopt-admin-bff-authentication.md); still deferred for Storefront

## Context

A BFF could keep browser authentication behind same-origin web application endpoints, but it would add an intermediary layer before the product has demonstrated that need.

## Decision

Do not implement a BFF in Sprint 0 or Sprint 1. Admin and Storefront browsers initially communicate directly with the NestJS API using explicit credentialed CORS. Reconsider a BFF only for a concrete future security, aggregation, deployment, or client-contract requirement.

## Reasons

The direct topology is simpler initially, easier to debug, exposes Backend status codes and response payloads directly in browser developer tools, supports learning the refresh flow, and avoids premature indirection.

## Alternatives Considered

A BFF in each Next.js application; a shared gateway; direct API communication.

## Consequences

Cookie, CSRF, and CORS behavior must be designed correctly across the web/API origins. The browser depends directly on versioned API contracts. Deferral is not permanent rejection; adoption criteria remain Open.
