-- Price List Upload System Database Schema
-- Created for MantisNXT supplier price list processing

-- Price list uploads tracking table
CREATE TABLE IF NOT EXISTS pricelist_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,

    -- File information
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- Processing status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'validated', 'imported', 'failed', 'cancelled')),
    validation_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'passed', 'failed', 'warnings')),

    -- Processing results
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    invalid_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    skipped_rows INTEGER NOT NULL DEFAULT 0,

    -- Validation results (stored as JSONB for efficiency)
    validation_errors JSONB DEFAULT '[]',
    validation_warnings JSONB DEFAULT '[]',

    -- Processing timing
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_duration INTEGER, -- milliseconds

    -- Upload metadata
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Configuration and preview data
    preview_data JSONB DEFAULT '[]',
    import_config JSONB NOT NULL DEFAULT '{}',
    notes TEXT
);

-- Supplier products catalog (enhanced)
CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_part_number VARCHAR(100) NOT NULL,
    sku VARCHAR(100), -- Internal SKU (optional)

    -- Product details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),

    -- Pricing (all in supplier's currency)
    unit_price DECIMAL(15,4) NOT NULL,
    list_price DECIMAL(15,4),
    wholesale_price DECIMAL(15,4),
    retail_price DECIMAL(15,4),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    last_price_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Availability and ordering
    availability VARCHAR(20) DEFAULT 'available' CHECK (availability IN ('available', 'limited', 'discontinued', 'seasonal')),
    minimum_order_quantity INTEGER,
    lead_time INTEGER, -- days
    stock_level INTEGER,

    -- Physical properties
    unit VARCHAR(50) DEFAULT 'each',
    weight DECIMAL(10,3),
    dimensions_length DECIMAL(10,2),
    dimensions_width DECIMAL(10,2),
    dimensions_height DECIMAL(10,2),
    dimensions_unit VARCHAR(10) DEFAULT 'cm',

    -- Identifiers
    barcode VARCHAR(50),
    manufacturer_part_number VARCHAR(100),

    -- Status and tracking
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval')),

    -- Import tracking
    import_source UUID REFERENCES pricelist_uploads(id),
    last_imported_at TIMESTAMP WITH TIME ZONE,

    -- Quality flags
    has_image BOOLEAN DEFAULT FALSE,
    has_description BOOLEAN DEFAULT FALSE,
    has_specifications BOOLEAN DEFAULT FALSE,
    price_verified BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Unique constraint on supplier + part number
    UNIQUE(supplier_id, supplier_part_number)
);

-- Price history tracking
CREATE TABLE IF NOT EXISTS supplier_product_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,

    -- Price information
    price DECIMAL(15,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Change tracking
    source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'api')),
    change_reason TEXT,
    changed_by VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Bulk import jobs for processing multiple uploads
CREATE TABLE IF NOT EXISTS bulk_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Job configuration
    upload_ids UUID[] NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

    -- Configuration
    batch_size INTEGER NOT NULL DEFAULT 100,
    parallel_processing BOOLEAN DEFAULT TRUE,
    validate_before_import BOOLEAN DEFAULT TRUE,
    stop_on_error BOOLEAN DEFAULT FALSE,

    -- Progress tracking
    uploads_processed INTEGER DEFAULT 0,
    total_uploads INTEGER NOT NULL,
    current_upload_id UUID,
    current_phase VARCHAR(20),
    percentage INTEGER DEFAULT 0,

    -- Results
    successful_uploads UUID[] DEFAULT '{}',
    failed_uploads UUID[] DEFAULT '{}',
    total_rows_processed INTEGER DEFAULT 0,
    total_rows_imported INTEGER DEFAULT 0,

    -- Metadata
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER -- milliseconds
);

-- Categories table (if not exists)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance optimization

-- Price list uploads indexes
CREATE INDEX IF NOT EXISTS idx_pricelist_uploads_supplier_id ON pricelist_uploads(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pricelist_uploads_status ON pricelist_uploads(status);
CREATE INDEX IF NOT EXISTS idx_pricelist_uploads_uploaded_at ON pricelist_uploads(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricelist_uploads_processing_time ON pricelist_uploads(processing_started_at, processing_completed_at);

-- Supplier products indexes
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_sku ON supplier_products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_products_category ON supplier_products(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_products_status ON supplier_products(status);
CREATE INDEX IF NOT EXISTS idx_supplier_products_availability ON supplier_products(availability);
CREATE INDEX IF NOT EXISTS idx_supplier_products_price ON supplier_products(unit_price);
CREATE INDEX IF NOT EXISTS idx_supplier_products_updated ON supplier_products(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_products_import_source ON supplier_products(import_source) WHERE import_source IS NOT NULL;

-- Full-text search index for product names and descriptions
CREATE INDEX IF NOT EXISTS idx_supplier_products_search ON supplier_products
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Price history indexes
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON supplier_product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_effective_date ON supplier_product_price_history(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_source ON supplier_product_price_history(source);

-- Bulk import jobs indexes
CREATE INDEX IF NOT EXISTS idx_bulk_jobs_status ON bulk_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_jobs_created_at ON bulk_import_jobs(created_at DESC);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Triggers for automatic timestamp updates

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_pricelist_uploads_updated_at ON pricelist_uploads;
CREATE TRIGGER update_pricelist_uploads_updated_at
    BEFORE UPDATE ON pricelist_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_products_updated_at ON supplier_products;
CREATE TRIGGER update_supplier_products_updated_at
    BEFORE UPDATE ON supplier_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Upload summary view
CREATE OR REPLACE VIEW upload_summary_view AS
SELECT
    u.id,
    u.supplier_id,
    u.supplier_name,
    u.original_file_name,
    u.status,
    u.validation_status,
    u.total_rows,
    u.valid_rows,
    u.invalid_rows,
    u.imported_rows,
    u.uploaded_at,
    u.processing_completed_at,
    u.processing_duration,
    CASE
        WHEN u.processing_duration > 0 THEN ROUND(u.total_rows::numeric / (u.processing_duration / 1000.0), 2)
        ELSE NULL
    END as rows_per_second,
    CASE
        WHEN u.total_rows > 0 THEN ROUND((u.valid_rows::numeric / u.total_rows) * 100, 1)
        ELSE NULL
    END as success_rate_percent
FROM pricelist_uploads u;

-- Supplier product catalog view with latest prices
CREATE OR REPLACE VIEW supplier_catalog_view AS
SELECT
    sp.id,
    sp.supplier_id,
    s.name as supplier_name,
    sp.supplier_part_number,
    sp.sku,
    sp.name,
    sp.description,
    sp.category,
    sp.brand,
    sp.unit_price,
    sp.currency,
    sp.availability,
    sp.minimum_order_quantity,
    sp.lead_time,
    sp.unit,
    sp.status,
    sp.last_price_update,
    sp.created_at,
    sp.updated_at,
    -- Latest price history
    ph.price as latest_historical_price,
    ph.effective_date as latest_price_date,
    ph.source as latest_price_source
FROM supplier_products sp
JOIN suppliers s ON sp.supplier_id = s.id
LEFT JOIN LATERAL (
    SELECT price, effective_date, source
    FROM supplier_product_price_history
    WHERE product_id = sp.id
    ORDER BY effective_date DESC
    LIMIT 1
) ph ON TRUE;

-- Performance monitoring view
CREATE OR REPLACE VIEW upload_performance_stats AS
SELECT
    DATE_TRUNC('day', uploaded_at) as date,
    COUNT(*) as total_uploads,
    COUNT(*) FILTER (WHERE status = 'imported') as successful_imports,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_imports,
    AVG(total_rows) as avg_rows_per_upload,
    AVG(processing_duration) FILTER (WHERE processing_duration > 0) as avg_processing_time_ms,
    SUM(imported_rows) as total_rows_imported,
    AVG(CASE WHEN total_rows > 0 THEN (valid_rows::numeric / total_rows) * 100 ELSE NULL END) as avg_success_rate
FROM pricelist_uploads
WHERE uploaded_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', uploaded_at)
ORDER BY date DESC;

-- Data quality analysis view
CREATE OR REPLACE VIEW data_quality_analysis AS
SELECT
    supplier_id,
    supplier_name,
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE description IS NOT NULL AND description != '') as products_with_description,
    COUNT(*) FILTER (WHERE category IS NOT NULL AND category != '') as products_with_category,
    COUNT(*) FILTER (WHERE brand IS NOT NULL AND brand != '') as products_with_brand,
    COUNT(*) FILTER (WHERE barcode IS NOT NULL AND barcode != '') as products_with_barcode,
    COUNT(*) FILTER (WHERE has_image = TRUE) as products_with_image,
    COUNT(*) FILTER (WHERE weight IS NOT NULL) as products_with_weight,
    AVG(unit_price) as avg_price,
    MIN(unit_price) as min_price,
    MAX(unit_price) as max_price,
    COUNT(DISTINCT category) as unique_categories,
    COUNT(DISTINCT brand) as unique_brands
FROM supplier_products
GROUP BY supplier_id, supplier_name;

-- Grant permissions (adjust according to your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT SELECT ON upload_summary_view, supplier_catalog_view, upload_performance_stats, data_quality_analysis TO app_user;