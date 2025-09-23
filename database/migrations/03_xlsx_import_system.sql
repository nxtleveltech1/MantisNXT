-- ===============================================
-- XLSX IMPORT SYSTEM FOR INVENTORY DATA
-- Staged import with validation and rollback
-- ===============================================

-- =================
-- STAGING TABLES
-- =================

-- Staging table for product imports
CREATE TABLE import_products_staging (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_batch_id UUID NOT NULL,
    row_number INTEGER NOT NULL,

    -- Source data (as text for validation)
    source_sku TEXT,
    source_name TEXT,
    source_description TEXT,
    source_category TEXT,
    source_brand TEXT,
    source_unit_of_measure TEXT,
    source_base_cost TEXT,
    source_sale_price TEXT,
    source_weight_kg TEXT,
    source_dimensions TEXT,
    source_barcode TEXT,
    source_reorder_level TEXT,
    source_max_stock_level TEXT,

    -- Validation results
    validation_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, VALID, INVALID
    validation_errors TEXT[],
    validation_warnings TEXT[],

    -- Processed data
    processed_sku VARCHAR(100),
    processed_category_id UUID,
    processed_brand_id UUID,
    processed_base_cost DECIMAL(15,4),
    processed_sale_price DECIMAL(15,4),
    processed_weight_kg DECIMAL(10,3),
    processed_reorder_level INTEGER,
    processed_max_stock_level INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staging table for inventory imports
CREATE TABLE import_inventory_staging (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_batch_id UUID NOT NULL,
    row_number INTEGER NOT NULL,

    -- Source data
    source_sku TEXT,
    source_location_code TEXT,
    source_quantity TEXT,
    source_batch_number TEXT,
    source_expiry_date TEXT,
    source_unit_cost TEXT,

    -- Validation results
    validation_status VARCHAR(20) DEFAULT 'PENDING',
    validation_errors TEXT[],
    validation_warnings TEXT[],

    -- Processed data
    processed_product_id UUID,
    processed_location_id UUID,
    processed_quantity INTEGER,
    processed_unit_cost DECIMAL(15,4),
    processed_expiry_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Import batch tracking
CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_type VARCHAR(50) NOT NULL, -- PRODUCTS, INVENTORY, PRICE_UPDATE
    filename VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    total_rows INTEGER,
    processed_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, ROLLED_BACK
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    import_settings JSONB, -- Store import configuration
    summary_stats JSONB,   -- Store processing statistics

    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================
-- VALIDATION FUNCTIONS
-- =================

-- Validate product staging data
CREATE OR REPLACE FUNCTION validate_product_staging_row(staging_id UUID)
RETURNS VOID AS $$
DECLARE
    staging_row import_products_staging%ROWTYPE;
    errors TEXT[] := '{}';
    warnings TEXT[] := '{}';
    category_id UUID;
    brand_id UUID;
BEGIN
    SELECT * INTO staging_row FROM import_products_staging WHERE id = staging_id;

    -- Required field validations
    IF staging_row.source_sku IS NULL OR TRIM(staging_row.source_sku) = '' THEN
        errors := array_append(errors, 'SKU is required');
    END IF;

    IF staging_row.source_name IS NULL OR TRIM(staging_row.source_name) = '' THEN
        errors := array_append(errors, 'Product name is required');
    END IF;

    IF staging_row.source_category IS NULL OR TRIM(staging_row.source_category) = '' THEN
        errors := array_append(errors, 'Category is required');
    END IF;

    -- SKU uniqueness check
    IF staging_row.source_sku IS NOT NULL AND EXISTS (
        SELECT 1 FROM products WHERE sku = TRIM(staging_row.source_sku)
    ) THEN
        warnings := array_append(warnings, 'SKU already exists - will update existing product');
    END IF;

    -- Category lookup/creation
    IF staging_row.source_category IS NOT NULL THEN
        SELECT id INTO category_id
        FROM categories
        WHERE LOWER(name) = LOWER(TRIM(staging_row.source_category));

        IF category_id IS NULL THEN
            warnings := array_append(warnings, 'Category will be created: ' || staging_row.source_category);
        END IF;
    END IF;

    -- Brand lookup/creation
    IF staging_row.source_brand IS NOT NULL AND TRIM(staging_row.source_brand) != '' THEN
        SELECT id INTO brand_id
        FROM brands
        WHERE LOWER(name) = LOWER(TRIM(staging_row.source_brand));

        IF brand_id IS NULL THEN
            warnings := array_append(warnings, 'Brand will be created: ' || staging_row.source_brand);
        END IF;
    END IF;

    -- Numeric validations
    IF staging_row.source_base_cost IS NOT NULL AND staging_row.source_base_cost !~ '^[0-9]+\.?[0-9]*$' THEN
        errors := array_append(errors, 'Invalid base cost format');
    END IF;

    IF staging_row.source_sale_price IS NOT NULL AND staging_row.source_sale_price !~ '^[0-9]+\.?[0-9]*$' THEN
        errors := array_append(errors, 'Invalid sale price format');
    END IF;

    -- Update staging row with validation results
    UPDATE import_products_staging SET
        validation_status = CASE WHEN array_length(errors, 1) > 0 THEN 'INVALID' ELSE 'VALID' END,
        validation_errors = errors,
        validation_warnings = warnings,
        processed_sku = TRIM(staging_row.source_sku),
        processed_category_id = category_id,
        processed_brand_id = brand_id,
        processed_base_cost = CASE
            WHEN staging_row.source_base_cost ~ '^[0-9]+\.?[0-9]*$'
            THEN staging_row.source_base_cost::DECIMAL(15,4)
            ELSE NULL
        END,
        processed_sale_price = CASE
            WHEN staging_row.source_sale_price ~ '^[0-9]+\.?[0-9]*$'
            THEN staging_row.source_sale_price::DECIMAL(15,4)
            ELSE NULL
        END
    WHERE id = staging_id;
END;
$$ LANGUAGE plpgsql;

-- =================
-- IMPORT PROCESSING FUNCTIONS
-- =================

-- Process valid product staging rows
CREATE OR REPLACE FUNCTION process_product_import(batch_id UUID)
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    staging_row import_products_staging%ROWTYPE;
    category_id UUID;
    brand_id UUID;
    product_id UUID;
BEGIN
    FOR staging_row IN
        SELECT * FROM import_products_staging
        WHERE import_batch_id = batch_id AND validation_status = 'VALID'
        ORDER BY row_number
    LOOP
        -- Get or create category
        IF staging_row.source_category IS NOT NULL THEN
            INSERT INTO categories (name, path, level)
            VALUES (TRIM(staging_row.source_category), TRIM(staging_row.source_category), 0)
            ON CONFLICT (name) DO NOTHING;

            SELECT id INTO category_id
            FROM categories
            WHERE LOWER(name) = LOWER(TRIM(staging_row.source_category));
        END IF;

        -- Get or create brand
        IF staging_row.source_brand IS NOT NULL AND TRIM(staging_row.source_brand) != '' THEN
            INSERT INTO brands (name)
            VALUES (TRIM(staging_row.source_brand))
            ON CONFLICT (name) DO NOTHING;

            SELECT id INTO brand_id
            FROM brands
            WHERE LOWER(name) = LOWER(TRIM(staging_row.source_brand));
        END IF;

        -- Insert or update product
        INSERT INTO products (
            sku, name, description, category_id, brand_id,
            unit_of_measure, base_cost, sale_price, weight_kg,
            barcode, reorder_level, max_stock_level,
            created_by, updated_by
        ) VALUES (
            staging_row.processed_sku,
            TRIM(staging_row.source_name),
            TRIM(staging_row.source_description),
            category_id,
            brand_id,
            COALESCE(TRIM(staging_row.source_unit_of_measure), 'EACH'),
            staging_row.processed_base_cost,
            staging_row.processed_sale_price,
            staging_row.processed_weight_kg,
            NULLIF(TRIM(staging_row.source_barcode), ''),
            staging_row.processed_reorder_level,
            staging_row.processed_max_stock_level,
            (SELECT created_by FROM import_batches WHERE id = batch_id),
            (SELECT created_by FROM import_batches WHERE id = batch_id)
        )
        ON CONFLICT (sku) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category_id = EXCLUDED.category_id,
            brand_id = EXCLUDED.brand_id,
            base_cost = EXCLUDED.base_cost,
            sale_price = EXCLUDED.sale_price,
            weight_kg = EXCLUDED.weight_kg,
            barcode = EXCLUDED.barcode,
            reorder_level = EXCLUDED.reorder_level,
            max_stock_level = EXCLUDED.max_stock_level,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW();

        processed_count := processed_count + 1;
    END LOOP;

    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- =================
-- BATCH MANAGEMENT
-- =================

-- Complete import batch
CREATE OR REPLACE FUNCTION complete_import_batch(batch_id UUID)
RETURNS VOID AS $$
DECLARE
    batch_record import_batches%ROWTYPE;
    stats JSONB;
BEGIN
    SELECT * INTO batch_record FROM import_batches WHERE id = batch_id;

    -- Calculate final statistics
    IF batch_record.import_type = 'PRODUCTS' THEN
        SELECT jsonb_build_object(
            'total_rows', COUNT(*),
            'valid_rows', COUNT(*) FILTER (WHERE validation_status = 'VALID'),
            'invalid_rows', COUNT(*) FILTER (WHERE validation_status = 'INVALID'),
            'categories_created', (
                SELECT COUNT(DISTINCT processed_category_id)
                FROM import_products_staging
                WHERE import_batch_id = batch_id
                AND validation_status = 'VALID'
                AND processed_category_id NOT IN (SELECT id FROM categories)
            ),
            'brands_created', (
                SELECT COUNT(DISTINCT processed_brand_id)
                FROM import_products_staging
                WHERE import_batch_id = batch_id
                AND validation_status = 'VALID'
                AND processed_brand_id NOT IN (SELECT id FROM brands)
            )
        ) INTO stats
        FROM import_products_staging
        WHERE import_batch_id = batch_id;
    END IF;

    -- Update batch status
    UPDATE import_batches SET
        status = 'COMPLETED',
        completed_at = NOW(),
        summary_stats = stats,
        processed_rows = (stats->>'total_rows')::INTEGER,
        valid_rows = (stats->>'valid_rows')::INTEGER,
        invalid_rows = (stats->>'invalid_rows')::INTEGER
    WHERE id = batch_id;
END;
$$ LANGUAGE plpgsql;

-- =================
-- CLEANUP PROCEDURES
-- =================

-- Clean up old staging data (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_import_staging()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete completed import batches older than 30 days
    DELETE FROM import_products_staging
    WHERE import_batch_id IN (
        SELECT id FROM import_batches
        WHERE status = 'COMPLETED'
        AND completed_at < NOW() - INTERVAL '30 days'
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    DELETE FROM import_inventory_staging
    WHERE import_batch_id IN (
        SELECT id FROM import_batches
        WHERE status = 'COMPLETED'
        AND completed_at < NOW() - INTERVAL '30 days'
    );

    DELETE FROM import_batches
    WHERE status = 'COMPLETED'
    AND completed_at < NOW() - INTERVAL '30 days';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =================
-- INDEXES FOR STAGING TABLES
-- =================

CREATE INDEX idx_import_products_staging_batch ON import_products_staging(import_batch_id);
CREATE INDEX idx_import_products_staging_status ON import_products_staging(validation_status);
CREATE INDEX idx_import_inventory_staging_batch ON import_inventory_staging(import_batch_id);
CREATE INDEX idx_import_batches_status ON import_batches(status, created_at);

-- Schedule cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-import-staging', '0 2 * * *', 'SELECT cleanup_import_staging();');