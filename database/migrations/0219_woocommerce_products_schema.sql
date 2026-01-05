-- Migration: 0219_woocommerce_products_schema.sql
-- Description: Comprehensive WooCommerce product fields schema
-- Dependencies: 0206_ecommerce_integrations.sql
-- Created: 2025-01-XX
-- 
-- This migration creates a normalized table structure for WooCommerce products
-- with all available fields from the WooCommerce REST API v3.
-- The sync_data JSONB in woocommerce_sync is preserved for full raw data storage.

-- ============================================
-- WooCommerce Products Table
-- ============================================
-- Normalized table for WooCommerce product data
-- Links to woocommerce_sync for sync metadata
CREATE TABLE IF NOT EXISTS woocommerce_products (
    -- Primary key and references
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
    sync_id uuid REFERENCES woocommerce_sync(id) ON DELETE SET NULL,
    
    -- External ID (WooCommerce product ID)
    external_id text NOT NULL,
    
    -- ============================================
    -- 1. Basic Product Information
    -- ============================================
    name text NOT NULL,
    slug text,
    type text CHECK (type IN ('simple', 'grouped', 'external', 'variable')),
    status text CHECK (status IN ('draft', 'pending', 'private', 'publish')),
    featured boolean DEFAULT false,
    catalog_visibility text CHECK (catalog_visibility IN ('visible', 'catalog', 'search', 'hidden')),
    description text,
    short_description text,
    sku text,
    menu_order integer DEFAULT 0,
    date_created timestamptz,
    date_modified timestamptz,
    date_on_sale_from timestamptz,
    date_on_sale_to timestamptz,
    
    -- ============================================
    -- 2. Pricing & Tax
    -- ============================================
    price numeric(15,4),
    regular_price numeric(15,4),
    sale_price numeric(15,4),
    tax_status text CHECK (tax_status IN ('taxable', 'shipping', 'none')),
    tax_class text,
    currency text DEFAULT 'ZAR',
    
    -- ============================================
    -- 3. Inventory & Stock
    -- ============================================
    manage_stock boolean DEFAULT false,
    stock_quantity integer,
    stock_status text CHECK (stock_status IN ('instock', 'outofstock', 'onbackorder')),
    backorders text CHECK (backorders IN ('no', 'notify', 'yes')),
    backorders_allowed boolean DEFAULT false,
    backordered boolean DEFAULT false,
    low_stock_amount integer,
    sold_individually boolean DEFAULT false,
    
    -- ============================================
    -- 4. Shipping & Physical Attributes
    -- ============================================
    weight text, -- Store as string with unit (e.g., "1.5 kg")
    length text,
    width text,
    height text,
    shipping_required boolean DEFAULT true,
    shipping_taxable boolean DEFAULT true,
    shipping_class text,
    shipping_class_id integer,
    
    -- ============================================
    -- 5. Product Relationships
    -- ============================================
    parent_id integer, -- Parent product ID (for variations)
    purchase_note text,
    upsell_ids integer[], -- Array of product IDs
    cross_sell_ids integer[], -- Array of product IDs
    grouped_products integer[], -- Array of product IDs
    external_url text,
    button_text text,
    
    -- ============================================
    -- 6. Categories & Tags (stored as JSONB for flexibility)
    -- ============================================
    categories jsonb DEFAULT '[]'::jsonb, -- Array of {id, name, slug}
    category_ids integer[],
    category_names text[],
    tags jsonb DEFAULT '[]'::jsonb, -- Array of {id, name, slug}
    tag_ids integer[],
    tag_names text[],
    
    -- ============================================
    -- 7. Images & Media
    -- ============================================
    images jsonb DEFAULT '[]'::jsonb, -- Array of {id, src, alt, name, position}
    image_count integer DEFAULT 0,
    featured_image text, -- Main product image URL
    gallery_images text[], -- Array of image URLs
    
    -- ============================================
    -- 8. Attributes & Variations
    -- ============================================
    attributes jsonb DEFAULT '[]'::jsonb, -- Array of {id, name, options[], position, visible, variation}
    default_attributes jsonb DEFAULT '[]'::jsonb,
    variations integer[], -- Array of variation IDs
    variation_count integer DEFAULT 0,
    has_options boolean DEFAULT false,
    
    -- ============================================
    -- 9. Downloads (Digital Products)
    -- ============================================
    downloadable boolean DEFAULT false,
    downloads jsonb DEFAULT '[]'::jsonb, -- Array of {id, name, file}
    download_limit integer DEFAULT -1, -- -1 = unlimited
    download_expiry integer DEFAULT -1, -- -1 = never expires
    
    -- ============================================
    -- 10. Reviews & Ratings
    -- ============================================
    reviews_allowed boolean DEFAULT true,
    average_rating numeric(3,2), -- 0.00 to 5.00
    rating_count integer DEFAULT 0,
    review_count integer DEFAULT 0,
    
    -- ============================================
    -- 11. Advanced Settings
    -- ============================================
    virtual boolean DEFAULT false,
    permalink text,
    button_text_custom text, -- Custom add to cart button text
    total_sales integer DEFAULT 0,
    on_sale boolean DEFAULT false,
    purchasable boolean DEFAULT true,
    
    -- ============================================
    -- 12. Additional Plugin Fields
    -- ============================================
    mpn text, -- Manufacturer Part Number
    isbn text, -- International Standard Book Number
    gtin text, -- Global Trade Item Number
    ean text, -- European Article Number
    upc text, -- Universal Product Code
    brand text,
    model text,
    color text,
    size text,
    material text,
    warranty text,
    net_weight text,
    net_length text,
    net_width text,
    net_height text,
    fluid_volume text,
    
    -- ============================================
    -- 13. Meta Data (Custom Fields)
    -- ============================================
    meta_data jsonb DEFAULT '[]'::jsonb, -- Array of {key, value}
    
    -- ============================================
    -- 14. Calculated/Computed Fields
    -- ============================================
    price_html text, -- Formatted price with HTML
    formatted_price text, -- Human-readable price
    sale_percentage numeric(5,2), -- Discount percentage
    is_on_sale boolean DEFAULT false,
    stock_display text, -- Formatted stock status
    availability_html text, -- Formatted availability
    
    -- ============================================
    -- Timestamps & Metadata
    -- ============================================
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    -- Constraints
    CONSTRAINT woocommerce_products_external_id_check CHECK (char_length(external_id) > 0),
    CONSTRAINT woocommerce_products_price_non_negative CHECK (price IS NULL OR price >= 0),
    CONSTRAINT woocommerce_products_regular_price_non_negative CHECK (regular_price IS NULL OR regular_price >= 0),
    CONSTRAINT woocommerce_products_sale_price_non_negative CHECK (sale_price IS NULL OR sale_price >= 0),
    CONSTRAINT woocommerce_products_stock_quantity_non_negative CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
    CONSTRAINT woocommerce_products_rating_valid CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5)),
    CONSTRAINT woocommerce_products_unique_external UNIQUE (connector_id, external_id)
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_org ON woocommerce_products(org_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_connector ON woocommerce_products(connector_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_external_id ON woocommerce_products(external_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_sync_id ON woocommerce_products(sync_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_sku ON woocommerce_products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_name ON woocommerce_products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_status ON woocommerce_products(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_stock_status ON woocommerce_products(stock_status) WHERE stock_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_type ON woocommerce_products(type) WHERE type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_featured ON woocommerce_products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_on_sale ON woocommerce_products(on_sale) WHERE on_sale = true;
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_categories ON woocommerce_products USING gin(category_ids);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_tags ON woocommerce_products USING gin(tag_ids);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_updated_at ON woocommerce_products(updated_at DESC);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_categories_jsonb ON woocommerce_products USING gin(categories);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_tags_jsonb ON woocommerce_products USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_images_jsonb ON woocommerce_products USING gin(images);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_attributes_jsonb ON woocommerce_products USING gin(attributes);
CREATE INDEX IF NOT EXISTS idx_woocommerce_products_meta_data_jsonb ON woocommerce_products USING gin(meta_data);

-- ============================================
-- View: woocommerce_products_enriched
-- ============================================
-- Combines normalized fields with sync metadata and raw JSONB data
CREATE OR REPLACE VIEW woocommerce_products_enriched AS
SELECT 
    p.*,
    s.entity_id as local_entity_id,
    s.direction as sync_direction,
    s.last_sync_at,
    s.last_sync_status,
    s.sync_data as raw_sync_data, -- Full raw JSONB from WooCommerce API
    s.sync_hash,
    s.error_message as sync_error_message,
    s.retry_count,
    s.metadata as sync_metadata,
    s.created_at as sync_created_at,
    s.updated_at as sync_updated_at
FROM woocommerce_products p
LEFT JOIN woocommerce_sync s 
    ON p.sync_id = s.id 
    OR (p.connector_id = s.connector_id 
        AND s.entity_type = 'product' 
        AND s.external_id = p.external_id);

-- ============================================
-- Function: sync_woocommerce_product_data
-- ============================================
-- Function to populate woocommerce_products from sync_data JSONB
-- This can be called after syncing to normalize the data
CREATE OR REPLACE FUNCTION sync_woocommerce_product_data(
    p_org_id uuid,
    p_connector_id uuid,
    p_external_id text,
    p_sync_data jsonb
) RETURNS uuid AS $$
DECLARE
    v_product_id uuid;
    v_sync_id uuid;
BEGIN
    -- Find or create sync record
    SELECT id INTO v_sync_id
    FROM woocommerce_sync
    WHERE org_id = p_org_id
      AND connector_id = p_connector_id
      AND entity_type = 'product'
      AND external_id = p_external_id
    LIMIT 1;
    
    -- Insert or update product
    INSERT INTO woocommerce_products (
        org_id,
        connector_id,
        sync_id,
        external_id,
        name,
        slug,
        type,
        status,
        featured,
        catalog_visibility,
        description,
        short_description,
        sku,
        menu_order,
        date_created,
        date_modified,
        date_on_sale_from,
        date_on_sale_to,
        price,
        regular_price,
        sale_price,
        tax_status,
        tax_class,
        currency,
        manage_stock,
        stock_quantity,
        stock_status,
        backorders,
        backorders_allowed,
        backordered,
        low_stock_amount,
        sold_individually,
        weight,
        length,
        width,
        height,
        shipping_required,
        shipping_taxable,
        shipping_class,
        shipping_class_id,
        parent_id,
        purchase_note,
        upsell_ids,
        cross_sell_ids,
        grouped_products,
        external_url,
        button_text,
        categories,
        category_ids,
        category_names,
        tags,
        tag_ids,
        tag_names,
        images,
        image_count,
        featured_image,
        gallery_images,
        attributes,
        default_attributes,
        variations,
        variation_count,
        has_options,
        downloadable,
        downloads,
        download_limit,
        download_expiry,
        reviews_allowed,
        average_rating,
        rating_count,
        review_count,
        virtual,
        permalink,
        button_text_custom,
        total_sales,
        on_sale,
        purchasable,
        mpn,
        isbn,
        gtin,
        ean,
        upc,
        brand,
        model,
        color,
        size,
        material,
        warranty,
        net_weight,
        net_length,
        net_width,
        net_height,
        fluid_volume,
        meta_data,
        price_html,
        formatted_price,
        sale_percentage,
        is_on_sale,
        stock_display,
        availability_html
    ) VALUES (
        p_org_id,
        p_connector_id,
        v_sync_id,
        p_external_id,
        p_sync_data->>'name',
        p_sync_data->>'slug',
        p_sync_data->>'type',
        p_sync_data->>'status',
        (p_sync_data->>'featured')::boolean,
        p_sync_data->>'catalog_visibility',
        p_sync_data->>'description',
        p_sync_data->>'short_description',
        p_sync_data->>'sku',
        (p_sync_data->>'menu_order')::integer,
        (p_sync_data->>'date_created')::timestamptz,
        (p_sync_data->>'date_modified')::timestamptz,
        (p_sync_data->>'date_on_sale_from')::timestamptz,
        (p_sync_data->>'date_on_sale_to')::timestamptz,
        (p_sync_data->>'price')::numeric,
        (p_sync_data->>'regular_price')::numeric,
        (p_sync_data->>'sale_price')::numeric,
        p_sync_data->>'tax_status',
        p_sync_data->>'tax_class',
        COALESCE(p_sync_data->>'currency', 'ZAR'),
        (p_sync_data->>'manage_stock')::boolean,
        (p_sync_data->>'stock_quantity')::integer,
        p_sync_data->>'stock_status',
        p_sync_data->>'backorders',
        (p_sync_data->>'backorders_allowed')::boolean,
        (p_sync_data->>'backordered')::boolean,
        (p_sync_data->>'low_stock_amount')::integer,
        (p_sync_data->>'sold_individually')::boolean,
        p_sync_data->>'weight',
        p_sync_data->>'length',
        p_sync_data->>'width',
        p_sync_data->>'height',
        (p_sync_data->>'shipping_required')::boolean,
        (p_sync_data->>'shipping_taxable')::boolean,
        p_sync_data->>'shipping_class',
        (p_sync_data->>'shipping_class_id')::integer,
        (p_sync_data->>'parent_id')::integer,
        p_sync_data->>'purchase_note',
        (SELECT array_agg(elem::integer) FROM jsonb_array_elements_text(p_sync_data->'upsell_ids') elem),
        (SELECT array_agg(elem::integer) FROM jsonb_array_elements_text(p_sync_data->'cross_sell_ids') elem),
        (SELECT array_agg(elem::integer) FROM jsonb_array_elements_text(p_sync_data->'grouped_products') elem),
        p_sync_data->>'external_url',
        p_sync_data->>'button_text',
        COALESCE(p_sync_data->'categories', '[]'::jsonb),
        (SELECT array_agg((elem->>'id')::integer) FROM jsonb_array_elements(p_sync_data->'categories') elem),
        (SELECT array_agg(elem->>'name') FROM jsonb_array_elements(p_sync_data->'categories') elem WHERE elem->>'name' IS NOT NULL),
        COALESCE(p_sync_data->'tags', '[]'::jsonb),
        (SELECT array_agg((elem->>'id')::integer) FROM jsonb_array_elements(p_sync_data->'tags') elem),
        (SELECT array_agg(elem->>'name') FROM jsonb_array_elements(p_sync_data->'tags') elem WHERE elem->>'name' IS NOT NULL),
        COALESCE(p_sync_data->'images', '[]'::jsonb),
        jsonb_array_length(COALESCE(p_sync_data->'images', '[]'::jsonb)),
        (p_sync_data->'images'->0->>'src'),
        (SELECT array_agg(elem->>'src') FROM jsonb_array_elements(p_sync_data->'images') elem WHERE elem->>'src' IS NOT NULL),
        COALESCE(p_sync_data->'attributes', '[]'::jsonb),
        COALESCE(p_sync_data->'default_attributes', '[]'::jsonb),
        (SELECT array_agg(elem::integer) FROM jsonb_array_elements_text(p_sync_data->'variations') elem),
        jsonb_array_length(COALESCE(p_sync_data->'variations', '[]'::jsonb)),
        (p_sync_data->'attributes' IS NOT NULL AND jsonb_array_length(p_sync_data->'attributes') > 0),
        (p_sync_data->>'downloadable')::boolean,
        COALESCE(p_sync_data->'downloads', '[]'::jsonb),
        COALESCE((p_sync_data->>'download_limit')::integer, -1),
        COALESCE((p_sync_data->>'download_expiry')::integer, -1),
        COALESCE((p_sync_data->>'reviews_allowed')::boolean, true),
        (p_sync_data->>'average_rating')::numeric,
        (p_sync_data->>'rating_count')::integer,
        (p_sync_data->>'review_count')::integer,
        (p_sync_data->>'virtual')::boolean,
        p_sync_data->>'permalink',
        p_sync_data->>'button_text',
        (p_sync_data->>'total_sales')::integer,
        (p_sync_data->>'on_sale')::boolean,
        COALESCE((p_sync_data->>'purchasable')::boolean, true),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_mpn', 'mpn') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_isbn', 'isbn') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_gtin', 'gtin') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_ean', 'ean') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_upc', 'upc') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_brand', 'brand') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_model', 'model') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_color', 'color') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_size', 'size') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_material', 'material') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_warranty', 'warranty') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_net_weight', 'net_weight') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_net_length', 'net_length') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_net_width', 'net_width') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_net_height', 'net_height') LIMIT 1),
        (SELECT (elem->>'value')::text FROM jsonb_array_elements(COALESCE(p_sync_data->'meta_data', '[]'::jsonb)) elem WHERE elem->>'key' IN ('_fluid_volume', 'fluid_volume') LIMIT 1),
        COALESCE(p_sync_data->'meta_data', '[]'::jsonb),
        p_sync_data->>'price_html',
        p_sync_data->>'formatted_price',
        CASE 
            WHEN (p_sync_data->>'regular_price')::numeric > 0 
            THEN ((1 - (p_sync_data->>'sale_price')::numeric / (p_sync_data->>'regular_price')::numeric) * 100)
            ELSE NULL
        END,
        (p_sync_data->>'on_sale')::boolean,
        p_sync_data->>'stock_display',
        p_sync_data->>'availability_html'
    )
    ON CONFLICT (connector_id, external_id) 
    DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        featured = EXCLUDED.featured,
        catalog_visibility = EXCLUDED.catalog_visibility,
        description = EXCLUDED.description,
        short_description = EXCLUDED.short_description,
        sku = EXCLUDED.sku,
        menu_order = EXCLUDED.menu_order,
        date_created = EXCLUDED.date_created,
        date_modified = EXCLUDED.date_modified,
        date_on_sale_from = EXCLUDED.date_on_sale_from,
        date_on_sale_to = EXCLUDED.date_on_sale_to,
        price = EXCLUDED.price,
        regular_price = EXCLUDED.regular_price,
        sale_price = EXCLUDED.sale_price,
        tax_status = EXCLUDED.tax_status,
        tax_class = EXCLUDED.tax_class,
        currency = EXCLUDED.currency,
        manage_stock = EXCLUDED.manage_stock,
        stock_quantity = EXCLUDED.stock_quantity,
        stock_status = EXCLUDED.stock_status,
        backorders = EXCLUDED.backorders,
        backorders_allowed = EXCLUDED.backorders_allowed,
        backordered = EXCLUDED.backordered,
        low_stock_amount = EXCLUDED.low_stock_amount,
        sold_individually = EXCLUDED.sold_individually,
        weight = EXCLUDED.weight,
        length = EXCLUDED.length,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        shipping_required = EXCLUDED.shipping_required,
        shipping_taxable = EXCLUDED.shipping_taxable,
        shipping_class = EXCLUDED.shipping_class,
        shipping_class_id = EXCLUDED.shipping_class_id,
        parent_id = EXCLUDED.parent_id,
        purchase_note = EXCLUDED.purchase_note,
        upsell_ids = EXCLUDED.upsell_ids,
        cross_sell_ids = EXCLUDED.cross_sell_ids,
        grouped_products = EXCLUDED.grouped_products,
        external_url = EXCLUDED.external_url,
        button_text = EXCLUDED.button_text,
        categories = EXCLUDED.categories,
        category_ids = EXCLUDED.category_ids,
        category_names = EXCLUDED.category_names,
        tags = EXCLUDED.tags,
        tag_ids = EXCLUDED.tag_ids,
        tag_names = EXCLUDED.tag_names,
        images = EXCLUDED.images,
        image_count = EXCLUDED.image_count,
        featured_image = EXCLUDED.featured_image,
        gallery_images = EXCLUDED.gallery_images,
        attributes = EXCLUDED.attributes,
        default_attributes = EXCLUDED.default_attributes,
        variations = EXCLUDED.variations,
        variation_count = EXCLUDED.variation_count,
        has_options = EXCLUDED.has_options,
        downloadable = EXCLUDED.downloadable,
        downloads = EXCLUDED.downloads,
        download_limit = EXCLUDED.download_limit,
        download_expiry = EXCLUDED.download_expiry,
        reviews_allowed = EXCLUDED.reviews_allowed,
        average_rating = EXCLUDED.average_rating,
        rating_count = EXCLUDED.rating_count,
        review_count = EXCLUDED.review_count,
        virtual = EXCLUDED.virtual,
        permalink = EXCLUDED.permalink,
        button_text_custom = EXCLUDED.button_text_custom,
        total_sales = EXCLUDED.total_sales,
        on_sale = EXCLUDED.on_sale,
        purchasable = EXCLUDED.purchasable,
        mpn = EXCLUDED.mpn,
        isbn = EXCLUDED.isbn,
        gtin = EXCLUDED.gtin,
        ean = EXCLUDED.ean,
        upc = EXCLUDED.upc,
        brand = EXCLUDED.brand,
        model = EXCLUDED.model,
        color = EXCLUDED.color,
        size = EXCLUDED.size,
        material = EXCLUDED.material,
        warranty = EXCLUDED.warranty,
        net_weight = EXCLUDED.net_weight,
        net_length = EXCLUDED.net_length,
        net_width = EXCLUDED.net_width,
        net_height = EXCLUDED.net_height,
        fluid_volume = EXCLUDED.fluid_volume,
        meta_data = EXCLUDED.meta_data,
        price_html = EXCLUDED.price_html,
        formatted_price = EXCLUDED.formatted_price,
        sale_percentage = EXCLUDED.sale_percentage,
        is_on_sale = EXCLUDED.is_on_sale,
        stock_display = EXCLUDED.stock_display,
        availability_html = EXCLUDED.availability_html,
        updated_at = now()
    RETURNING id INTO v_product_id;
    
    RETURN v_product_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comments for Documentation
-- ============================================
COMMENT ON TABLE woocommerce_products IS 'Normalized WooCommerce product data with all available fields from REST API v3';
COMMENT ON VIEW woocommerce_products_enriched IS 'Enriched view combining normalized product fields with sync metadata and raw JSONB data';
COMMENT ON FUNCTION sync_woocommerce_product_data IS 'Populates woocommerce_products table from sync_data JSONB, handling insert/update logic';

