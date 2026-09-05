BEGIN;

ALTER TABLE "admin_users"
    ADD COLUMN "username" VARCHAR(20);

UPDATE "admin_users"
SET "username" = 'legacy_' || left(replace("id"::text, '-', ''), 13)
WHERE "username" IS NULL;

ALTER TABLE "admin_users"
    ALTER COLUMN "username" SET NOT NULL,
    ADD CONSTRAINT "admin_users_username_canonical_check"
        CHECK ("username" ~ '^[a-z0-9_]{3,20}$');

CREATE UNIQUE INDEX "admin_users_username_key"
    ON "admin_users"("username");

COMMIT;
