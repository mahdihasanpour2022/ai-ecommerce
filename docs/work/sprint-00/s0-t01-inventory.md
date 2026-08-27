# S0-T01 Repository Inventory and Placement Recommendation

**Completed:** 2026-08-27

> **Superseded package-manager recommendation:** On 2026-08-27, the owner accepted Yarn Workspaces and superseded pnpm. The repository/placement inventory remains valid, but the pnpm migration sequence and related decisions below are historical and must not be executed. Current execution is defined by [ADR 0013](../../architecture/adr/0013-use-yarn-workspaces.md) and `current.md`.

## Repository inventory

- The repository is a standalone Create Next App App Router starter at the root. It has no `src/` directory, workspace declaration, Turborepo configuration, `apps/`, `packages/`, Prisma, Backend API, Admin application, or environment files.
- The starter application consists of `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, the favicon, and five default public SVG assets. It still renders the default English Create Next App page and metadata; no product behavior is implemented.
- Configuration is local to the root application: strict TypeScript with the `@/*` root alias, Next.js ESLint flat configuration, Tailwind CSS 4 through PostCSS, and an otherwise empty Next.js configuration.
- `package.json` is private, named `pure-yarn-next`, and exposes `dev`, `build`, `start`, and `lint`. There is no explicit typecheck, format, or test script.
- The repository has 57 tracked files: 4 under `app/`, 5 public assets, 38 documentation files, and the remaining root configuration/manifest files.

## Package manager and tool state

- The manifest declares `packageManager: yarn@1.22.22`; `yarn.lock` is a Yarn v1 lockfile and `yarn check --integrity` succeeds.
- No `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, or `.node-version` exists. Invoking pnpm is rejected because the project is still configured for Yarn, confirming migration has not begun.
- Detected local tools: Node `24.19.0`, npm `11.17.0`, and Yarn `1.22.22`. Node is not pinned by the repository.

### Declared and locked direct dependencies

| Kind | Package | Manifest | Locked/installed |
| --- | --- | --- | --- |
| runtime | `next` | `16.3.2` | `16.3.2` |
| runtime | `react` | `19.2.8` | `19.2.8` |
| runtime | `react-dom` | `19.2.8` | `19.2.8` |
| runtime | `@tanstack/react-query` | `^5.102.3` | `5.102.3` |
| runtime | `axios` | `^1.19.0` | `1.19.0` |
| runtime | `react-hook-form` | `^7.86.0` | `7.86.0` |
| runtime | `zod` | `^4.4.3` | `4.4.3` |
| runtime | `zustand` | `^5.0.15` | `5.0.15` |
| development | `@tailwindcss/postcss` | `^4` | `4.3.3` |
| development | `@types/node` | `^20` | `20.19.43` |
| development | `@types/react` | `^19` | `19.2.18` |
| development | `@types/react-dom` | `^19` | `19.2.5` |
| development | `eslint` | `^9` | `9.39.5` |
| development | `eslint-config-next` | `16.3.2` | `16.3.2` |
| development | `prettier` | `^3.9.6` | `3.9.6` |
| development | `tailwindcss` | `^4` | `4.3.3` |
| development | `typescript` | `^5` | `5.9.3` |

Installed packages are inventory, not mandatory architecture. The five client utilities and Prettier were added after the initial Create Next App commit; starter source and configuration remain unchanged from that initial commit. Preserve these useful dependencies during migration, but adopt or remove them only through future approved work with a concrete need.

## Git and preservation state

- `main` is aligned with `origin/main` at `4222cab`; the worktree and index are clean, with no staged or untracked files.
- Relevant history consists of the original Create Next App commit and a later context-engineering commit. There is no uncommitted user work to move around.
- Generated/ignored `node_modules`, `.next`, `next-env.d.ts`, environment files, and logs must not be treated as source to relocate.

## Placement recommendation

Use the existing root application as the future `apps/storefront` application. It is already the public-facing framework choice, contains no Admin-only or Backend behavior, and preserves the exact starter, useful dependencies, and Git history. Regenerating Storefront would add merge risk without providing a meaningful foundation benefit.

Keep the starter at the repository root during S0-T02 so package-manager migration and lockfile comparison remain isolated from filesystem restructuring. Establish the workspace shell in S0-T03, then perform the Storefront cutover in S0-T05 using a copy/verify/remove sequence or another separately approved reversible move. Do not copy generated directories. Keep root-level repository documentation and agent guidance at the root; application source, public assets, app-specific configuration, and its dependency manifest ultimately belong under `apps/storefront`.

## Superseded historical migration sequence

1. Obtain approval for exact Node and pnpm pins and for the manifest/lockfile transition.
2. In S0-T02, preserve dependency names and ranges, change only required package-manager metadata, generate/import a pnpm lock from the Yarn baseline, compare direct resolutions, and validate the current root starter with pnpm before removing `yarn.lock`.
3. If lock conversion or validation differs unexpectedly, retain/restore the reviewed Yarn manifest and lock baseline; do not combine dependency upgrades or removals with migration.
4. In S0-T03, add the minimal pnpm workspace shell while the root starter remains a temporary runnable package; do not create speculative shared packages.
5. In S0-T05, copy or move only tracked Storefront-owned files into `apps/storefront`, adjust package/config paths coherently, validate the relocated application, then remove superseded root application files only after successful comparison.
6. Treat every step as a reviewable checkpoint. Do not stage or commit checkpoints unless separately authorized.

## Historical risks and decisions at completion

- **Placement approval:** approve or reject using the existing root starter as `apps/storefront`; regeneration is not recommended.
- **Runtime/tool pins:** choose exact supported Node and pnpm versions before S0-T02. The detected Node `24.19.0` is not a repository pin, while `@types/node` currently targets major 20.
- **Lockfile authorization:** S0-T02 requires explicit approval to update `package.json`, create `pnpm-lock.yaml`, remove `yarn.lock` after validation, and run the pnpm install needed to verify it.
- **Resolution drift:** caret ranges may resolve differently during import/install. Any unexpected direct or material transitive drift requires review, not silent acceptance.
- **Intermediate layout:** keeping the app at root through S0-T02 isolates package-manager risk but leaves a temporary root-package/workspace transition until S0-T05.
- **Dependency retention:** current utilities remain installed during migration; their eventual use is feature-driven, and removal requires separate approval.

## Validation evidence

- Complete tracked/non-generated repository inventory inspected.
- Manifest, Yarn lock header, direct resolutions, installed tree, and Yarn integrity inspected successfully.
- Read-only Git branch, history, worktree, and index state inspected.
- Recommendation cross-checked with Sprint 0, the monorepo ADR, the pnpm ADR, system architecture, and engineering/Git standards.
- No application, dependency, lockfile, Git index, or Git history change was made by S0-T01.
