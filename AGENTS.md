<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Automotive Parts Commerce: Agent Guide

This repository is becoming a production automotive-parts commerce monorepo with three independent applications: a public Storefront, an Admin Panel, and a shared Backend API. The current repository is an existing Next.js starter; preserve it until an approved Sprint 0 migration plan says how it fits the target layout.

Start with [the project overview](docs/00-project-overview.md). Detailed architecture, standards, security rules, product context, feature specifications, and sprint plans live under [`docs/`](docs/00-project-overview.md). Treat those documents as constraints, not evidence that planned functionality exists.

## Context hierarchy

Use focused context rather than loading all documentation:

1. Always read this file.
2. For a feature or task, read the documents explicitly listed in its **Required Context** section. That feature-local list is the source of truth for task-specific context routing.
3. Read the applicable sprint document for timing and approved scope.
4. Load other documents only when inspection reveals a genuine dependency; do not read the entire `docs/` tree by default.

Architecture and security documents own **how** the system is intended to work. Feature specifications own **what** observable behavior is required. Sprint documents own **when** work occurs and its scope. ADRs own **why** significant decisions were made. Prefer references to the canonical owner over duplicating detailed rules.

## Task execution state

- Sprint execution state lives under `docs/work/<sprint>/`. Only the active sprint may have one task marked `Current`; implement it only when `current.md` says `Approved for Implementation`.
- Normal working context is this file, the active `current.md`, and only its **Required Context**. Do not load the full documentation tree.
- After an approved task meets every Acceptance Criterion and required Validation check, mark it `Done` in `queue.md`, append a concise result to `done.md`, promote the next `Queued` task to `Current`, replace `current.md`, set its Approval State to `Awaiting Implementation Approval`, and **stop**. Preparing the next task is automatic; implementing it is not.
- If required validation fails, do not mark the task Done. If a decision, requirement, approval, schema/dependency authorization, security choice, or repository conflict blocks progress, mark the task `Blocked`, record the exact blocker in `current.md`, report it, and do not archive, skip, reorder, or start another task without owner direction.
- Starting a planned sprint requires explicit owner approval after the active sprint is complete.
- For a backend task that creates, removes, or modifies an HTTP API contract, `current.md` must declare **Swagger / OpenAPI Impact** with matching acceptance and validation criteria; Swagger/OpenAPI is part of that task's Definition of Done. Do not load API documentation context for tasks with no Backend HTTP API impact.

## Required workflow

Before any non-trivial implementation:

1. Inspect relevant existing code.
2. Read the feature/task Required Context and, for Next.js work, the relevant installed guide under `node_modules/next/dist/docs/`.
3. Identify reusable existing patterns.
4. Determine affected applications and packages.
5. Describe architecture impact.
6. Describe API impact.
7. Describe database impact.
8. Describe security implications and edge cases.
9. Describe required tests and documentation impact.
10. Present a plan headed: Goal, Relevant existing architecture, Affected files/modules, Proposed implementation, API changes, Database changes, Security implications, Edge cases, Tests, Documentation impact.
11. If the request did not already explicitly authorize implementation, wait for explicit approval before changing code.

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

Work is done only when the requested behavior and acceptance criteria are met; relevant type, lint, and test checks pass; error/loading/empty states, accessibility, authorization, and security cases are addressed where relevant; contracts and docs are current; and no unrelated or unapproved Git/dependency changes exist. See [testing standards](docs/standards/testing.md).
