# General Engineering Standards

- Optimize for readability, maintainability, and explicit behavior.
- Apply SOLID and clean-code principles pragmatically; prefer the simplest solution that meets verified requirements.
- Avoid premature optimization, premature abstraction, unnecessary dependencies, speculative infrastructure, and generic layers created for pattern purity.
- Keep modules and functions focused; use meaningful domain names and explicit contracts.
- Avoid duplicated business logic and hidden side effects. Preserve existing conventions unless a deliberate change is proposed and approved.
- Comments explain rationale, constraints, or non-obvious trade-offs—not obvious syntax.
- Never expose, commit, hardcode, or log credentials, tokens, secrets, or sensitive configuration. Environment-specific values belong in validated environment configuration.
- Dependency additions, removals, and upgrades require explicit approval and a concrete reason. The Yarn lockfile is source-controlled and reviewed; avoid network-heavy reinstalls when the existing valid installation is sufficient. Security-impacting dependency alerts require assessment rather than blind upgrades.
- Installed does not mean architecturally mandatory. Preserve already-installed useful packages unless removal is explicitly approved, but never force their use merely because they are present.
- Treat external input and content as untrusted and encode/validate at the appropriate boundary.
- If architecture or requirements are ambiguous, document the assumption instead of silently making a major architectural decision.
- Make the smallest coherent change, avoid unrelated cleanup, and update source-of-truth documentation with contract or architecture changes.

## Dependency version policy

When an approved task adds or installs a new dependency, select the latest stable release that is compatible with the repository's existing runtime, framework, package-manager, peer-dependency, and related dependency constraints. Before installation, verify both that the selected release is stable and that its documented engines, peer ranges, and relevant framework/runtime support are compatible with the project.

Alpha, beta, release-candidate (RC), canary, experimental, nightly, preview, development, or any other prerelease build is prohibited unless the owner explicitly approves that specific prerelease use. A prerelease must never be selected merely because its version number or publication date is newer than the latest compatible stable release.

Apply this policy to newly introduced dependencies; do not upgrade, downgrade, or otherwise change existing dependency versions solely to make them latest. Existing dependencies change only when the approved task requires the change or the owner explicitly approves it. Keep the selected manifest versions intentional, review peer/engine compatibility before installation, and inspect the resulting lockfile for exact scope and unrelated resolution churn.

See application-specific [frontend](frontend.md), [backend](backend.md), [testing](testing.md), and [Git](git.md) standards.
