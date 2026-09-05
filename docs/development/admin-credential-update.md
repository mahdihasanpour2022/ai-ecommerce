# Initial Admin Credential Update

The API Workspace exposes a trusted one-shot command that replaces the migration-generated legacy username and password hash of the single existing initial Admin. It is not an HTTP endpoint, general password-reset tool, or repeatable Admin-management command.

## Safety and behavior

- Apply the reviewed username migration and build the API before injecting credentials.
- The command accepts no arguments and requires exactly one existing Admin whose username still has the migration-owned legacy form.
- Username is trimmed/lowercased and must match `^[a-z0-9_]{3,20}$`; password must match `^[0-9]{6}$` and exact confirmation.
- Password values are consumed from the child process environment, are never logged, and only an Argon2id hash is persisted.
- The username/hash update and revocation of every existing session/refresh credential for that Admin commit atomically. A repeated invocation fails safely.

## Command

From the repository root, verify the database, generate the Prisma Client, apply reviewed migrations, and build before secret injection:

```text
yarn db:verify
yarn workspace @e-commerce/api prisma:generate
yarn workspace @e-commerce/api prisma:migrate:deploy
yarn workspace @e-commerce/api build
```

Provide `DATABASE_URL`, `ADMIN_CREDENTIAL_USERNAME`, `ADMIN_CREDENTIAL_PASSWORD`, and `ADMIN_CREDENTIAL_PASSWORD_CONFIRM` through a trusted interactive process environment, then run:

```text
yarn workspace @e-commerce/api admin:update-initial-credentials
```

Success prints only `Initial Admin credentials updated successfully.` Invalid input, an unexpected Admin count, an already-updated account, or a database failure returns a fixed non-sensitive failure and exits nonzero.
