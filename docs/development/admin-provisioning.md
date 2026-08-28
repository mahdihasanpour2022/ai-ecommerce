# First Super Admin Provisioning

The API Workspace exposes one trusted-environment command that provisions the initial Admin identity and assigns the migration-created `SUPER_ADMIN` Role. It is not a seed, public/internal HTTP endpoint, general Admin-management command, or login flow.

## Safety boundary

- Run the command only from a trusted administrative environment against an identified database whose reviewed migrations are current.
- The command accepts no arguments. In particular, never place a password in argv, a tracked/ignored `.env` file, a command literal, shell history, logs, or documentation.
- Inject the one-shot password variables through an approved secret mechanism or a secure interactive wrapper owned by the execution environment. The command removes them from its own environment immediately after capture, emits no credential/identifier/hash, and disconnects after completion.
- Build before injecting the one-shot variables so compilation tools do not inherit the password.
- The first successful invocation is terminal for that database. Repeat or concurrent attempts fail safely; there is no override flag, default credential, or permanent bootstrap marker.

## Prerequisites

From the repository root, verify the intended PostgreSQL target, apply the reviewed migrations through the approved workflow, and prepare generated/compiled output before supplying any one-shot secret:

```text
yarn db:verify
yarn workspace @automotive-commerce/api prisma:generate
yarn workspace @automotive-commerce/api build
```

Production database targeting, migration deployment, and secret injection require their separately approved operational controls. The local `db:verify` command proves only the repository's disposable development/test identities.

## Input contract

The command reads these values only from its invoking process:

| Variable | Rules |
| --- | --- |
| `DATABASE_URL` | Required PostgreSQL URL for the explicitly verified target database. |
| `ADMIN_BOOTSTRAP_EMAIL` | Required email; trimmed and stored as lowercase canonical form; maximum 254 characters. |
| `ADMIN_BOOTSTRAP_DISPLAY_NAME` | Required trimmed non-control display name; maximum 120 characters. |
| `ADMIN_BOOTSTRAP_PASSWORD` | Required 15–128-character password. Unicode and whitespace are allowed; no composition rule or silent truncation is applied. |
| `ADMIN_BOOTSTRAP_PASSWORD_CONFIRM` | Required exact confirmation of the password. |

After an approved mechanism has injected those process values, run:

```text
yarn workspace @automotive-commerce/api admin:create-super-admin
```

Success prints only `First Super Admin provisioned successfully.` and exits `0`. Invalid/missing input, an existing Admin, invalid migration reference state, or a database failure prints a fixed non-secret failure message and exits nonzero.

## Database behavior

The password is hashed before opening the database transaction with Argon2id v19, 64 MiB memory, three iterations, parallelism one, a 32-byte output, and a library-generated unique salt. The encoded hash is the only credential material persisted.

Within one transaction, the command takes a fixed transaction-scoped PostgreSQL advisory lock, requires zero existing Admins, verifies the exact `SUPER_ADMIN` → `admin.access` reference grant, and atomically inserts the `AdminUser` plus its Role assignment. It creates no session, refresh token, CSRF material, throttle row, or authentication cookie.
