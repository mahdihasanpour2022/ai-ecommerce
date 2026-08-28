BEGIN;

CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "disabled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_users_email_canonical_check" CHECK (
        char_length("email") > 0
        AND "email" = btrim("email")
        AND "email" = lower("email")
    ),
    CONSTRAINT "admin_users_display_name_check" CHECK (
        char_length(btrim("display_name")) > 0
        AND "display_name" = btrim("display_name")
    ),
    CONSTRAINT "admin_users_password_hash_check" CHECK (char_length("password_hash") > 0),
    CONSTRAINT "admin_users_disabled_at_check" CHECK (
        "disabled_at" IS NULL OR "disabled_at" >= "created_at"
    )
);

CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "roles_code_format_check" CHECK ("code" ~ '^[A-Z][A-Z0-9_]*$')
);

CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "permissions_code_format_check" CHECK (
        "code" ~ '^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$'
    )
);

CREATE TABLE "admin_user_roles" (
    "admin_user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("admin_user_id", "role_id")
);

CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);

CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "csrf_token_hash" BYTEA NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auth_sessions_csrf_hash_length_check" CHECK (
        octet_length("csrf_token_hash") = 32
    ),
    CONSTRAINT "auth_sessions_expires_at_check" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "auth_sessions_last_used_at_check" CHECK ("last_used_at" >= "created_at"),
    CONSTRAINT "auth_sessions_revoked_at_check" CHECK (
        "revoked_at" IS NULL OR "revoked_at" >= "created_at"
    )
);

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "token_hash" BYTEA NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "rotated_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by_token_id" UUID,
    "recovery_ciphertext" BYTEA,
    "recovery_nonce" BYTEA,
    "recovery_auth_tag" BYTEA,
    "recovery_key_id" VARCHAR(128),
    "recovery_expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_tokens_token_hash_length_check" CHECK (
        octet_length("token_hash") = 32
    ),
    CONSTRAINT "refresh_tokens_expires_at_check" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "refresh_tokens_rotated_at_check" CHECK (
        "rotated_at" IS NULL
        OR ("rotated_at" >= "created_at" AND "rotated_at" <= "expires_at")
    ),
    CONSTRAINT "refresh_tokens_revoked_at_check" CHECK (
        "revoked_at" IS NULL OR "revoked_at" >= "created_at"
    ),
    CONSTRAINT "refresh_tokens_replacement_state_check" CHECK (
        "replaced_by_token_id" IS NULL OR "rotated_at" IS NOT NULL
    ),
    CONSTRAINT "refresh_tokens_not_self_replaced_check" CHECK (
        "replaced_by_token_id" IS NULL OR "replaced_by_token_id" <> "id"
    ),
    CONSTRAINT "refresh_tokens_recovery_envelope_check" CHECK (
        (
            "recovery_ciphertext" IS NULL
            AND "recovery_nonce" IS NULL
            AND "recovery_auth_tag" IS NULL
            AND "recovery_key_id" IS NULL
            AND "recovery_expires_at" IS NULL
        )
        OR (
            octet_length("recovery_ciphertext") > 0
            AND octet_length("recovery_nonce") = 12
            AND octet_length("recovery_auth_tag") = 16
            AND char_length(btrim("recovery_key_id")) > 0
            AND "recovery_key_id" = btrim("recovery_key_id")
            AND "recovery_expires_at" > "created_at"
            AND "recovery_expires_at" <= "expires_at"
        )
    )
);

CREATE TABLE "admin_login_throttles" (
    "identifier_key" BYTEA NOT NULL,
    "window_started_at" TIMESTAMPTZ(3),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "delay_until" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_throttles_pkey" PRIMARY KEY ("identifier_key"),
    CONSTRAINT "admin_login_throttles_identifier_key_length_check" CHECK (
        octet_length("identifier_key") = 32
    ),
    CONSTRAINT "admin_login_throttles_failure_count_check" CHECK ("failure_count" >= 0),
    CONSTRAINT "admin_login_throttles_window_check" CHECK (
        "window_started_at" IS NULL OR "window_started_at" <= "updated_at"
    ),
    CONSTRAINT "admin_login_throttles_delay_check" CHECK (
        "delay_until" IS NULL
        OR (
            "window_started_at" IS NOT NULL
            AND "delay_until" >= "window_started_at"
        )
    )
);

CREATE TABLE "auth_session_refresh_throttles" (
    "session_id" UUID NOT NULL,
    "window_started_at" TIMESTAMPTZ(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_session_refresh_throttles_pkey" PRIMARY KEY ("session_id"),
    CONSTRAINT "auth_session_refresh_throttles_attempt_count_check" CHECK (
        "attempt_count" >= 0
    ),
    CONSTRAINT "auth_session_refresh_throttles_window_check" CHECK (
        "window_started_at" IS NULL OR "window_started_at" <= "updated_at"
    )
);

CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");
CREATE INDEX "admin_user_roles_role_id_idx" ON "admin_user_roles"("role_id");
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");
CREATE INDEX "auth_sessions_admin_user_revoked_expires_idx"
    ON "auth_sessions"("admin_user_id", "revoked_at", "expires_at");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_session_created_at_idx"
    ON "refresh_tokens"("session_id", "created_at");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");
CREATE INDEX "refresh_tokens_recovery_expires_at_idx"
    ON "refresh_tokens"("recovery_expires_at");
CREATE UNIQUE INDEX "refresh_tokens_id_session_id_key"
    ON "refresh_tokens"("id", "session_id");
CREATE UNIQUE INDEX "refresh_tokens_replacement_session_key"
    ON "refresh_tokens"("replaced_by_token_id", "session_id");
CREATE UNIQUE INDEX "refresh_tokens_one_current_per_session"
    ON "refresh_tokens"("session_id")
    WHERE "rotated_at" IS NULL AND "revoked_at" IS NULL;
CREATE INDEX "admin_login_throttles_updated_at_idx"
    ON "admin_login_throttles"("updated_at");

ALTER TABLE "admin_user_roles"
    ADD CONSTRAINT "admin_user_roles_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "admin_user_roles"
    ADD CONSTRAINT "admin_user_roles_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "auth_sessions_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_replacement_fkey"
    FOREIGN KEY ("replaced_by_token_id", "session_id")
    REFERENCES "refresh_tokens"("id", "session_id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "auth_session_refresh_throttles"
    ADD CONSTRAINT "auth_session_refresh_throttles_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

INSERT INTO "roles" ("id", "code", "created_at", "updated_at")
VALUES ('00000000-0000-4000-8000-000000000001', 'SUPER_ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "permissions" ("id", "code", "created_at", "updated_at")
VALUES ('00000000-0000-4000-8000-000000000002', 'admin.access', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "role_permissions" ("role_id", "permission_id", "granted_at")
VALUES (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    CURRENT_TIMESTAMP
);

COMMIT;
