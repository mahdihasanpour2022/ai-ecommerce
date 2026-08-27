# Testing Standards

## Philosophy

Tests provide confidence in user-visible behavior, contracts, business invariants, security boundaries, and failure handling. Prefer meaningful risk-based tests over a 100% coverage target. A task is not complete merely because it compiles.

## Expected levels

- **Unit:** focused business rules, transformations, and concurrency/state helpers.
- **Integration:** module behavior with real boundaries such as database or framework wiring where valuable.
- **API/e2e:** HTTP contracts, validation, authentication/authorization, persistence, and error envelopes.
- **Frontend component/integration:** accessible interaction, forms, async states, and API-boundary behavior.
- **Critical user-flow e2e:** a small set of high-value cross-application journeys, including authentication and catalog publication when implemented.

Use the lowest level that proves the behavior without excessive mocking, then cover critical boundary integration. Tests should be deterministic, isolated, readable, and assert outcomes rather than private implementation details.

## Definition of done

As applicable to the change:

- TypeScript and lint checks pass.
- Relevant tests pass and new risk has appropriate regression coverage.
- Loading, empty, error, retry, and success states are handled.
- Authorization is tested positively and negatively; `401` and `403` remain distinct.
- Accessibility and responsive behavior are considered and tested at suitable levels.
- Persian RTL behavior, mixed-direction content, and localized user-display errors are tested where frontend behavior changes.
- Security-sensitive failures, concurrency, replay/idempotency, and input boundaries are covered where relevant.
- Cookie-authentication tests distinguish refreshable expiry, non-refreshable authentication failures, authorization failures, CSRF rejection, definitive Backend rejection, and ambiguous network failure.
- No unrelated changes exist, and documentation reflects changed behavior, architecture, or contracts.
- Executed checks, unexecuted checks, and unresolved concerns are reported accurately.
