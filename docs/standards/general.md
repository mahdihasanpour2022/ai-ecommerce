# General Engineering Standards

- Optimize for readability, maintainability, and explicit behavior.
- Apply SOLID and clean-code principles pragmatically; prefer the simplest solution that meets verified requirements.
- Avoid premature optimization, premature abstraction, unnecessary dependencies, speculative infrastructure, and generic layers created for pattern purity.
- Keep modules and functions focused; use meaningful domain names and explicit contracts.
- Avoid duplicated business logic and hidden side effects. Preserve existing conventions unless a deliberate change is proposed and approved.
- Comments explain rationale, constraints, or non-obvious trade-offs—not obvious syntax.
- Never expose, commit, hardcode, or log credentials, tokens, secrets, or sensitive configuration. Environment-specific values belong in validated environment configuration.
- Dependency additions, removals, and upgrades require explicit approval and a concrete reason. After pnpm migration, the pnpm lockfile is source-controlled and reviewed. Security-impacting dependency alerts require assessment rather than blind upgrades.
- Installed does not mean architecturally mandatory. Preserve already-installed useful packages unless removal is explicitly approved, but never force their use merely because they are present.
- Treat external input and content as untrusted and encode/validate at the appropriate boundary.
- If architecture or requirements are ambiguous, document the assumption instead of silently making a major architectural decision.
- Make the smallest coherent change, avoid unrelated cleanup, and update source-of-truth documentation with contract or architecture changes.

See application-specific [frontend](frontend.md), [backend](backend.md), [testing](testing.md), and [Git](git.md) standards.
