\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    expected_name TEXT;
BEGIN
    FOREACH expected_name IN ARRAY ARRAY[
        'categories',
        'products',
        'product_variants',
        'inventories',
        'product_images',
        'product_image_cleanups',
        'price_display_settings'
    ] LOOP
        IF to_regclass('public.' || expected_name) IS NULL THEN
            RAISE EXCEPTION 'Expected catalog table % is missing', expected_name;
        END IF;
    END LOOP;

    FOREACH expected_name IN ARRAY ARRAY[
        'product_status',
        'product_image_media_type',
        'price_display_unit'
    ] LOOP
        IF to_regtype('public.' || expected_name) IS NULL THEN
            RAISE EXCEPTION 'Expected catalog enum % is missing', expected_name;
        END IF;
    END LOOP;

    FOREACH expected_name IN ARRAY ARRAY[
        'categories_name_check',
        'categories_name_key_check',
        'categories_timestamps_check',
        'products_name_check',
        'products_description_check',
        'products_image_version_check',
        'products_timestamps_check',
        'product_variants_sku_format_check',
        'product_variants_size_pair_check',
        'product_variants_color_pair_check',
        'product_variants_price_rial_check',
        'product_variants_timestamps_check',
        'inventories_quantity_check',
        'inventories_version_check',
        'inventories_timestamps_check',
        'product_images_storage_key_check',
        'product_images_byte_size_check',
        'product_images_dimensions_check',
        'product_images_position_check',
        'product_images_timestamps_check',
        'product_image_cleanups_storage_key_check',
        'product_image_cleanups_attempt_check',
        'product_image_cleanups_timestamps_check',
        'price_display_settings_singleton_check',
        'price_display_settings_timestamps_check',
        'categories_parent_id_fkey',
        'products_category_id_fkey',
        'product_variants_product_id_fkey',
        'inventories_variant_id_fkey',
        'product_images_product_id_fkey'
    ] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = expected_name) THEN
            RAISE EXCEPTION 'Expected catalog constraint % is missing', expected_name;
        END IF;
    END LOOP;

    FOREACH expected_name IN ARRAY ARRAY[
        'catalog_assert_category_tree()',
        'catalog_guard_inventory_version()',
        'catalog_guard_product_image_version()',
        'catalog_guard_product_variant_ownership()',
        'catalog_guard_product_image_identity()',
        'catalog_guard_price_display_singleton()',
        'catalog_assert_product_integrity(uuid)',
        'catalog_check_product_from_product()',
        'catalog_check_product_from_variant()',
        'catalog_check_product_from_inventory()',
        'catalog_check_product_from_image()',
        'catalog_assert_product_image_order()'
    ] LOOP
        IF to_regprocedure('public.' || expected_name) IS NULL THEN
            RAISE EXCEPTION 'Expected catalog function % is missing', expected_name;
        END IF;
    END LOOP;

    FOREACH expected_name IN ARRAY ARRAY[
        'categories_tree_guard',
        'inventories_version_guard',
        'products_image_version_guard',
        'product_variants_ownership_guard',
        'product_images_identity_guard',
        'price_display_settings_singleton_guard',
        'products_integrity_check',
        'product_variants_integrity_check',
        'inventories_integrity_check',
        'product_images_product_integrity_check',
        'product_images_order_check'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = expected_name AND NOT tgisinternal
        ) THEN
            RAISE EXCEPTION 'Expected catalog trigger % is missing', expected_name;
        END IF;
    END LOOP;

    IF (
        SELECT count(*)
        FROM pg_constraint
        WHERE conname IN (
            'categories_parent_id_fkey',
            'products_category_id_fkey',
            'product_variants_product_id_fkey',
            'inventories_variant_id_fkey',
            'product_images_product_id_fkey'
        )
          AND confdeltype = 'r'
          AND confupdtype = 'a'
    ) <> 5 THEN
        RAISE EXCEPTION 'Catalog foreign-key actions are not RESTRICT / NO ACTION';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'categories_parent_id_name_key_key'
          AND indexdef LIKE '%NULLS NOT DISTINCT%'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'product_variants_product_size_color_key'
          AND indexdef LIKE '%NULLS NOT DISTINCT%'
    ) THEN
        RAISE EXCEPTION 'Catalog null-equal unique indexes are missing or malformed';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'product_images_product_id_position_key'
          AND condeferrable
          AND NOT condeferred
    ) THEN
        RAISE EXCEPTION 'Image position constraint is not initially-immediate deferrable';
    END IF;

    IF (
        SELECT count(*) FROM price_display_settings WHERE id = 1 AND unit = 'TOMAN'
    ) <> 1 OR (
        SELECT count(*)
        FROM permissions
        WHERE code IN (
            'catalog.read',
            'catalog.manage',
            'inventory.update',
            'product.media.manage',
            'settings.price.display.unit.update'
        )
    ) <> 5 OR (
        SELECT count(*)
        FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.code = 'SUPER_ADMIN'
          AND p.code IN (
              'catalog.read',
              'catalog.manage',
              'inventory.update',
              'product.media.manage',
              'settings.price.display.unit.update'
          )
    ) <> 5 THEN
        RAISE EXCEPTION 'Catalog singleton or permission reference state is invalid';
    END IF;

END;
$$;

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO permissions (id, code, updated_at)
        VALUES ('40000000-0000-4000-8000-000000000001', 'test.hyphen-code', CURRENT_TIMESTAMP);
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Sprint 1 Permission-code constraint accepted a hyphenated segment';
    END IF;
END;
$$;

INSERT INTO categories (id, name, name_key, updated_at) VALUES
    ('41000000-0000-4000-8000-000000000001', 'Root', 'root', CURRENT_TIMESTAMP),
    ('41000000-0000-4000-8000-000000000002', 'Other Root', 'other root', CURRENT_TIMESTAMP);

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO categories (id, name, name_key, updated_at)
        VALUES ('41000000-0000-4000-8000-000000000003', 'Duplicate Root', 'root', CURRENT_TIMESTAMP);
    EXCEPTION WHEN unique_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Duplicate normalized root Category was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO categories (id, name, name_key, updated_at)
        VALUES ('41000000-0000-4000-8000-000000000004', ' Invalid ', 'invalid', CURRENT_TIMESTAMP);
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Untrimmed Category was accepted';
    END IF;
END;
$$;

INSERT INTO categories (id, name, name_key, parent_id, updated_at) VALUES
    ('41000000-0000-4000-8000-000000000011', 'L2', 'l2', '41000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP),
    ('41000000-0000-4000-8000-000000000012', 'L3', 'l3', '41000000-0000-4000-8000-000000000011', CURRENT_TIMESTAMP),
    ('41000000-0000-4000-8000-000000000013', 'L4', 'l4', '41000000-0000-4000-8000-000000000012', CURRENT_TIMESTAMP),
    ('41000000-0000-4000-8000-000000000014', 'L5', 'l5', '41000000-0000-4000-8000-000000000013', CURRENT_TIMESTAMP),
    ('41000000-0000-4000-8000-000000000015', 'L6', 'l6', '41000000-0000-4000-8000-000000000014', CURRENT_TIMESTAMP);

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO categories (id, name, name_key, parent_id, updated_at)
        VALUES ('41000000-0000-4000-8000-000000000016', 'L7', 'l7',
                '41000000-0000-4000-8000-000000000015', CURRENT_TIMESTAMP);
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Seventh Category level was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        UPDATE categories
        SET parent_id = '41000000-0000-4000-8000-000000000015', updated_at = CURRENT_TIMESTAMP
        WHERE id = '41000000-0000-4000-8000-000000000001';
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Category descendant cycle was accepted';
    END IF;
END;
$$;

INSERT INTO categories (id, name, name_key, updated_at)
SELECT
    ('50000000-0000-4000-8000-' || lpad(sequence::TEXT, 12, '0'))::UUID,
    'Cap ' || sequence,
    'cap-' || sequence,
    CURRENT_TIMESTAMP
FROM generate_series(1, 993) AS sequence;

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO categories (id, name, name_key, updated_at)
        VALUES ('50000000-0000-4000-8000-000000001001', 'Cap Overflow',
                'cap-overflow', CURRENT_TIMESTAMP);
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Category 1,001 was accepted';
    END IF;
END;
$$;

INSERT INTO products (id, name, category_id, updated_at)
VALUES ('42000000-0000-4000-8000-000000000001', 'Draft Product',
        '41000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP);
INSERT INTO product_variants (
    id, product_id, sku, price_rial, updated_at
) VALUES (
    '43000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000001',
    'DRAFT-1', 1000, CURRENT_TIMESTAMP
);
INSERT INTO inventories (variant_id, updated_at)
VALUES ('43000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP);
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO product_variants (
            id, product_id, sku, price_rial, updated_at
        ) VALUES (
            '43000000-0000-4000-8000-000000000002',
            '42000000-0000-4000-8000-000000000001',
            'DRAFT-2', 1001, CURRENT_TIMESTAMP
        );
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Non-divisible rial price was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO product_variants (
            id, product_id, sku, price_rial, updated_at
        ) VALUES (
            '43000000-0000-4000-8000-000000000003',
            '42000000-0000-4000-8000-000000000001',
            'lowercase', 1000, CURRENT_TIMESTAMP
        );
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Malformed SKU was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO product_variants (
            id, product_id, sku, price_rial, updated_at
        ) VALUES (
            '43000000-0000-4000-8000-000000000004',
            '42000000-0000-4000-8000-000000000001',
            'DRAFT-4', 1000, CURRENT_TIMESTAMP
        );
    EXCEPTION WHEN unique_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Duplicate nullable Variant combination was accepted';
    END IF;
END;
$$;

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO products (id, name, category_id, updated_at)
        VALUES ('42000000-0000-4000-8000-000000000002', 'No Variant',
                '41000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP);
        SET CONSTRAINTS ALL IMMEDIATE;
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    SET CONSTRAINTS ALL DEFERRED;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Product without a Variant was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO product_variants (
            id, product_id, sku, size, size_key, price_rial, is_active, updated_at
        ) VALUES (
            '43000000-0000-4000-8000-000000000006',
            '42000000-0000-4000-8000-000000000001',
            'NO-INVENTORY-6', 'XL', 'xl', 1000, FALSE, CURRENT_TIMESTAMP
        );
        SET CONSTRAINTS ALL IMMEDIATE;
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    SET CONSTRAINTS ALL DEFERRED;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Variant without Inventory was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO product_variants (
            id, product_id, sku, size, size_key, price_rial, updated_at
        ) VALUES (
            '43000000-0000-4000-8000-000000000005',
            '42000000-0000-4000-8000-000000000001',
            'NAMED-5', 'M', 'm', 1000, CURRENT_TIMESTAMP
        );
        INSERT INTO inventories (variant_id, updated_at)
        VALUES ('43000000-0000-4000-8000-000000000005', CURRENT_TIMESTAMP);
        SET CONSTRAINTS ALL IMMEDIATE;
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    SET CONSTRAINTS ALL DEFERRED;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Mixed active default/named Variant modes were accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        UPDATE products
        SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
        WHERE id = '42000000-0000-4000-8000-000000000001';
        SET CONSTRAINTS ALL IMMEDIATE;
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    SET CONSTRAINTS ALL DEFERRED;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Incomplete Product activation was accepted';
    END IF;
END;
$$;

INSERT INTO product_images (
    id, product_id, storage_key, media_type, byte_size, width, height, position, updated_at
) VALUES (
    '44000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000001',
    'catalog/test/main.webp', 'WEBP', 1024, 100, 100, 0, CURRENT_TIMESTAMP
);
UPDATE products
SET description = 'Complete description', status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
WHERE id = '42000000-0000-4000-8000-000000000001';
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO product_images (
            id, product_id, storage_key, media_type, byte_size, width, height, position, updated_at
        ) VALUES (
            '44000000-0000-4000-8000-000000000003',
            '42000000-0000-4000-8000-000000000001',
            'catalog/test/gap.webp', 'WEBP', 1024, 100, 100, 3, CURRENT_TIMESTAMP
        );
        SET CONSTRAINTS ALL IMMEDIATE;
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    SET CONSTRAINTS ALL DEFERRED;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Gapped Product Image collection was accepted';
    END IF;
END;
$$;

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        UPDATE inventories
        SET version = 3, updated_at = CURRENT_TIMESTAMP
        WHERE variant_id = '43000000-0000-4000-8000-000000000001';
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Inventory version jump was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        UPDATE products
        SET image_version = 3, updated_at = CURRENT_TIMESTAMP
        WHERE id = '42000000-0000-4000-8000-000000000001';
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Product image-version jump was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        DELETE FROM categories WHERE id = '41000000-0000-4000-8000-000000000001';
    EXCEPTION WHEN foreign_key_violation OR restrict_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Referenced Category was deleted';
    END IF;
END;
$$;

UPDATE inventories
SET on_hand_quantity = 5, version = version + 1, updated_at = CURRENT_TIMESTAMP
WHERE variant_id = '43000000-0000-4000-8000-000000000001' AND version = 1;

INSERT INTO product_images (
    id, product_id, storage_key, media_type, byte_size, width, height, position, updated_at
) VALUES (
    '44000000-0000-4000-8000-000000000002',
    '42000000-0000-4000-8000-000000000001',
    'catalog/test/second.webp', 'WEBP', 1024, 100, 100, 1, CURRENT_TIMESTAMP
);
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS "product_images_product_id_position_key" DEFERRED;
UPDATE product_images
SET position = CASE position WHEN 0 THEN 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP
WHERE product_id = '42000000-0000-4000-8000-000000000001';
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

DO $$
DECLARE
    rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO product_image_cleanups (
            id, storage_key, attempt_count, last_failure_code, updated_at
        ) VALUES (
            '45000000-0000-4000-8000-000000000001',
            'catalog/test/cleanup.webp', 0, 'DELETE_FAILED', CURRENT_TIMESTAMP
        );
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Malformed cleanup retry state was accepted';
    END IF;

    rejected := FALSE;
    BEGIN
        DELETE FROM price_display_settings WHERE id = 1;
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Price display singleton was deleted';
    END IF;

    rejected := FALSE;
    BEGIN
        INSERT INTO price_display_settings (id, unit, updated_at)
        VALUES (2, 'RIAL', CURRENT_TIMESTAMP);
    EXCEPTION WHEN check_violation THEN
        rejected := TRUE;
    END;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Second price display row was accepted';
    END IF;
END;
$$;

DO $$
BEGIN
    IF (SELECT on_hand_quantity FROM inventories
        WHERE variant_id = '43000000-0000-4000-8000-000000000001') <> 5
       OR (SELECT version FROM inventories
           WHERE variant_id = '43000000-0000-4000-8000-000000000001') <> 2 THEN
        RAISE EXCEPTION 'Guarded Inventory update did not persist exactly once';
    END IF;

    IF (SELECT array_agg(position ORDER BY position) FROM product_images
        WHERE product_id = '42000000-0000-4000-8000-000000000001') <> ARRAY[0::SMALLINT, 1::SMALLINT] THEN
        RAISE EXCEPTION 'Deferred Image reorder did not preserve contiguous ordering';
    END IF;
END;
$$;

ROLLBACK;
