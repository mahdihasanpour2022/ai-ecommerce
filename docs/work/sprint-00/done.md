# Sprint 0 Done

## S0-T01 — Inventory Existing Starter and Propose Placement

**Completed:** 2026-08-27

**Result:** Inventoried the clean standalone Next.js/Yarn starter and recommended preserving it as the future `apps/storefront`. Full evidence is in [the S0-T01 inventory](s0-t01-inventory.md); its pnpm migration recommendation was later superseded by the accepted Yarn Workspaces decision.

### Validation

Repository, manifest, Yarn lock/direct resolutions, installed tool state, and read-only Git state were inspected; `yarn check --integrity` passed. No automated test was required for this inventory/documentation task.

**Important Decisions:** This is a recommendation, not placement or migration authorization. Existing useful dependencies remain preserved without becoming mandatory architecture.

**Files / Areas Changed:** Sprint 0 execution records only; no application, dependency, lockfile, Git index, or history changes.

**Follow-ups:** Owner approval is required for the Storefront placement recommendation and S0-T02's Yarn Workspaces configuration. The cancelled pnpm task was not completed and is not recorded as Done.

## S0-T02 — Verify and Configure Yarn Workspaces

**Completed:** 2026-08-27

**Result:** Kept Yarn Classic `1.22.22` and added `apps/*` and `packages/*` Workspace discovery to the existing private root manifest. The superseded pnpm formulation remains cancelled; this record covers only the replacement Yarn task.

### Validation

Yarn reported an empty valid workspace graph before child packages exist. Default integrity and dependency-tree checks passed after an offline frozen metadata refresh; dependency declarations and `yarn.lock` hash `e85042f52ad75f326dec45d86d79612e67bb533f` remained unchanged. No automated test was required because this task changed package-manager configuration without runtime behavior.

**Important Decisions:** No Yarn-major change, dependency operation, Turborepo implementation, placeholder workspace, or network download was required.

**Files / Areas Changed:** Root `package.json` Workspace globs and Sprint 0 execution records only.

**Follow-ups:** S0-T03 may establish durable top-level application/package directory boundaries without moving or bootstrapping applications.

## S0-T03 — Establish Monorepo Application and Package Layout

**Completed:** 2026-08-27

**Result:** Established durable `apps/` and `packages/` boundaries with concise ownership documentation. The reserved Storefront, Admin, and API targets are discoverable without scaffolding them, and the root Next.js starter remains the transitional runnable application until S0-T05.

### Validation

Boundary contents and local documentation links were inspected; no child application, child `package.json`, placeholder package, or `.gitkeep` was created. Yarn Workspace discovery remained valid and empty. Root manifest, dependency declarations, `yarn.lock`, starter source/configuration, Git index, and Git history remained unchanged. No automated test was required because runtime behavior did not change.

**Important Decisions:** `packages/` accepts a child only after demonstrated cross-application reuse and separate approval. Application target names reserve ownership but do not claim implementation.

**Files / Areas Changed:** `apps/README.md`, `packages/README.md`, and Sprint 0 execution records only.

**Follow-ups:** S0-T04 is prepared for separate implementation approval; Turborepo has not been added or configured.

## S0-T04 — Configure Minimal Turborepo Orchestration

**Completed:** 2026-08-27

**Result:** Added exact Turborepo `2.10.12` to the Yarn Classic root and configured a minimal dependency-aware task graph. Direct root starter commands remain intact; `build:all` and `lint:all` orchestrate the transitional root now and future workspaces without recursion. Remote caching is disabled.

### Validation

Context7 and the installed Turbo schema were consulted for current configuration behavior. JSON parsing, Turbo version resolution, build/lint/typecheck/test dry-run graphs, Yarn Workspace discovery, and Yarn integrity passed. `yarn lint:all` passed, and `yarn build:all` passed with the existing starter's required Google Fonts network access. The lockfile contains only Turbo and its platform-specific optional packages; starter source/configuration hashes remained unchanged. No automated test was required because runtime behavior did not change.

**Important Decisions:** Turbo is pinned exactly. Build caches `.next`/`dist` outputs while excluding `.next/cache`; lint/typecheck have log-only cache output and test declares only `coverage`. Typecheck/test receive no fake root scripts and remain empty until real package scripts exist. The generated local `.turbo` cache is ignored.

**Files / Areas Changed:** `.gitignore`, `package.json`, `yarn.lock`, `turbo.json`, and Sprint 0 execution records.

**Follow-ups:** S0-T05 is prepared for separate implementation approval; the root starter has not been moved or modified.

<!-- Append concise records with Result, a `### Validation` section listing only checks actually executed, Important Decisions, Files / Areas Changed, and Follow-ups. Add Completed only when the date is reliable. -->
