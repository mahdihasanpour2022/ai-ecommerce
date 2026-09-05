\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    expected_table TEXT;
BEGIN
    FOREACH expected_table IN ARRAY ARRAY[
        'admin_users',
        'roles',
        'permissions',
        'admin_user_roles',
        'role_permissions',
        'auth_sessions',
        'refresh_tokens',
        'admin_login_throttles',
        'auth_session_refresh_throttles'
    ]
    LOOP
        IF to_regclass('public.' || expected_table) IS NULL THEN
            RAISE EXCEPTION 'Expected table % is missing', expected_table;
        END IF;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'refresh_tokens_one_current_per_session'
          AND indexdef LIKE '%WHERE ((rotated_at IS NULL) AND (revoked_at IS NULL))%'
    ) THEN
        RAISE EXCEPTION 'Current-refresh-token partial unique index is missing or malformed';
    END IF;

    IF (
        SELECT count(*)
        FROM roles
        WHERE code = 'SUPER_ADMIN'
    ) <> 1 OR (
        SELECT count(*)
        FROM permissions
        WHERE code = 'admin.access'
    ) <> 1 OR (
        SELECT count(*)
        FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.code = 'SUPER_ADMIN' AND p.code = 'admin.access'
    ) <> 1 THEN
        RAISE EXCEPTION 'Expected Sprint 1 RBAC reference state is missing or duplicated';
    END IF;
END;
$$;

INSERT INTO admin_users (
    id,
    email,
    username,
    display_name,
    password_hash,
    updated_at
) VALUES (
    '10000000-0000-4000-8000-000000000001',
    'schema-test@example.invalid',
    'schema_test_admin',
    'Schema Test Admin',
    '$argon2id$test-fixture-not-a-credential',
    CURRENT_TIMESTAMP
);

INSERT INTO admin_user_roles (admin_user_id, role_id)
SELECT
    '10000000-0000-4000-8000-000000000001',
    id
FROM roles
WHERE code = 'SUPER_ADMIN';

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO admin_users (
            id,
            email,
            username,
            display_name,
            password_hash,
            updated_at
        ) VALUES (
            '10000000-0000-4000-8000-000000000002',
            'schema-test@example.invalid',
            'different_username',
            'Duplicate Admin',
            '$argon2id$test-fixture-not-a-credential',
            CURRENT_TIMESTAMP
        );
    EXCEPTION WHEN unique_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Duplicate Admin email was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO admin_users (
            id,
            email,
            username,
            display_name,
            password_hash,
            updated_at
        ) VALUES (
            '10000000-0000-4000-8000-000000000005',
            'duplicate-username@example.invalid',
            'schema_test_admin',
            'Duplicate Username Admin',
            '$argon2id$test-fixture-not-a-credential',
            CURRENT_TIMESTAMP
        );
    EXCEPTION WHEN unique_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Duplicate Admin username was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO admin_users (
            id,
            email,
            username,
            display_name,
            password_hash,
            updated_at
        ) VALUES (
            '10000000-0000-4000-8000-000000000003',
            'Not-Canonical@example.invalid',
            'another_username',
            'Invalid Admin',
            '$argon2id$test-fixture-not-a-credential',
            CURRENT_TIMESTAMP
        );
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Non-canonical Admin email was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO admin_users (
            id,
            email,
            username,
            display_name,
            password_hash,
            updated_at
        ) VALUES (
            '10000000-0000-4000-8000-000000000004',
            'username-test@example.invalid',
            'Invalid-Username',
            'Invalid Username Admin',
            '$argon2id$test-fixture-not-a-credential',
            CURRENT_TIMESTAMP
        );
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Non-canonical Admin username was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO admin_user_roles (admin_user_id, role_id)
        SELECT
            '10000000-0000-4000-8000-000000000001',
            id
        FROM roles
        WHERE code = 'SUPER_ADMIN';
    EXCEPTION WHEN unique_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Duplicate Admin role assignment was accepted';
    END IF;
END;
$$;

INSERT INTO auth_sessions (
    id,
    admin_user_id,
    csrf_token_hash,
    expires_at,
    updated_at
) VALUES
(
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    decode(repeat('11', 32), 'hex'),
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    CURRENT_TIMESTAMP
),
(
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    decode(repeat('22', 32), 'hex'),
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    CURRENT_TIMESTAMP
);

INSERT INTO auth_session_refresh_throttles (session_id)
VALUES ('20000000-0000-4000-8000-000000000001');

INSERT INTO refresh_tokens (
    id,
    session_id,
    token_hash,
    expires_at,
    recovery_ciphertext,
    recovery_nonce,
    recovery_auth_tag,
    recovery_key_id,
    recovery_expires_at
) VALUES (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    decode(repeat('33', 32), 'hex'),
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    decode('01020304', 'hex'),
    decode(repeat('44', 12), 'hex'),
    decode(repeat('55', 16), 'hex'),
    'test-key-id',
    CURRENT_TIMESTAMP + INTERVAL '10 seconds'
);

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO refresh_tokens (
            id,
            session_id,
            token_hash,
            expires_at
        ) VALUES (
            '30000000-0000-4000-8000-000000000002',
            '20000000-0000-4000-8000-000000000001',
            decode(repeat('66', 32), 'hex'),
            CURRENT_TIMESTAMP + INTERVAL '7 days'
        );
    EXCEPTION WHEN unique_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'A second current refresh token was accepted for one session';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO auth_sessions (
            id,
            admin_user_id,
            csrf_token_hash,
            expires_at,
            updated_at
        ) VALUES (
            '20000000-0000-4000-8000-000000000003',
            '10000000-0000-4000-8000-000000000001',
            decode('ff', 'hex'),
            CURRENT_TIMESTAMP + INTERVAL '7 days',
            CURRENT_TIMESTAMP
        );
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Malformed CSRF hash was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO admin_login_throttles (identifier_key, failure_count)
        VALUES (decode(repeat('77', 32), 'hex'), -1);
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Negative login throttle count was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        UPDATE refresh_tokens
        SET recovery_nonce = decode('ff', 'hex')
        WHERE id = '30000000-0000-4000-8000-000000000001';
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Malformed recovery envelope was accepted';
    END IF;
END;
$$;

UPDATE refresh_tokens
SET rotated_at = CURRENT_TIMESTAMP
WHERE id = '30000000-0000-4000-8000-000000000001';

INSERT INTO refresh_tokens (
    id,
    session_id,
    token_hash,
    expires_at
) VALUES
(
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    decode(repeat('66', 32), 'hex'),
    CURRENT_TIMESTAMP + INTERVAL '7 days'
),
(
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    decode(repeat('88', 32), 'hex'),
    CURRENT_TIMESTAMP + INTERVAL '7 days'
);

UPDATE refresh_tokens
SET replaced_by_token_id = '30000000-0000-4000-8000-000000000002'
WHERE id = '30000000-0000-4000-8000-000000000001';

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        UPDATE refresh_tokens
        SET replaced_by_token_id = '30000000-0000-4000-8000-000000000003'
        WHERE id = '30000000-0000-4000-8000-000000000001';
    EXCEPTION WHEN foreign_key_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Cross-session refresh replacement was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        DELETE FROM admin_users
        WHERE id = '10000000-0000-4000-8000-000000000001';
    EXCEPTION WHEN foreign_key_violation OR restrict_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Admin with retained sessions was hard-deleted';
    END IF;

    rejected := FALSE;
    BEGIN
        DELETE FROM permissions WHERE code = 'admin.access';
    EXCEPTION WHEN foreign_key_violation OR restrict_violation THEN
        rejected := TRUE;
    END;

    IF NOT rejected THEN
        RAISE EXCEPTION 'Granted system permission was deleted';
    END IF;
END;
$$;

DELETE FROM auth_sessions
WHERE id = '20000000-0000-4000-8000-000000000001';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM refresh_tokens
        WHERE session_id = '20000000-0000-4000-8000-000000000001'
    ) OR EXISTS (
        SELECT 1
        FROM auth_session_refresh_throttles
        WHERE session_id = '20000000-0000-4000-8000-000000000001'
    ) THEN
        RAISE EXCEPTION 'Session-owned refresh/throttle rows did not cascade';
    END IF;
END;
$$;

ROLLBACK;
