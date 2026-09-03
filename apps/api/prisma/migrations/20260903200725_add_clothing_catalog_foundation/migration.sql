BEGIN;

CREATE TYPE "product_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "product_image_media_type" AS ENUM ('WEBP', 'JPEG', 'PNG');
CREATE TYPE "price_display_unit" AS ENUM ('RIAL', 'TOMAN');

CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "name_key" VARCHAR(256) NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_name_check" CHECK (
        "name" = btrim("name") AND char_length("name") BETWEEN 1 AND 120
    ),
    CONSTRAINT "categories_name_key_check" CHECK (
        "name_key" = btrim("name_key") AND char_length("name_key") BETWEEN 1 AND 256
    ),
    CONSTRAINT "categories_timestamps_check" CHECK ("updated_at" >= "created_at")
);

CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category_id" UUID NOT NULL,
    "status" "product_status" NOT NULL DEFAULT 'DRAFT',
    "image_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_name_check" CHECK (
        "name" = btrim("name") AND char_length("name") BETWEEN 1 AND 200
    ),
    CONSTRAINT "products_description_check" CHECK (
        "description" IS NULL OR (
            "description" = btrim("description")
            AND char_length("description") BETWEEN 1 AND 5000
        )
    ),
    CONSTRAINT "products_image_version_check" CHECK (
        "image_version" BETWEEN 1 AND 2147483647
    ),
    CONSTRAINT "products_timestamps_check" CHECK ("updated_at" >= "created_at")
);

CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "size" VARCHAR(80),
    "size_key" VARCHAR(160),
    "color" VARCHAR(80),
    "color_key" VARCHAR(160),
    "price_rial" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_variants_sku_format_check" CHECK (
        "sku" ~ '^[A-Z0-9][A-Z0-9_-]{0,63}$'
    ),
    CONSTRAINT "product_variants_size_pair_check" CHECK (
        ("size" IS NULL AND "size_key" IS NULL)
        OR (
            "size" IS NOT NULL AND "size_key" IS NOT NULL
            AND "size" = btrim("size") AND char_length("size") BETWEEN 1 AND 80
            AND "size_key" = btrim("size_key") AND char_length("size_key") BETWEEN 1 AND 160
        )
    ),
    CONSTRAINT "product_variants_color_pair_check" CHECK (
        ("color" IS NULL AND "color_key" IS NULL)
        OR (
            "color" IS NOT NULL AND "color_key" IS NOT NULL
            AND "color" = btrim("color") AND char_length("color") BETWEEN 1 AND 80
            AND "color_key" = btrim("color_key") AND char_length("color_key") BETWEEN 1 AND 160
        )
    ),
    CONSTRAINT "product_variants_price_rial_check" CHECK (
        "price_rial" > 0
        AND "price_rial" % 10 = 0
        AND "price_rial" <= 9007199254740991
    ),
    CONSTRAINT "product_variants_timestamps_check" CHECK ("updated_at" >= "created_at")
);

CREATE TABLE "inventories" (
    "variant_id" UUID NOT NULL,
    "on_hand_quantity" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("variant_id"),
    CONSTRAINT "inventories_quantity_check" CHECK ("on_hand_quantity" >= 0),
    CONSTRAINT "inventories_version_check" CHECK ("version" BETWEEN 1 AND 2147483647),
    CONSTRAINT "inventories_timestamps_check" CHECK ("updated_at" >= "created_at")
);

CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "media_type" "product_image_media_type" NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_images_storage_key_check" CHECK (
        "storage_key" = btrim("storage_key")
        AND char_length("storage_key") BETWEEN 1 AND 512
    ),
    CONSTRAINT "product_images_byte_size_check" CHECK ("byte_size" BETWEEN 1 AND 409599),
    CONSTRAINT "product_images_dimensions_check" CHECK (
        "width" BETWEEN 1 AND 8192
        AND "height" BETWEEN 1 AND 8192
        AND "width"::BIGINT * "height"::BIGINT <= 25000000
    ),
    CONSTRAINT "product_images_position_check" CHECK ("position" BETWEEN 0 AND 8),
    CONSTRAINT "product_images_timestamps_check" CHECK ("updated_at" >= "created_at"),
    CONSTRAINT "product_images_product_id_position_key"
        UNIQUE ("product_id", "position") DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE "product_image_cleanups" (
    "id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ(3),
    "last_failure_code" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_image_cleanups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_image_cleanups_storage_key_check" CHECK (
        "storage_key" = btrim("storage_key")
        AND char_length("storage_key") BETWEEN 1 AND 512
    ),
    CONSTRAINT "product_image_cleanups_attempt_check" CHECK (
        "attempt_count" >= 0
        AND (("attempt_count" = 0 AND "last_attempt_at" IS NULL)
             OR ("attempt_count" > 0 AND "last_attempt_at" IS NOT NULL))
        AND (
            "last_failure_code" IS NULL OR (
                "attempt_count" > 0
                AND "last_failure_code" = btrim("last_failure_code")
                AND char_length("last_failure_code") BETWEEN 1 AND 64
            )
        )
    ),
    CONSTRAINT "product_image_cleanups_timestamps_check" CHECK (
        "updated_at" >= "created_at"
        AND ("last_attempt_at" IS NULL OR "last_attempt_at" >= "created_at")
    )
);

CREATE TABLE "price_display_settings" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "unit" "price_display_unit" NOT NULL DEFAULT 'TOMAN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "price_display_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "price_display_settings_singleton_check" CHECK ("id" = 1),
    CONSTRAINT "price_display_settings_timestamps_check" CHECK ("updated_at" >= "created_at")
);

CREATE UNIQUE INDEX "categories_parent_id_name_key_key"
    ON "categories" ("parent_id", "name_key") NULLS NOT DISTINCT;
CREATE INDEX "products_updated_id_idx"
    ON "products" ("updated_at" DESC, "id" DESC);
CREATE INDEX "products_category_updated_id_idx"
    ON "products" ("category_id", "updated_at" DESC, "id" DESC);
CREATE INDEX "products_status_updated_id_idx"
    ON "products" ("status", "updated_at" DESC, "id" DESC);
CREATE INDEX "products_category_status_updated_id_idx"
    ON "products" ("category_id", "status", "updated_at" DESC, "id" DESC);
CREATE INDEX "products_status_created_id_idx"
    ON "products" ("status", "created_at" DESC, "id" DESC);
CREATE INDEX "products_category_status_created_id_idx"
    ON "products" ("category_id", "status", "created_at" DESC, "id" DESC);
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants" ("sku");
CREATE INDEX "product_variants_product_active_id_idx"
    ON "product_variants" ("product_id", "is_active", "id");
CREATE UNIQUE INDEX "product_variants_product_size_color_key"
    ON "product_variants" ("product_id", "size_key", "color_key") NULLS NOT DISTINCT;
CREATE UNIQUE INDEX "product_images_storage_key_key" ON "product_images" ("storage_key");
CREATE UNIQUE INDEX "product_image_cleanups_storage_key_key"
    ON "product_image_cleanups" ("storage_key");
CREATE INDEX "product_image_cleanups_created_id_idx"
    ON "product_image_cleanups" ("created_at", "id");

ALTER TABLE "categories"
    ADD CONSTRAINT "categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "categories" ("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "products"
    ADD CONSTRAINT "products_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories" ("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products" ("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "inventories"
    ADD CONSTRAINT "inventories_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "product_images"
    ADD CONSTRAINT "product_images_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products" ("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE FUNCTION catalog_assert_category_tree()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    proposed_level INTEGER := 1;
    subtree_height INTEGER := 1;
    ancestor_cycle BOOLEAN := FALSE;
    contains_self BOOLEAN := FALSE;
BEGIN
    PERFORM pg_advisory_xact_lock(1120002, 1);

    IF TG_OP = 'INSERT' AND (SELECT count(*) FROM categories) >= 1000 THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            CONSTRAINT = 'categories_limit_check',
            MESSAGE = 'catalog category limit reached';
    END IF;

    IF TG_OP <> 'DELETE'
       AND (TG_OP = 'INSERT' OR NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        IF NEW.parent_id = NEW.id THEN
            RAISE EXCEPTION USING
                ERRCODE = '23514',
                CONSTRAINT = 'categories_tree_check',
                MESSAGE = 'catalog category tree is invalid';
        END IF;

        WITH RECURSIVE ancestors AS (
            SELECT c.id, c.parent_id, ARRAY[c.id] AS visited, FALSE AS cycle, 1 AS depth
            FROM categories c
            WHERE c.id = NEW.parent_id
            UNION ALL
            SELECT c.id, c.parent_id, a.visited || c.id, c.id = ANY(a.visited), a.depth + 1
            FROM categories c
            JOIN ancestors a ON c.id = a.parent_id
            WHERE NOT a.cycle
        )
        SELECT
            COALESCE(max(depth), 0) + 1,
            COALESCE(bool_or(cycle), FALSE),
            COALESCE(bool_or(id = NEW.id), FALSE)
        INTO proposed_level, ancestor_cycle, contains_self
        FROM ancestors;

        IF ancestor_cycle OR contains_self THEN
            RAISE EXCEPTION USING
                ERRCODE = '23514',
                CONSTRAINT = 'categories_tree_check',
                MESSAGE = 'catalog category tree is invalid';
        END IF;

        IF TG_OP = 'UPDATE' THEN
            WITH RECURSIVE descendants AS (
                SELECT c.id, ARRAY[c.id] AS visited, FALSE AS cycle, 1 AS depth
                FROM categories c
                WHERE c.id = NEW.id
                UNION ALL
                SELECT c.id, d.visited || c.id, c.id = ANY(d.visited), d.depth + 1
                FROM categories c
                JOIN descendants d ON c.parent_id = d.id
                WHERE NOT d.cycle
            )
            SELECT COALESCE(max(depth), 1)
            INTO subtree_height
            FROM descendants;
        END IF;

        IF proposed_level + subtree_height - 1 > 6 THEN
            RAISE EXCEPTION USING
                ERRCODE = '23514',
                CONSTRAINT = 'categories_tree_check',
                MESSAGE = 'catalog category depth exceeds six levels';
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER "categories_tree_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "categories"
FOR EACH ROW EXECUTE FUNCTION catalog_assert_category_tree();

CREATE FUNCTION catalog_guard_inventory_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.version <> 1 THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'inventories_initial_version_check',
            MESSAGE = 'inventory initial version must be one';
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.variant_id <> OLD.variant_id THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'inventories_variant_immutable_check',
                MESSAGE = 'inventory variant identity is immutable';
        END IF;
        IF NEW.version <> OLD.version + 1 THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'inventories_version_step_check',
                MESSAGE = 'inventory version must increment exactly once';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "inventories_version_guard"
BEFORE INSERT OR UPDATE ON "inventories"
FOR EACH ROW EXECUTE FUNCTION catalog_guard_inventory_version();

CREATE FUNCTION catalog_guard_product_image_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.image_version <> 1 THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'products_initial_image_version_check',
            MESSAGE = 'product initial image version must be one';
    ELSIF TG_OP = 'UPDATE'
          AND NEW.image_version NOT IN (OLD.image_version, OLD.image_version + 1) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'products_image_version_step_check',
            MESSAGE = 'product image version may increment exactly once';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "products_image_version_guard"
BEFORE INSERT OR UPDATE ON "products"
FOR EACH ROW EXECUTE FUNCTION catalog_guard_product_image_version();

CREATE FUNCTION catalog_guard_product_variant_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.product_id <> OLD.product_id THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'product_variants_product_immutable_check',
            MESSAGE = 'product variant ownership is immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "product_variants_ownership_guard"
BEFORE UPDATE ON "product_variants"
FOR EACH ROW EXECUTE FUNCTION catalog_guard_product_variant_ownership();

CREATE FUNCTION catalog_guard_product_image_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF ROW(NEW.product_id, NEW.storage_key, NEW.media_type, NEW.byte_size, NEW.width, NEW.height, NEW.created_at)
       IS DISTINCT FROM
       ROW(OLD.product_id, OLD.storage_key, OLD.media_type, OLD.byte_size, OLD.width, OLD.height, OLD.created_at) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'product_images_identity_immutable_check',
            MESSAGE = 'product image identity and content metadata are immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "product_images_identity_guard"
BEFORE UPDATE ON "product_images"
FOR EACH ROW EXECUTE FUNCTION catalog_guard_product_image_identity();

CREATE FUNCTION catalog_guard_price_display_singleton()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' OR NEW.id <> OLD.id THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'price_display_settings_singleton_guard',
            MESSAGE = 'price display singleton identity is immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "price_display_settings_singleton_guard"
BEFORE UPDATE OR DELETE ON "price_display_settings"
FOR EACH ROW EXECUTE FUNCTION catalog_guard_price_display_singleton();

CREATE FUNCTION catalog_assert_product_integrity(product_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    product_status_value product_status;
    product_description TEXT;
    variant_count INTEGER;
    missing_inventory_count INTEGER;
    active_variant_count INTEGER;
    active_default_count INTEGER;
    active_named_count INTEGER;
    main_image_count INTEGER;
BEGIN
    SELECT p.status, p.description
    INTO product_status_value, product_description
    FROM products p
    WHERE p.id = product_uuid
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT
        count(*)::INTEGER,
        count(*) FILTER (WHERE i.variant_id IS NULL)::INTEGER,
        count(*) FILTER (WHERE v.is_active)::INTEGER,
        count(*) FILTER (WHERE v.is_active AND v.size_key IS NULL AND v.color_key IS NULL)::INTEGER,
        count(*) FILTER (WHERE v.is_active AND (v.size_key IS NOT NULL OR v.color_key IS NOT NULL))::INTEGER
    INTO variant_count, missing_inventory_count, active_variant_count,
         active_default_count, active_named_count
    FROM product_variants v
    LEFT JOIN inventories i ON i.variant_id = v.id
    WHERE v.product_id = product_uuid;

    IF variant_count = 0 OR missing_inventory_count > 0 THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'products_variant_inventory_check',
            MESSAGE = 'product requires variants and inventory';
    END IF;

    IF active_default_count > 1 OR (active_default_count > 0 AND active_named_count > 0) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'product_variants_active_mode_check',
            MESSAGE = 'active variant modes may not be mixed';
    END IF;

    IF product_status_value = 'ACTIVE' THEN
        SELECT count(*)::INTEGER INTO main_image_count
        FROM product_images
        WHERE product_id = product_uuid AND position = 0;

        IF product_description IS NULL OR active_variant_count = 0 OR main_image_count <> 1 THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'products_active_completeness_check',
                MESSAGE = 'active product is incomplete';
        END IF;
    END IF;
END;
$$;

CREATE FUNCTION catalog_check_product_from_product()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM catalog_assert_product_integrity(COALESCE(NEW.id, OLD.id));
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE FUNCTION catalog_check_product_from_variant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM catalog_assert_product_integrity(COALESCE(NEW.product_id, OLD.product_id));
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE FUNCTION catalog_check_product_from_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    owner_product_id UUID;
BEGIN
    SELECT product_id INTO owner_product_id
    FROM product_variants
    WHERE id = COALESCE(NEW.variant_id, OLD.variant_id);
    IF owner_product_id IS NOT NULL THEN
        PERFORM catalog_assert_product_integrity(owner_product_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE FUNCTION catalog_check_product_from_image()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM catalog_assert_product_integrity(COALESCE(NEW.product_id, OLD.product_id));
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE CONSTRAINT TRIGGER "products_integrity_check"
AFTER INSERT OR UPDATE ON "products"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION catalog_check_product_from_product();
CREATE CONSTRAINT TRIGGER "product_variants_integrity_check"
AFTER INSERT OR UPDATE OR DELETE ON "product_variants"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION catalog_check_product_from_variant();
CREATE CONSTRAINT TRIGGER "inventories_integrity_check"
AFTER INSERT OR UPDATE OR DELETE ON "inventories"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION catalog_check_product_from_inventory();
CREATE CONSTRAINT TRIGGER "product_images_product_integrity_check"
AFTER INSERT OR UPDATE OR DELETE ON "product_images"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION catalog_check_product_from_image();

CREATE FUNCTION catalog_assert_product_image_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    owner_product_id UUID := COALESCE(NEW.product_id, OLD.product_id);
    image_count INTEGER;
    minimum_position INTEGER;
    maximum_position INTEGER;
BEGIN
    PERFORM 1 FROM products WHERE id = owner_product_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT count(*)::INTEGER, min(position), max(position)
    INTO image_count, minimum_position, maximum_position
    FROM product_images
    WHERE product_id = owner_product_id;

    IF image_count > 9
       OR (image_count > 0 AND (minimum_position <> 0 OR maximum_position <> image_count - 1)) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'product_images_order_check',
            MESSAGE = 'product image order must be contiguous and bounded';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE CONSTRAINT TRIGGER "product_images_order_check"
AFTER INSERT OR UPDATE OR DELETE ON "product_images"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION catalog_assert_product_image_order();

INSERT INTO "price_display_settings" ("id", "unit", "created_at", "updated_at")
VALUES (1, 'TOMAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "code", "created_at", "updated_at") VALUES
    ('00000000-0000-4000-8000-000000000003', 'catalog.read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000004', 'catalog.manage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000005', 'inventory.update', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000006', 'product.media.manage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000007', 'settings.price.display.unit.update', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

DO $$
BEGIN
    IF (SELECT count(*) FROM price_display_settings WHERE id = 1 AND unit = 'TOMAN') <> 1
       OR (SELECT count(*) FROM price_display_settings) <> 1 THEN
        RAISE EXCEPTION 'catalog price display singleton reference conflict';
    END IF;

    IF (SELECT count(*) FROM roles WHERE code = 'SUPER_ADMIN') <> 1 THEN
        RAISE EXCEPTION 'catalog SUPER_ADMIN reference is missing or duplicated';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('00000000-0000-4000-8000-000000000003'::UUID, 'catalog.read'),
            ('00000000-0000-4000-8000-000000000004'::UUID, 'catalog.manage'),
            ('00000000-0000-4000-8000-000000000005'::UUID, 'inventory.update'),
            ('00000000-0000-4000-8000-000000000006'::UUID, 'product.media.manage'),
            ('00000000-0000-4000-8000-000000000007'::UUID, 'settings.price.display.unit.update')
        ) AS expected(id, code)
        LEFT JOIN permissions p ON p.id = expected.id AND p.code = expected.code
        WHERE p.id IS NULL
    ) THEN
        RAISE EXCEPTION 'catalog permission reference conflict';
    END IF;
END;
$$;

INSERT INTO "role_permissions" ("role_id", "permission_id", "granted_at")
SELECT r.id, p.id, CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.code = 'SUPER_ADMIN'
  AND p.code IN (
      'catalog.read',
      'catalog.manage',
      'inventory.update',
      'product.media.manage',
      'settings.price.display.unit.update'
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

DO $$
BEGIN
    IF (
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
        RAISE EXCEPTION 'catalog SUPER_ADMIN grants are missing or duplicated';
    END IF;
END;
$$;

COMMIT;
