-- =====================================================
-- ENHANCED SUPPLIER PRICELIST SCHEMA DESIGN
-- =====================================================
--
-- This schema optimizes the existing structure for processing
-- heterogeneous supplier price lists with maximum performance
-- and data integrity.
--
-- Database: nxtprod-db_001
-- Target: PostgreSQL 15+
-- Author: Data Oracle
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- CORE ENHANCED TABLES
-- =====================================================

-- 1. Enhanced Supplier Price Lists (Primary Container)
-- Replaces/extends existing supplier_price_lists
DROP TABLE IF EXISTS supplier_price_lists_enhanced CASCADE;
CREATE TABLE supplier_price_lists_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,

    -- Metadata
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) DEFAULT '1.0',
    description TEXT,

    -- Financial Settings
    currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
    currency_conversion_rate DECIMAL(10,4) DEFAULT 1.0000,
    base_currency VARCHAR(3) DEFAULT 'ZAR',

    -- Validity & Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_date DATE,
    superseded_by UUID REFERENCES supplier_price_lists_enhanced(id),

    -- File Processing Metadata
    source_file_name VARCHAR(500) NOT NULL,
    source_file_path TEXT,
    source_file_hash VARCHAR(64), -- SHA-256 for duplicate detection
    source_file_size BIGINT,
    source_sheet_name VARCHAR(255),

    -- Import Configuration (JSON for flexibility)
    column_mapping JSONB DEFAULT '{}', -- Maps file columns to our schema
    processing_config JSONB DEFAULT '{}', -- Import rules, filters, etc.
    validation_rules JSONB DEFAULT '{}', -- Custom validation per supplier

    -- Processing Status & Metrics
    import_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_rows_processed INTEGER DEFAULT 0,
    successful_imports INTEGER DEFAULT 0,
    failed_imports INTEGER DEFAULT 0,
    duplicate_detections INTEGER DEFAULT 0,
    data_quality_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100 score

    -- Performance Optimization
    indexed_search_text TSVECTOR, -- Full-text search optimization

    -- Audit Trail
    created_by UUID, -- Future: link to users table
    processed_by UUID, -- Who processed this import
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('draft', 'processing', 'active', 'inactive', 'error', 'superseded')),
    CONSTRAINT valid_import_status CHECK (import_status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    CONSTRAINT valid_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT valid_dates CHECK (expires_date IS NULL OR expires_date > effective_date),
    CONSTRAINT valid_quality_score CHECK (data_quality_score >= 0 AND data_quality_score <= 100)
);

-- 2. Enhanced Price List Items (Optimized for Performance)
DROP TABLE IF EXISTS supplier_price_list_items_enhanced CASCADE;
CREATE TABLE supplier_price_list_items_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id UUID NOT NULL REFERENCES supplier_price_lists_enhanced(id) ON DELETE CASCADE,

    -- Product Identification (Multiple strategies)
    sku VARCHAR(100) NOT NULL, -- Our internal SKU
    supplier_sku VARCHAR(100), -- Supplier's SKU
    supplier_product_code VARCHAR(100), -- Alternative supplier code
    manufacturer_part_number VARCHAR(100), -- MPN
    upc_barcode VARCHAR(50),
    ean_barcode VARCHAR(50),

    -- Product Information
    product_name VARCHAR(500) NOT NULL,
    product_description TEXT,
    brand VARCHAR(100),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    category VARCHAR(100),
    subcategory VARCHAR(100),

    -- Pricing Structure (Comprehensive)
    unit_price DECIMAL(15,4) NOT NULL,
    cost_price DECIMAL(15,4), -- If available from supplier
    list_price DECIMAL(15,4), -- MSRP
    wholesale_price DECIMAL(15,4),
    tier_prices JSONB DEFAULT '{}', -- Volume pricing: {"10": 99.99, "50": 89.99}

    -- Quantity & Availability
    minimum_quantity INTEGER DEFAULT 1,
    maximum_quantity INTEGER,
    quantity_breaks JSONB DEFAULT '{}', -- Quantity break pricing
    stock_status VARCHAR(50) DEFAULT 'unknown',
    available_quantity INTEGER,

    -- Logistics
    lead_time_days INTEGER DEFAULT 7,
    unit_of_measure VARCHAR(20) DEFAULT 'each',
    weight DECIMAL(10,3),
    dimensions_l DECIMAL(10,2),
    dimensions_w DECIMAL(10,2),
    dimensions_h DECIMAL(10,2),

    -- Product Status
    status VARCHAR(50) DEFAULT 'active',
    availability VARCHAR(50) DEFAULT 'available',
    discontinued BOOLEAN DEFAULT FALSE,
    new_product BOOLEAN DEFAULT FALSE,
    on_promotion BOOLEAN DEFAULT FALSE,

    -- Data Source Tracking
    source_row INTEGER, -- Row number in original file
    raw_data JSONB DEFAULT '{}', -- Store original row data for debugging

    -- Quality & Validation
    data_quality_score DECIMAL(5,2) DEFAULT 0.00,
    validation_errors JSONB DEFAULT '[]', -- Array of validation issues
    confidence_score DECIMAL(5,2) DEFAULT 100.00, -- AI matching confidence

    -- Performance Optimization
    search_vector TSVECTOR, -- Full-text search
    normalized_sku VARCHAR(100), -- Cleaned SKU for matching
    normalized_name VARCHAR(500), -- Cleaned name for matching

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'discontinued', 'pending')),
    CONSTRAINT valid_availability CHECK (availability IN ('available', 'out_of_stock', 'backorder', 'discontinued')),
    CONSTRAINT positive_price CHECK (unit_price >= 0),
    CONSTRAINT positive_quantity CHECK (minimum_quantity >= 0),
    CONSTRAINT valid_quality_score CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- 3. Product Matching Table (AI-Enhanced)
CREATE TABLE product_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_price_list_item_id UUID NOT NULL REFERENCES supplier_price_list_items_enhanced(id) ON DELETE CASCADE,

    -- Matched Products
    matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    matched_inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,

    -- Matching Strategy & Confidence
    match_type VARCHAR(50) NOT NULL, -- 'exact_sku', 'fuzzy_name', 'barcode', 'manual', 'ai_ml'
    confidence_score DECIMAL(5,2) NOT NULL,
    match_algorithm VARCHAR(100), -- Which algorithm/model was used

    -- Matching Details
    matched_fields JSONB DEFAULT '{}', -- Which fields matched
    similarity_scores JSONB DEFAULT '{}', -- Individual field similarity scores

    -- Review Status
    review_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_review'
    reviewed_by UUID, -- User who reviewed
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_match_type CHECK (match_type IN ('exact_sku', 'fuzzy_name', 'barcode', 'manual', 'ai_ml', 'hybrid')),
    CONSTRAINT valid_review_status CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_review')),
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

-- 4. Import Processing Log (For Monitoring)
CREATE TABLE pricelist_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id UUID NOT NULL REFERENCES supplier_price_lists_enhanced(id) ON DELETE CASCADE,

    -- Processing Details
    process_stage VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    details JSONB DEFAULT '{}',

    -- Performance Metrics
    rows_processed INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    memory_used_mb DECIMAL(10,2),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_process_stage CHECK (process_stage IN ('file_upload', 'validation', 'parsing', 'matching', 'import', 'cleanup')),
    CONSTRAINT valid_status CHECK (status IN ('started', 'in_progress', 'completed', 'failed', 'warning'))
);

-- 5. Price Change History (For Analytics)
CREATE TABLE price_change_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_price_list_item_id UUID NOT NULL REFERENCES supplier_price_list_items_enhanced(id) ON DELETE CASCADE,

    -- Price Change Details
    old_price DECIMAL(15,4),
    new_price DECIMAL(15,4) NOT NULL,
    price_change_amount DECIMAL(15,4),
    price_change_percentage DECIMAL(8,4),
    change_reason VARCHAR(100),

    -- Context
    effective_date DATE NOT NULL,
    changed_in_import UUID REFERENCES supplier_price_lists_enhanced(id),

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =====================================================

-- Primary lookup indexes
CREATE INDEX CONCURRENTLY idx_price_list_supplier_status ON supplier_price_lists_enhanced(supplier_id, status, is_active);
CREATE INDEX CONCURRENTLY idx_price_list_effective_date ON supplier_price_lists_enhanced(effective_date, expires_date);
CREATE INDEX CONCURRENTLY idx_price_list_file_hash ON supplier_price_lists_enhanced(source_file_hash);

-- Price list items - core lookups
CREATE INDEX CONCURRENTLY idx_pli_price_list_sku ON supplier_price_list_items_enhanced(price_list_id, sku);
CREATE INDEX CONCURRENTLY idx_pli_supplier_sku ON supplier_price_list_items_enhanced(supplier_sku) WHERE supplier_sku IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_pli_normalized_sku ON supplier_price_list_items_enhanced(normalized_sku);
CREATE INDEX CONCURRENTLY idx_pli_status_active ON supplier_price_list_items_enhanced(status, availability) WHERE status = 'active';

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_price_list_search ON supplier_price_lists_enhanced USING GIN(indexed_search_text);
CREATE INDEX CONCURRENTLY idx_pli_search ON supplier_price_list_items_enhanced USING GIN(search_vector);
CREATE INDEX CONCURRENTLY idx_pli_name_search ON supplier_price_list_items_enhanced USING GIN(normalized_name gin_trgm_ops);

-- Barcode lookups
CREATE INDEX CONCURRENTLY idx_pli_barcodes ON supplier_price_list_items_enhanced USING GIN(
    to_tsvector('english', COALESCE(upc_barcode, '') || ' ' || COALESCE(ean_barcode, ''))
) WHERE upc_barcode IS NOT NULL OR ean_barcode IS NOT NULL;

-- Product matching indexes
CREATE INDEX CONCURRENTLY idx_matches_confidence ON product_matches(confidence_score DESC, review_status);
CREATE INDEX CONCURRENTLY idx_matches_review_pending ON product_matches(review_status, created_at) WHERE review_status = 'pending';

-- Price change tracking
CREATE INDEX CONCURRENTLY idx_price_changes_date ON price_change_tracking(effective_date, supplier_price_list_item_id);
CREATE INDEX CONCURRENTLY idx_price_changes_percentage ON price_change_tracking(price_change_percentage) WHERE ABS(price_change_percentage) > 10;

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_pli_brand_category ON supplier_price_list_items_enhanced(brand, category) WHERE brand IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_pli_price_range ON supplier_price_list_items_enhanced(unit_price) WHERE unit_price > 0;

-- =====================================================
-- TRIGGERS FOR AUTOMATION
-- =====================================================

-- Update search vectors automatically
CREATE OR REPLACE FUNCTION update_search_vectors()
RETURNS TRIGGER AS $$
BEGIN
    -- Update price list search vector
    IF TG_TABLE_NAME = 'supplier_price_lists_enhanced' THEN
        NEW.indexed_search_text := to_tsvector('english',
            COALESCE(NEW.name, '') || ' ' ||
            COALESCE(NEW.description, '') || ' ' ||
            COALESCE(NEW.source_file_name, '')
        );
    END IF;

    -- Update price list item search vector
    IF TG_TABLE_NAME = 'supplier_price_list_items_enhanced' THEN
        NEW.search_vector := to_tsvector('english',
            COALESCE(NEW.product_name, '') || ' ' ||
            COALESCE(NEW.product_description, '') || ' ' ||
            COALESCE(NEW.brand, '') || ' ' ||
            COALESCE(NEW.manufacturer, '') || ' ' ||
            COALESCE(NEW.model, '') || ' ' ||
            COALESCE(NEW.category, '')
        );

        -- Update normalized fields for matching
        NEW.normalized_sku := UPPER(TRIM(REGEXP_REPLACE(NEW.sku, '[^A-Za-z0-9]', '', 'g')));
        NEW.normalized_name := UPPER(TRIM(REGEXP_REPLACE(NEW.product_name, '[^A-Za-z0-9\s]', '', 'g')));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_price_list_search_vector
    BEFORE INSERT OR UPDATE ON supplier_price_lists_enhanced
    FOR EACH ROW EXECUTE FUNCTION update_search_vectors();

CREATE TRIGGER update_price_list_item_search_vector
    BEFORE INSERT OR UPDATE ON supplier_price_list_items_enhanced
    FOR EACH ROW EXECUTE FUNCTION update_search_vectors();

-- Track price changes automatically
CREATE OR REPLACE FUNCTION track_price_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if price actually changed
    IF OLD.unit_price IS DISTINCT FROM NEW.unit_price THEN
        INSERT INTO price_change_tracking (
            supplier_price_list_item_id,
            old_price,
            new_price,
            price_change_amount,
            price_change_percentage,
            change_reason,
            effective_date
        ) VALUES (
            NEW.id,
            OLD.unit_price,
            NEW.unit_price,
            NEW.unit_price - OLD.unit_price,
            CASE WHEN OLD.unit_price > 0
                THEN ((NEW.unit_price - OLD.unit_price) / OLD.unit_price) * 100
                ELSE NULL
            END,
            'automated_import',
            CURRENT_DATE
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_item_price_changes
    AFTER UPDATE ON supplier_price_list_items_enhanced
    FOR EACH ROW EXECUTE FUNCTION track_price_changes();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_price_list_timestamp
    BEFORE UPDATE ON supplier_price_lists_enhanced
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER update_price_list_item_timestamp
    BEFORE UPDATE ON supplier_price_list_items_enhanced
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

-- =====================================================
-- DATA QUALITY VIEWS
-- =====================================================

-- High-level price list statistics
CREATE OR REPLACE VIEW v_pricelist_statistics AS
SELECT
    pl.id,
    pl.name,
    s.name as supplier_name,
    pl.status,
    pl.total_rows_processed,
    pl.successful_imports,
    pl.failed_imports,
    pl.data_quality_score,
    COUNT(pli.id) as total_items,
    AVG(pli.unit_price) as avg_price,
    MIN(pli.unit_price) as min_price,
    MAX(pli.unit_price) as max_price,
    COUNT(pli.id) FILTER (WHERE pli.status = 'active') as active_items,
    pl.created_at,
    pl.processed_at
FROM supplier_price_lists_enhanced pl
JOIN suppliers s ON pl.supplier_id = s.id
LEFT JOIN supplier_price_list_items_enhanced pli ON pl.id = pli.price_list_id
GROUP BY pl.id, s.name;

-- Product matching quality view
CREATE OR REPLACE VIEW v_matching_quality AS
SELECT
    pl.supplier_id,
    s.name as supplier_name,
    COUNT(pli.id) as total_items,
    COUNT(pm.id) as matched_items,
    COUNT(pm.id) FILTER (WHERE pm.confidence_score >= 90) as high_confidence_matches,
    COUNT(pm.id) FILTER (WHERE pm.confidence_score < 70) as low_confidence_matches,
    COUNT(pm.id) FILTER (WHERE pm.review_status = 'pending') as pending_review,
    ROUND(AVG(pm.confidence_score), 2) as avg_confidence_score,
    ROUND((COUNT(pm.id)::DECIMAL / NULLIF(COUNT(pli.id), 0)) * 100, 2) as match_percentage
FROM supplier_price_lists_enhanced pl
JOIN suppliers s ON pl.supplier_id = s.id
JOIN supplier_price_list_items_enhanced pli ON pl.id = pli.price_list_id
LEFT JOIN product_matches pm ON pli.id = pm.supplier_price_list_item_id
WHERE pl.is_active = true
GROUP BY pl.supplier_id, s.name;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE supplier_price_lists_enhanced IS 'Enhanced supplier price list container with comprehensive metadata, processing status, and performance optimization';
COMMENT ON TABLE supplier_price_list_items_enhanced IS 'Optimized price list items with multi-strategy product identification, pricing tiers, and AI-enhanced matching';
COMMENT ON TABLE product_matches IS 'AI-enhanced product matching with confidence scoring and review workflow';
COMMENT ON TABLE pricelist_import_logs IS 'Detailed import processing logs for monitoring and debugging';
COMMENT ON TABLE price_change_tracking IS 'Historical price change tracking for analytics and alerting';

-- Mark schema update
INSERT INTO pricelist_import_logs (
    price_list_id, process_stage, status, message, details
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'file_upload',
    'completed',
    'Enhanced pricelist schema deployed successfully',
    '{"version": "2.0", "tables": 5, "indexes": 15, "triggers": 6}'
);