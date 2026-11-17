BEGIN;

CREATE TYPE "customer_otp_delivery_status" AS ENUM ('PENDING', 'ACCEPTED', 'FAILED', 'UNKNOWN');

CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "mobile" VARCHAR(13) NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "disabled_at" TIMESTAMPTZ(3),
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customers_mobile_canonical_check" CHECK ("mobile" ~ '^\+989[0-9]{9}$'),
    CONSTRAINT "customers_first_name_check" CHECK (
        char_length("first_name") BETWEEN 2 AND 50
        AND "first_name" = btrim("first_name")
        AND "first_name" !~ '[[:cntrl:]]'
    ),
    CONSTRAINT "customers_last_name_check" CHECK (
        char_length("last_name") BETWEEN 2 AND 50
        AND "last_name" = btrim("last_name")
        AND "last_name" !~ '[[:cntrl:]]'
    ),
    CONSTRAINT "customers_disabled_at_check" CHECK (
        "disabled_at" IS NULL OR "disabled_at" >= "created_at"
    ),
    CONSTRAINT "customers_last_login_at_check" CHECK (
        "last_login_at" IS NULL OR "last_login_at" >= "created_at"
    ),
    CONSTRAINT "customers_updated_at_check" CHECK ("updated_at" >= "created_at")
);

CREATE TABLE "customer_otp_challenges" (
    "id" UUID NOT NULL,
    "flow_token_hash" BYTEA NOT NULL,
    "mobile" VARCHAR(13) NOT NULL,
    "otp_digest" BYTEA NOT NULL,
    "client_reference_id" UUID NOT NULL,
    "delivery_status" "customer_otp_delivery_status" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "resend_available_at" TIMESTAMPTZ(3) NOT NULL,
    "failed_attempt_count" INTEGER NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMPTZ(3),
    "invalidated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_otp_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_otp_challenges_flow_token_hash_length_check" CHECK (
        octet_length("flow_token_hash") = 32
    ),
    CONSTRAINT "customer_otp_challenges_mobile_canonical_check" CHECK (
        "mobile" ~ '^\+989[0-9]{9}$'
    ),
    CONSTRAINT "customer_otp_challenges_otp_digest_length_check" CHECK (
        octet_length("otp_digest") = 32
    ),
    CONSTRAINT "customer_otp_challenges_failed_attempt_count_check" CHECK (
        "failed_attempt_count" BETWEEN 0 AND 5
    ),
    CONSTRAINT "customer_otp_challenges_timing_check" CHECK (
        "expires_at" > "created_at"
        AND "resend_available_at" > "created_at"
        AND "resend_available_at" <= "expires_at"
        AND "updated_at" >= "created_at"
    ),
    CONSTRAINT "customer_otp_challenges_verified_at_check" CHECK (
        "verified_at" IS NULL
        OR ("verified_at" >= "created_at" AND "verified_at" <= "expires_at")
    ),
    CONSTRAINT "customer_otp_challenges_invalidated_at_check" CHECK (
        "invalidated_at" IS NULL OR "invalidated_at" >= "created_at"
    ),
    CONSTRAINT "customer_otp_challenges_terminal_state_check" CHECK (
        NOT ("verified_at" IS NOT NULL AND "invalidated_at" IS NOT NULL)
    ),
    CONSTRAINT "customer_otp_challenges_delivery_state_check" CHECK (
        ("delivery_status" <> 'FAILED' OR "invalidated_at" IS NOT NULL)
        AND ("verified_at" IS NULL OR "delivery_status" IN ('ACCEPTED', 'UNKNOWN'))
        AND ("delivery_status" <> 'PENDING' OR "verified_at" IS NULL)
    )
);

CREATE TABLE "customer_registration_grants" (
    "id" UUID NOT NULL,
    "challenge_id" UUID NOT NULL,
    "flow_token_hash" BYTEA NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "invalidated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_registration_grants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_registration_grants_flow_token_hash_length_check" CHECK (
        octet_length("flow_token_hash") = 32
    ),
    CONSTRAINT "customer_registration_grants_expires_at_check" CHECK (
        "expires_at" > "created_at"
    ),
    CONSTRAINT "customer_registration_grants_consumed_at_check" CHECK (
        "consumed_at" IS NULL OR "consumed_at" >= "created_at"
    ),
    CONSTRAINT "customer_registration_grants_invalidated_at_check" CHECK (
        "invalidated_at" IS NULL OR "invalidated_at" >= "created_at"
    ),
    CONSTRAINT "customer_registration_grants_terminal_state_check" CHECK (
        NOT ("consumed_at" IS NOT NULL AND "invalidated_at" IS NOT NULL)
    ),
    CONSTRAINT "customer_registration_grants_updated_at_check" CHECK (
        "updated_at" >= "created_at"
    )
);

CREATE TABLE "customer_auth_sessions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "csrf_token_hash" BYTEA NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_auth_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_auth_sessions_csrf_hash_length_check" CHECK (
        octet_length("csrf_token_hash") = 32
    ),
    CONSTRAINT "customer_auth_sessions_expires_at_check" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "customer_auth_sessions_last_used_at_check" CHECK (
        "last_used_at" >= "created_at"
    ),
    CONSTRAINT "customer_auth_sessions_revoked_at_check" CHECK (
        "revoked_at" IS NULL OR "revoked_at" >= "created_at"
    ),
    CONSTRAINT "customer_auth_sessions_updated_at_check" CHECK (
        "updated_at" >= "created_at"
    )
);

CREATE TABLE "customer_refresh_tokens" (
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

    CONSTRAINT "customer_refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_refresh_tokens_token_hash_length_check" CHECK (
        octet_length("token_hash") = 32
    ),
    CONSTRAINT "customer_refresh_tokens_expires_at_check" CHECK (
        "expires_at" > "created_at"
    ),
    CONSTRAINT "customer_refresh_tokens_rotated_at_check" CHECK (
        "rotated_at" IS NULL
        OR ("rotated_at" >= "created_at" AND "rotated_at" <= "expires_at")
    ),
    CONSTRAINT "customer_refresh_tokens_revoked_at_check" CHECK (
        "revoked_at" IS NULL OR "revoked_at" >= "created_at"
    ),
    CONSTRAINT "customer_refresh_tokens_replacement_state_check" CHECK (
        "replaced_by_token_id" IS NULL OR "rotated_at" IS NOT NULL
    ),
    CONSTRAINT "customer_refresh_tokens_not_self_replaced_check" CHECK (
        "replaced_by_token_id" IS NULL OR "replaced_by_token_id" <> "id"
    ),
    CONSTRAINT "customer_refresh_tokens_recovery_envelope_check" CHECK (
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

CREATE TABLE "customer_otp_mobile_throttles" (
    "mobile_key" BYTEA NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_otp_mobile_throttles_pkey" PRIMARY KEY ("mobile_key"),
    CONSTRAINT "customer_otp_mobile_throttles_mobile_key_length_check" CHECK (
        octet_length("mobile_key") = 32
    )
);

CREATE TABLE "customer_auth_session_refresh_throttles" (
    "session_id" UUID NOT NULL,
    "window_started_at" TIMESTAMPTZ(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_auth_session_refresh_throttles_pkey" PRIMARY KEY ("session_id"),
    CONSTRAINT "customer_auth_session_refresh_throttles_attempt_count_check" CHECK (
        "attempt_count" >= 0
    ),
    CONSTRAINT "customer_auth_session_refresh_throttles_window_check" CHECK (
        "window_started_at" IS NULL OR "window_started_at" <= "updated_at"
    )
);

CREATE UNIQUE INDEX "customers_mobile_key" ON "customers"("mobile");
CREATE UNIQUE INDEX "customer_otp_challenges_flow_token_hash_key"
    ON "customer_otp_challenges"("flow_token_hash");
CREATE UNIQUE INDEX "customer_otp_challenges_client_reference_id_key"
    ON "customer_otp_challenges"("client_reference_id");
CREATE INDEX "customer_otp_challenges_mobile_created_at_idx"
    ON "customer_otp_challenges"("mobile", "created_at");
CREATE INDEX "customer_otp_challenges_expires_at_idx"
    ON "customer_otp_challenges"("expires_at");
CREATE UNIQUE INDEX "customer_otp_challenges_one_open_per_mobile"
    ON "customer_otp_challenges"("mobile")
    WHERE "verified_at" IS NULL AND "invalidated_at" IS NULL;
CREATE UNIQUE INDEX "customer_registration_grants_challenge_id_key"
    ON "customer_registration_grants"("challenge_id");
CREATE UNIQUE INDEX "customer_registration_grants_flow_token_hash_key"
    ON "customer_registration_grants"("flow_token_hash");
CREATE INDEX "customer_registration_grants_expires_at_idx"
    ON "customer_registration_grants"("expires_at");
CREATE INDEX "customer_auth_sessions_customer_revoked_expires_idx"
    ON "customer_auth_sessions"("customer_id", "revoked_at", "expires_at");
CREATE INDEX "customer_auth_sessions_expires_at_idx"
    ON "customer_auth_sessions"("expires_at");
CREATE UNIQUE INDEX "customer_refresh_tokens_token_hash_key"
    ON "customer_refresh_tokens"("token_hash");
CREATE UNIQUE INDEX "customer_refresh_tokens_id_session_id_key"
    ON "customer_refresh_tokens"("id", "session_id");
CREATE UNIQUE INDEX "customer_refresh_tokens_replacement_session_key"
    ON "customer_refresh_tokens"("replaced_by_token_id", "session_id");
CREATE INDEX "customer_refresh_tokens_session_created_at_idx"
    ON "customer_refresh_tokens"("session_id", "created_at");
CREATE INDEX "customer_refresh_tokens_expires_at_idx"
    ON "customer_refresh_tokens"("expires_at");
CREATE INDEX "customer_refresh_tokens_recovery_expires_at_idx"
    ON "customer_refresh_tokens"("recovery_expires_at");
CREATE UNIQUE INDEX "customer_refresh_tokens_one_current_per_session"
    ON "customer_refresh_tokens"("session_id")
    WHERE "rotated_at" IS NULL AND "revoked_at" IS NULL;
CREATE INDEX "customer_otp_mobile_throttles_updated_at_idx"
    ON "customer_otp_mobile_throttles"("updated_at");

ALTER TABLE "customer_registration_grants"
    ADD CONSTRAINT "customer_registration_grants_challenge_id_fkey"
    FOREIGN KEY ("challenge_id") REFERENCES "customer_otp_challenges"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "customer_auth_sessions"
    ADD CONSTRAINT "customer_auth_sessions_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "customer_refresh_tokens"
    ADD CONSTRAINT "customer_refresh_tokens_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "customer_auth_sessions"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "customer_refresh_tokens"
    ADD CONSTRAINT "customer_refresh_tokens_replacement_fkey"
    FOREIGN KEY ("replaced_by_token_id", "session_id")
    REFERENCES "customer_refresh_tokens"("id", "session_id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "customer_auth_session_refresh_throttles"
    ADD CONSTRAINT "customer_auth_session_refresh_throttles_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "customer_auth_sessions"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT;
