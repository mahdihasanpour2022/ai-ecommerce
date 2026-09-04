<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Clothing Commerce: Agent Guide

This repository is a production-oriented clothing-commerce monorepo with three independent application foundations: a public Storefront, an Admin Panel, and a shared Backend API. Sprint 0 placed the preserved Next.js starter at `apps/storefront`, added the Admin/API foundations, and established root Yarn/Turborepo orchestration; Sprint 1 implemented Admin authentication, while clothing catalog and purchase behavior follow the active roadmap. Existing `@automotive-commerce/*` and authentication/database names are legacy technical identifiers until a separately approved compatibility-safe rename.

Start with [the project overview](docs/00-project-overview.md). Detailed architecture, standards, security rules, product context, feature specifications, and sprint plans live under [`docs/`](docs/00-project-overview.md). Treat those documents as constraints, not evidence that planned functionality exists.

## Context hierarchy

Use focused context rather than loading all documentation:

1. Always read this file.
2. For a feature or task, use its **Required Context** as the routing source, but first assess whether that list is materially broader than execution requires. Narrow over-broad context before substantial work while retaining every authoritative source needed for correctness.
3. Read the applicable sprint document for timing and approved scope.
4. Load other documents only when inspection reveals a genuine dependency; do not read the entire `docs/` tree by default.

Required Context is task-specific and Minimum Sufficient: prefer exact authoritative sections/topics and narrow canonical sources over whole documents included only for general relevance. Do not load unrelated completed-Sprint history or reread broad sources when a narrower canonical source already owns the applicable decision.

Architecture and security documents own **how** the system is intended to work. Feature specifications own **what** observable behavior is required. Sprint documents own **when** work occurs and its scope. ADRs own **why** significant decisions were made. Prefer references to the canonical owner over duplicating detailed rules.

## Model and reasoning routing

- Use **GPT-5.6 Terra** for routine, well-scoped, low-risk work with clear requirements and architecture. Use **GPT-5.6 Sol** for complex, high-risk, security-sensitive, architectural, ambiguous, or cross-Workspace work, including authentication/authorization, security, Prisma schemas/migrations, data integrity, cart, checkout, payments, orders, complex debugging, architecture decisions, and significant refactors. When uncertain, use Sol.
- Use **Light** for simple deterministic work such as documentation, formatting, straightforward configuration/cleanup, and isolated changes. Use **Medium** for meaningful analysis, calculations, debugging, trade-offs, multi-file reasoning, planning, or security/domain reasoning. When uncertain, use Medium.
- Medium is the maximum for normal project execution; do not use High, Extra High, or Ultra. For difficult or high-risk work, use Sol + Medium instead of increasing reasoning beyond Medium.
- If Terra + Light becomes unexpectedly complex, escalate first to Terra + Medium, then to Sol + Medium when complexity, ambiguity, risk, or repeated failures justify it.
- Improve workflow, preflight, context selection, and validation scope before lowering model/reasoning below the level required by task risk. Do not globally replace Sol with Terra or Medium with Light to save quota.
- Model/reasoning choices optimize execution only. They never weaken Acceptance Criteria, Definition of Done, required tests, typecheck, lint, formatting, build validation, Swagger/OpenAPI, security validation, regression coverage, or correctness to save tokens.

## Task execution and transitions

- Apply the canonical [Technical Lead and Owner Decision Boundary](docs/standards/execution.md#technical-lead-and-owner-decision-boundary). Resolve ordinary technical planning and implementation choices using sound engineering judgment without shifting low-level Backend/database/security expertise to the owner. Surface only genuine Product/Owner decisions with a recommendation and approval request; this authority never overrides existing scope, architecture, schema/migration, dependency, Git, or implementation-approval boundaries.

- Sprint execution state lives under `docs/work/<sprint>/`. Only the Active Sprint may have one Current task. Preparing a task is automatic within an Active Sprint; implementing it requires explicit owner approval. An unambiguous `Yes` to the implementation-approval question is equivalent to `Approve and implement the current task.` Normal context is this file, that task's `current.md`, and its Minimum Sufficient **Required Context**.
- Every implementation task declares **Testing Impact**. A Backend HTTP-contract task also declares **Swagger / OpenAPI Impact** with matching acceptance and validation criteria. Detailed completion rules live in [testing standards](docs/standards/testing.md).
- Once implementation is approved, continue until the Current task succeeds, reaches an explicit Open Decision, or is genuinely Blocked. Ask only the minimum necessary owner question for an explicit Open Decision; after the answer, persist it and resume the same already-approved task without another general approval. Ordinary implementation choices add no approval checkpoint.

### Successful task completion

- Verify Acceptance Criteria and applicable Definition of Done, run only validation required by the risk-based policy, mark the task `Done` in `queue.md`, and append a concise durable `done.md` record containing only: task ID/title, result, important decisions, affected areas/files at summary level, validation actually executed/result, documentation impact, and relevant follow-ups. Never copy full `current.md` content into `done.md`.
- If another task is `Queued` in the same Active Sprint, immediately select the next queue entry, mark it `Current`, and replace `current.md` with its Goal, Why, Minimum Sufficient **Required Context**, Scope, Out of Scope, Expected Changes, Constraints, Acceptance Criteria, Testing Impact, Validation, Documentation Impact, and `Approval State: Awaiting Implementation Approval`; then **stop before implementation**. This preparation needs no owner approval.
- After that transition, keep chat minimal: `Sx-Tyy completed. Sx-Tzz is now Current and awaiting implementation approval. Approve and implement Sx-Tzz?` At that point the previous task is already archived and the next task is already prepared; the question authorizes implementation only. Repository documentation owns durable detail; conversation owns approvals, Open Decisions, blockers, and concise status.

### End of Sprint

- If the completed task was final, clear `current.md` and verify the Sprint exit criteria. Mark the Sprint `Completed` and identify the next intended Sprint from the roadmap without activating it only when those criteria pass.
- If that Sprint lacks an approved detailed plan/queue, ask `Sprint <n> is complete. Plan Sprint <n+1> from the roadmap?`; on approval, plan only that Sprint, surface required Open Decisions, and obtain plan approval. If an approved detailed plan already exists, ask `Sprint <n> is complete. Activate Sprint <n+1> and prepare its first Current task?`
- Every new or refined Sprint plan must apply the canonical [Minimum Sufficient Sprint Scope](docs/roadmap.md#minimum-sufficient-sprint-scope): include Required Now and Required Dependency work, exclude Optional / Nice-to-Have and Future / Deferred work from normal queues, run the missing/over-planning/placement/dependency review, and surface rather than silently resolve required Open Decisions.
- Only after the required plan/activation approval, mark the Sprint `Active`, automatically prepare its first `Current` task with `Approval State: Awaiting Implementation Approval`, and stop before implementation. If no next roadmap Sprint exists, report that roadmap planning is required. Detailed Just-In-Time policy is canonical in [the roadmap](docs/roadmap.md#just-in-time-sprint-planning).

### Failure, blockers, and context efficiency

- Fix in-scope implementation or validation failures and continue. If genuinely Blocked, keep the task Current/Blocked, do not prepare another task, record the relevant execution state, and report only the exact blocker and required owner input. The compact success rule never hides failure.
- Before substantial implementation, cheaply preflight external local infrastructure, required CLIs, environment values, and credentials that are necessary to implement or validate the task. For Prisma/schema/migration/persistence/data-integrity work, confirm the approved disposable PostgreSQL/Docker environment can run before expensive exploration or migration work. If a required dependency is unavailable, stop early and apply the existing Blocked workflow; do not install system software or perform heavyweight setup without owner approval.
- Minimize routine conversational output, but never reduce correctness, validation, traceability, or important owner decisions to save context.
- Detailed preflight, context-budget, and execution-efficiency policy is canonical in [Task Execution and Context Efficiency](docs/standards/execution.md); validation breadth/reuse is canonical in [testing standards](docs/standards/testing.md).

### Token-efficient host-assisted workflow

Optimize for minimal unnecessary tool usage, retries, logs, and token consumption while still completing the task correctly. The owner has direct access to the Windows host and PowerShell for this repository.

After the first clear environment, tooling, network, permission, browser, authentication, or system-level failure, determine whether the owner can resolve it more efficiently on the host. Do not attempt multiple workarounds unless one is trivial and highly likely to succeed. If host assistance is appropriate, pause only that operation and provide: (1) exact PowerShell command(s), (2) the exact working directory, (3) one short sentence explaining the purpose, and (4) exactly what output/result to return. Once supplied, treat the result as evidence for that gate and resume without repeating completed work.

Prefer host assistance for package/runtime/browser/SDK/CLI or large-binary installation and downloads, Windows/system configuration, environment or PATH changes, starting/stopping host services, installed-software detection/use, administrator-only commands, network/CDN/geographic restrictions, authentication/permission limitations, and other capabilities unavailable in the execution environment.

Do not delegate normal repository work that is reliably available to the agent: reading/editing code, repository searches, implementation, targeted unit/component tests, typechecking, linting, builds, diff review, documentation, static analysis, and small diagnostics.

Use targeted checks during implementation, then the minimum required final regression gates. Do not rerun already-passing gates without invalidating changes, repeat near-identical searches, retry the same environment failure, dump or reread large logs, inspect unrelated files speculatively, or run full-repository checks when a targeted iteration check is sufficient. Prefer one decisive diagnostic command and summarize only its relevant result.

For every task, apply these token-efficiency rules without weakening scope or quality:

- Start with this file, the Current task, and only the exact authoritative sections and implementation files needed. Do not print or load whole broad documents when targeted headings, line ranges, or searches are sufficient.
- Reuse established repository patterns and already-fetched documentation when still applicable. Do not repeat documentation lookups or repository searches unless the code, version, question, or evidence has changed; mandatory current-documentation rules still apply when triggered.
- Inspect concise status, diffs, and failure excerpts. Suppress routine success detail and summarize large command output instead of reproducing or rereading it.
- Group related edits and fix discovered type, lint, and test failures in batches. Avoid one-command-per-error iteration when one focused diagnostic identifies the set safely.
- Run the narrowest relevant tests while developing. After the change stabilizes, run each Acceptance Criteria/Definition of Done final gate once; repeat only a gate invalidated by later changes.
- Preserve passing evidence across interruptions and user-provided host results. Do not restart completed analysis or validation after resuming a task.
- Keep commentary concise and decision-oriented. Durable implementation and validation detail belongs in task documentation; chat should carry approvals, blockers, owner decisions, and short status updates.
- Avoid speculative abstractions, optional enhancements, duplicated tests, and unrelated cleanup. Implement the smallest coherent change that satisfies the approved task.

Token reduction never authorizes omitting Acceptance Criteria, meaningful automated tests, typechecking, linting, required builds, security/authorization review, API/schema/documentation impact checks, scope validation, required browser evidence, or any applicable Definition of Done item. Optimize how evidence is obtained and communicated, not which essential evidence is required.

For Admin Playwright E2E runs, the Playwright CDN returns HTTP 403 in this location. The Windows host has usable system Chrome. When a rerun is required, ask the owner to run from the repository root instead of attempting to download Playwright Chromium:

```powershell
cd "E:\------------- my ai proj\e-commerce"
$env:PLAYWRIGHT_USE_SYSTEM_CHROME='1'
yarn workspace @automotive-commerce/admin test:e2e
```

The owner confirmed this command passed repeatedly on 2026-09-04 with `Running 2 tests using 1 worker` and `2 passed` (latest approximately 6.5 seconds). Treat that Admin browser gate as passed for unchanged code; rerun it only when subsequent code changes invalidate the evidence.

## Required workflow

Before any non-trivial implementation:

1. Review the task, Acceptance Criteria, and Required Context for scope and context-budget fit.
2. Preflight any required external infrastructure, CLI, environment, or credential dependency before expensive exploration or implementation.
3. If preflight passes, inspect relevant existing code and read only the Minimum Sufficient authoritative context; for Next.js work, read the relevant installed guide under `node_modules/next/dist/docs/`.
4. Identify reusable existing patterns.
5. Determine affected applications and packages.
6. Describe architecture impact.
7. Describe API impact.
8. Describe database impact.
9. Describe security implications and edge cases.
10. Describe required tests and documentation impact.
11. Present a plan headed: Goal, Relevant existing architecture, Affected files/modules, Proposed implementation, API changes, Database changes, Security implications, Edge cases, Tests, Documentation impact.
12. If the request did not already explicitly authorize implementation, wait for explicit approval before changing code.

When authorized, make the smallest coherent change, follow established architecture, avoid scope expansion, run relevant checks, and report changes, checks, and unresolved concerns. Explain non-trivial architecture and security patterns, alternatives, trade-offs, failure modes, and security implications so the user retains ownership.

## Mandatory boundaries

- Never stage, commit, push, merge, rebase, or create/delete branches without explicit approval. Never run destructive Git operations without explicit approval. See [Git standards](docs/standards/git.md).
- Never add, remove, or upgrade dependencies without explicit approval.
- Use the accepted Yarn toolchain and Yarn Workspaces; do not introduce pnpm or change the Yarn major version without an explicit owner decision.
- Installed does not mean architecturally mandatory: preserve already-installed useful packages, do not force their use, and do not remove them merely for minimalism. Use them only when an approved task has a concrete need.
- Do not create, modify, generate, or apply a database migration unless the approved task explicitly includes the corresponding schema change. Do not change the Prisma schema outside approved task scope. For a non-trivial schema change, present the proposed model and migration impact before implementation unless that implementation was already explicitly approved.
- Never make unrelated changes, silently decide an ambiguous major architecture issue, expose secrets, or claim planned behavior is implemented.
- Backend authorization is authoritative; UI visibility is not authorization.
- Avoid speculative infrastructure and abstraction. No microservices, Kafka, Kubernetes, Elasticsearch, or Redis until approved requirements justify them.

## Definition of done

Work is done only when the requested behavior and acceptance criteria are met; meaningful runtime changes have appropriate passing automated tests; relevant type, lint, build, and validation checks pass; error/loading/empty states, accessibility, authorization, and security cases are addressed where relevant; contracts and docs are current; and no unrelated or unapproved Git/dependency changes exist. See [testing standards](docs/standards/testing.md).
