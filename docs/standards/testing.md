# Testing Standards

## Philosophy

Tests provide confidence in user-visible behavior, contracts, business invariants, security boundaries, and failure handling. A task is not complete merely because it compiles, passes manual inspection, or appears to work.

When a task creates or changes meaningful testable behavior, appropriate automated tests are part of that same implementation task and must pass before Done. Testing is not deferred cleanup. Prefer meaningful risk-based coverage over test count or a 100% coverage target.

Do not create artificial tests for every changed line or for documentation/configuration changes with no runtime behavior. In those cases, explicit validation such as typecheck, lint, build, configuration validation, command/output verification, or an integration smoke check may be sufficient. Never create fake placeholder tests to satisfy policy.

## Testing impact in tasks

Every implementation `current.md` declares **Testing Impact** using exactly one of:

- `Automated tests required`
- `Existing tests must be updated`
- `No new automated test required — validation only`

When automated tests are required, identify only the relevant categories: unit, integration, API/e2e, frontend component/integration, or critical user-flow e2e. A validation-only task states the checks that provide confidence instead. Pure documentation tasks do not load unrelated testing context merely to repeat this rule.

Automated tests are normally required when work creates or changes business logic, validation, authentication, authorization, HTTP/API behavior, error handling, state transitions, data transformation, persistence, security behavior, frontend interaction, important UI behavior, or reproducible runtime bugs.

## Planning and acceptance criteria

Inspect relevant existing tests before implementation. Preserve useful patterns, update existing suites when behavior changes, and avoid duplicating equivalent coverage. Do not delete a failing test or weaken an assertion merely to obtain a pass; any assertion change requires behavioral justification.

Acceptance Criteria tie tests to observable outcomes and failure paths, not vague statements such as “tests added.” For example, criteria should state the successful behavior, invalid or unauthorized outcome, and that relevant automated tests cover and pass for those outcomes. Avoid prescribing low-level test implementation unless the feature risk requires it.

## Expected levels

- **Unit:** focused business rules, validation helpers, transformations, and concurrency/state logic.
- **Integration:** module behavior with real boundaries such as database, framework, or security wiring where valuable.
- **API/e2e:** HTTP contracts, DTO validation, authentication/authorization, persistence, statuses, error codes, and failure envelopes.
- **Frontend component/integration:** user-observable interaction, forms, async states, permission-aware behavior, and API boundaries.
- **Critical user-flow e2e:** a small set of high-value cross-application journeys, including authentication and catalog publication when implemented.

Use the smallest level and focused command that prove behavior without excessive mocking or brittle internal assertions. During iteration, do not run the whole monorepo when a focused suite is sufficient. Before Done, run the broader tests and validation required by the task and Sprint context.

## TypeScript type-checking

Every workspace that owns a `tsconfig.json` and can be type-checked independently must expose `typecheck` as `tsc --project tsconfig.json --noEmit`. Do not add this script to non-TypeScript workspaces or packages without an independent TypeScript configuration. The repository root exposes `typecheck` through Turborepo so cross-workspace changes can run the relevant task graph.

Any implementation task that creates or changes TypeScript code must run the relevant workspace typecheck before it can move to Done. Use the focused workspace command for an isolated change and the root command when multiple workspaces or shared TypeScript boundaries are affected. A required typecheck failure blocks Done; do not hide errors, weaken the compiler check, or omit the check to advance the task.

## Backend and API behavior

Backend behavior tests cover applicable service/business rules, DTO/input validation, authentication, authorization, important persistence behavior, HTTP statuses, machine-readable error codes, failure paths, and security-sensitive outcomes.

For an HTTP API contract change, the completion path is:

```text
Implementation
  -> validation / DTOs
  -> Swagger / OpenAPI
  -> relevant automated tests
  -> typecheck / lint / build
  -> Done
```

Swagger/OpenAPI must match the tested implemented contract and remains independently required by [Backend standards](backend.md) and [API conventions](../api/conventions.md).

## Authentication expectations

As the related behavior is implemented, Admin Authentication coverage includes applicable outcomes from this set:

- successful login, invalid credentials, and disabled/ineligible Admin;
- protected access without authentication;
- expired Access Token and successful silent refresh;
- `INVALID_ACCESS_TOKEN` and every `403` not triggering refresh;
- concurrent eligible expiry producing one refresh operation and correctly retrying/settling waiters;
- refresh failure, rotation, and reuse outside accepted grace behavior;
- current-session logout and disabled-Admin sessions becoming unusable;
- CSRF rejection and approved CORS/security behavior;
- network and timeout behavior where deterministic testing is practical.

Tests must preserve the distinctions defined by the authentication specification: refreshable expiry, non-refreshable authentication failure, authorization failure, definitive Backend rejection, and ambiguous transport failure.

## Frontend behavior

Frontend tests assert user-observable behavior rather than private component implementation. Cover applicable form validation, loading/empty/error/success states, protected-route behavior, authentication state transitions, permission-aware UI behavior, accessibility, Persian RTL behavior, and critical interactions. Avoid snapshots or structural assertions that are brittle without protecting meaningful behavior.

## Bug fixes

A reproducible runtime bug normally receives a regression test. Prefer:

```text
reproduce bug -> add or update a test for the expected behavior -> fix -> test passes
```

If a regression test is genuinely impractical, record why and provide another explicit validation method. “Too small” or “manually checked” is not sufficient when a stable automated reproduction is practical.

## Completion gate

Before moving a task from Current to Done:

1. Verify every Acceptance Criterion and confirm implementation is complete.
2. Confirm required tests were added or updated according to **Testing Impact**.
3. Run the relevant focused and task/Sprint completion suites.
4. Confirm every required test passes.
5. For any task affecting TypeScript code, run the relevant workspace or root typecheck. Also run applicable lint, build, configuration, integration, or smoke validation.
6. For HTTP API changes, verify Swagger/OpenAPI matches the implemented and tested contract and contains no stale affected documentation.
7. Inspect final scope and documentation, then mark Done only if every required gate passes.

If a required test, typecheck, or other validation fails, do not mark Done, append a completed record, or select/implement the next task. Continue within approved scope when the change caused the failure. If an external or unresolved issue prevents progress, mark the task Blocked and report the exact blocker.

## Completion records

Each completed-task record in `done.md` includes a concise `### Validation` section listing only checks actually executed and their result, such as unit tests, integration tests, typecheck, lint, build, configuration validation, or smoke checks. When typecheck applies, record the actual command or scope and its pass/fail result. Never claim an unexecuted test passed. When no new automated test was required, record the validation-only checks that justified completion.

## Definition of done

As applicable to the change:

- Meaningful new/changed behavior has appropriate automated coverage and all required tests pass.
- Relevant workspace or root TypeScript typechecks pass for implementation tasks affecting TypeScript code.
- Lint, build, configuration, and smoke checks pass where required.
- New risk and bug fixes have practical regression coverage.
- Loading, empty, error, retry, and success states are handled and tested where behavior changes.
- Authorization is tested positively and negatively; `401` and `403` remain distinct.
- Accessibility, responsive behavior, Persian RTL, mixed-direction content, and localized user-display errors are tested at suitable levels where affected.
- Security-sensitive failures, concurrency, replay/idempotency, persistence, and input boundaries are covered where relevant.
- Existing useful test patterns are preserved, documentation/contracts match behavior, and no unrelated changes exist.
- Executed checks, unexecuted checks, and unresolved concerns are reported accurately.
