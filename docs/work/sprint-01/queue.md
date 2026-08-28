# Sprint 1 Queue

Sprint 1 is Active. Its goal, scope, and Definition of Done remain canonical in [Sprint 1](../../sprints/sprint-01.md).

## S1-T01 — Resolve Blocking Authentication Decisions

Status: Done

Objective:
Resolve only the Open security, CSRF, signing, authorization-contract, recovery, hashing, and throttling decisions that block the approved feature.

Dependency:
Sprint 0 complete and explicit owner approval to start Sprint 1.

## S1-T02 — Design Admin Identity and Session Schema

Status: Done

Objective:
Translate the accepted AdminUser, Role, Permission, AuthSession, and RefreshToken concepts into a reviewed schema and migration proposal.

Dependency:
S1-T01 and explicit owner approval of the S1-T02 schema/migration proposal.

## S1-T03 — Implement Admin Identity and Session Persistence

Status: Done

Objective:
Implement the separately approved schema and migration for Admin identity, authorization, sessions, and rotating refresh history.

Dependency:
S1-T02 and explicit schema/migration approval.

## S1-T04 — Implement First Super Admin Provisioning

Status: Done

Objective:
Implement the secure trusted-environment administrative CLI/script with safe repeat-bootstrap prevention and auditable behavior.

Dependency:
S1-T03 and approved hashing/provisioning details.

## S1-T05 — Implement Backend Authentication and Login

Status: Done

Objective:
Implement credential validation, Admin/session creation, accepted authentication cookies, stable errors, and the login contract with matching Swagger/OpenAPI documentation.

Dependency:
S1-T01 and S1-T03.

## S1-T06 — Implement CSRF, Minimum RBAC, and Protected Admin Access

Status: Current

Objective:
Implement the approved CSRF contract, minimum Role/Permission enforcement, current Admin/session checks, and `/auth/me` with matching Swagger/OpenAPI documentation.

Dependency:
S1-T01, S1-T03, and S1-T05; cross-origin CSRF and minimum permission decisions must be resolved.

## S1-T07 — Implement Refresh Rotation and Reuse Handling

Status: Queued

Objective:
Implement refresh, rotation history, grace recovery, replay classification, affected-session revocation, definitive failure behavior, and the matching Swagger/OpenAPI contract.

Dependency:
S1-T01, S1-T03, and S1-T05; in-grace lost-response recovery must be resolved.

## S1-T08 — Implement Logout and Disabled Admin Enforcement

Status: Queued

Objective:
Implement current-session logout and ensure disabling an Admin makes all of that Admin's sessions unusable, with matching Swagger/OpenAPI documentation for affected contracts.

Dependency:
S1-T05 through S1-T07.

## S1-T09 — Implement Admin Login and Protected Frontend Shell

Status: Queued

Objective:
Implement the accessible Persian RTL login, authenticated bootstrap, protected entry, and required user-visible states.

Dependency:
Stable backend login, `/auth/me`, and error contracts from S1-T05 and S1-T06.

## S1-T10 — Implement Axios Cookie, CSRF, and Error Behavior

Status: Queued

Objective:
Implement the centralized credentialed Axios client, timeout, CSRF header, stable error routing, and network-failure behavior.

Dependency:
S1-T06 through S1-T09.

## S1-T11 — Implement Single-Flight Refresh Recovery

Status: Queued

Objective:
Implement eligible-expiry coordination, one shared refresh operation, waiting-request settlement, bounded retry, and loop prevention.

Dependency:
S1-T07 and S1-T10.

## S1-T12 — Complete Authentication Verification and Hardening

Status: Queued

Objective:
Complete meaningful backend, frontend, concurrency, security, accessibility, critical-flow, and Swagger/OpenAPI contract-drift validation for the full authentication slice.

Dependency:
All preceding Sprint 1 implementation tasks.
