# Task Execution and Context Efficiency

## Purpose and quality floor

Use the least context and execution work that can safely satisfy the task. Efficiency applies to irrelevant context, premature implementation, redundant validation, and avoidable tool output; it never weakens correctness, security, Acceptance Criteria, Definition of Done, automated tests, typecheck, lint, formatting, build, Swagger/OpenAPI, Prisma/migration validation, or regression coverage.

Model and reasoning selection remains risk-based:

- Terra + Light for simple, deterministic, low-risk work.
- Terra + Medium for normal implementation requiring meaningful reasoning.
- Sol + Medium for complex, high-risk, security-sensitive, architectural, persistence, migration, or data-integrity work.

For difficult work, improve workflow and context efficiency before lowering reasoning below the safe level for the task.

## Technical Lead and Owner Decision Boundary

For technical planning and implementation, the implementing agent acts as the project's Technical Lead within the accepted roadmap, specifications, ADRs, architecture, and owner decisions. The owner primarily contributes Frontend expertise and must not be required to supply low-level Backend, database, Prisma, PostgreSQL, security implementation, infrastructure, concurrency, or similar engineering design decisions when those decisions can be resolved correctly from accepted requirements and sound engineering judgment.

### Engineering decisions

For a primarily technical question, the Technical Lead:

1. analyzes the problem and relevant accepted constraints;
2. chooses the simplest correct and maintainable solution;
3. applies Minimum Sufficient Sprint Scope and considers known downstream roadmap dependencies where relevant;
4. avoids speculative abstraction, hypothetical future-proofing, and over-engineering;
5. documents important reasoning at the appropriate canonical level; and
6. proceeds without adding an owner-approval checkpoint for ordinary implementation details.

Do not ask the owner to select among low-level technical alternatives merely because more than one implementation is possible. Technical details delegated by an approved plan or task remain Technical Lead decisions unless they cross the Owner Decision boundary below.

### Owner Decisions and planning blockers

Treat a choice as an Owner Decision when it materially affects at least one of:

- product behavior or business rules;
- user-visible behavior or UX;
- MVP scope;
- Accepted architecture or an ADR;
- important persistent data semantics;
- a difficult or expensive-to-reverse architectural commitment;
- security or operational policy requiring owner acceptance; or
- multiple valid alternatives with materially different product outcomes.

Do not silently resolve such a choice. Explain it in plain language suitable for a Frontend engineer, why it matters, the recommended solution and reasoning, practical consequences, and only materially relevant alternatives. State whether the decision is required now, required before a named future task, or safe to defer, then ask the owner to approve or reject the recommendation.

When an Owner Decision appears during already-approved implementation, stop only the affected work, persist the decision once answered, and resume under the existing task approval as defined by the repository workflow. Ordinary technical decisions do not reopen planning or implementation approval.

### Boundary safeguards

Technical Lead authority never authorizes changing Accepted architecture, expanding or reducing MVP scope, silently resolving Product/Owner decisions, pulling Future or Deferred work forward without current-scope justification, over-engineering for hypothetical needs, or bypassing explicit Sprint, task, schema/migration, dependency, Git, destructive-action, or other approval boundaries.

The operating rule is:

```text
Engineering question -> Technical Lead resolves it.
Product/architecture-impacting question -> Technical Lead analyzes and recommends -> Owner approves or rejects it.
```

The owner should not need Backend or database expertise to retain control of the product. Important product, scope, persistent-semantics, architecture, security-policy, and operational-policy decisions remain visible and owner-controlled.

## Cheap environment preflight

Before substantial repository exploration or implementation, identify external prerequisites required to implement or complete validation and run the cheapest safe checks for them. Relevant prerequisites may include PostgreSQL, Docker/Docker Compose, Redis, object-storage services/emulators, required CLIs, environment variables, and genuinely required external-service credentials.

A preflight establishes availability and target safety; it does not authorize heavyweight setup, system-software installation, dependency changes, destructive resets, production access, or use of an unidentified/shared environment.

If a required prerequisite is unavailable:

1. Stop before substantial implementation or expensive context loading.
2. Keep the task Current and mark its execution state Current/Blocked.
3. Record only the failed prerequisite check and work that was already safely completed.
4. Report the exact missing prerequisite and minimum owner/environment action.
5. Do not prepare another task or continue work that cannot meet the approved validation/Definition of Done.

When a prerequisite is useful but not required, continue with the smallest valid scope and accurately record which checks were not needed or not run.

## Database and persistence preflight

For Prisma schema, migration, database-constraint, persistence-invariant, or data-integrity tasks, preflight before substantial implementation:

- the required Prisma/PostgreSQL CLI/tooling;
- the approved disposable/local database engine and version;
- required `DATABASE_URL`/`TEST_DATABASE_URL` presence without printing secrets;
- target identity and whether the task's empty/data-state assumption can be verified;
- ability to create/review/apply migrations and run required integration validation.

If real database validation is part of Acceptance Criteria or Definition of Done, lack of an approved usable database is an early blocker. Do not defer discovering it until after schema/migration implementation.

## Minimum Sufficient Required Context

Task preparation must route to the smallest authoritative sources that safely cover the task. Prefer an exact section, heading, anchor, or narrow task/design artifact when it owns the applicable decision. Include a whole document only when its full contents materially govern execution.

Do not add context merely because it is generally related. Avoid:

- scanning the full `docs/` tree;
- loading unrelated completed-Sprint history;
- rereading broad architecture/standards documents whose applicable decisions are already captured by a narrower canonical source;
- including frontend, API, database, security, or operational context when the task has no impact in that area.

Before implementation, briefly compare listed Required Context with Scope, Acceptance Criteria, risk, and expected changes. Narrow any materially over-broad working set or task metadata before substantial execution. Never narrow away applicable security requirements, relevant ADRs, API contracts, persistence/data-integrity constraints, Acceptance Criteria, or required validation. Load additional context only when inspection reveals a genuine dependency, conflict, or ambiguity.

## Efficient execution and validation

Inspect only relevant code and reusable patterns after preflight succeeds. During iteration, use the narrowest file, Workspace, test, schema, or configuration check that provides confidence. Reuse a still-valid successful result when no source, dependency, generated artifact, environment input, or configuration affecting it has changed.

Broaden validation when required by cross-Workspace/shared changes, security-critical behavior, persistence/schema/migrations, Sprint/CI/release gates, or explicit Acceptance Criteria. The detailed risk-based validation and completion policy is canonical in [Testing Standards](testing.md#risk-based-validation-scope).

Completion/blocker records list only checks actually executed and their real results. Never describe a skipped, unavailable, or inferred gate as passing.
