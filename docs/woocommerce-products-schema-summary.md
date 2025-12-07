# WooCommerce Products Schema - Implementation Summary

## Overview

A comprehensive database schema has been created to store all WooCommerce product fields and metadata in a normalized format. This allows for efficient querying and display of product information in column views similar to SIP and NXT SOH.

## Migration File

**File:** `migrations/0219_woocommerce_products_schema.sql`

## Schema Components

### 1. Main Table: `woocommerce_products`

A normalized table with **100+ columns** covering all WooCommerce product fields:

#### Field Categories:

1. **Basic Product Information** (14 fields)
   - id, name, slug, type, status, featured, catalog_visibility
   - description, short_description, sku, menu_order
   - date_created, date_modified, date_on_sale_from, date_on_sale_to

2. **Pricing & Tax** (6 fields)
   - price, regular_price, sale_price
   - tax_status, tax_class, currency

3. **Inventory & Stock** (8 fields)
   - manage_stock, stock_quantity, stock_status
   - backorders, backorders_allowed, backordered
   - low_stock_amount, sold_individually

4. **Shipping & Physical Attributes** (8 fields)
   - weight, length, width, height
   - shipping_required, shipping_taxable
   - shipping_class, shipping_class_id

5. **Product Relationships** (7 fields)
   - parent_id, purchase_note
   - upsell_ids[], cross_sell_ids[], grouped_products[]
   - external_url, button_text

6. **Categories & Tags** (JSONB + Arrays)
   - categories (JSONB), category_ids[], category_names[]
   - tags (JSONB), tag_ids[], tag_names[]

7. **Images & Media** (JSONB + Arrays)
   - images (JSONB), image_count, featured_image
   - gallery_images[]

8. **Attributes & Variations** (JSONB + Arrays)
   - attributes (JSONB), default_attributes (JSONB)
   - variations[], variation_count, has_options

9. **Downloads** (4 fields)
   - downloadable, downloads (JSONB)
   - download_limit, download_expiry

10. **Reviews & Ratings** (4 fields)
    - reviews_allowed, average_rating
    - rating_count, review_count

11. **Advanced Settings** (7 fields)
    - virtual, permalink, button_text_custom
    - total_sales, on_sale, purchasable

12. **Additional Plugin Fields** (15 fields)
    - mpn, isbn, gtin, ean, upc
    - brand, model, color, size, material, warranty
    - net_weight, net_length, net_width, net_height, fluid_volume

13. **Meta Data** (JSONB)
    - meta_data (JSONB) - stores all custom fields

14. **Calculated/Computed Fields** (6 fields)
    - price_html, formatted_price, sale_percentage
    - is_on_sale, stock_display, availability_html

### 2. View: `woocommerce_products_enriched`

A comprehensive view that combines:
- All normalized fields from `woocommerce_products`
- Sync metadata from `woocommerce_sync` (direction, status, timestamps)
- Raw JSONB data from `sync_data` for complete product information

### 3. Function: `sync_woocommerce_product_data()`

A PostgreSQL function that:
- Extracts all fields from `sync_data` JSONB
- Populates the normalized `woocommerce_products` table
- Handles insert/update logic (upsert)
- Extracts meta_data fields for plugin-specific data

**Usage:**
```sql
SELECT sync_woocommerce_product_data(
    'org-uuid',
    'connector-uuid',
    '12345', -- WooCommerce product ID
    '{"name": "Product Name", ...}'::jsonb
);
```

### 4. Indexes

**Performance indexes created:**
- Primary keys and foreign keys
- Text search (GIN trigram on name)
- Status and type filters
- Array indexes for categories, tags
- JSONB indexes for complex fields
- Timestamp indexes for sorting

## Integration Points

### Relationship to Existing Tables

1. **`woocommerce_sync`** (existing)
   - `woocommerce_products.sync_id` → `woocommerce_sync.id`
   - Maintains sync metadata and raw JSONB data

2. **`organization`** (existing)
   - `woocommerce_products.org_id` → `organization.id`

3. **`integration_connector`** (existing)
   - `woocommerce_products.connector_id` → `integration_connector.id`

## Data Flow

1. **Sync Process:**
   ```
   WooCommerce API → sync_data (JSONB in woocommerce_sync)
                  → sync_woocommerce_product_data()
                  → woocommerce_products (normalized)
   ```

2. **Query Process:**
   ```
   Application → woocommerce_products_enriched (view)
              → All fields available for column display
   ```

## Benefits

1. **Normalized Structure**: All fields in dedicated columns for easy querying
2. **Performance**: Indexed columns for fast filtering and sorting
3. **Flexibility**: JSONB columns for complex nested data (categories, tags, images, attributes)
4. **Completeness**: 100+ fields covering all WooCommerce product data
5. **Backward Compatibility**: Raw JSONB data preserved in `sync_data`
6. **Easy Integration**: View combines normalized + sync metadata

## Next Steps

1. **Run Migration:**
   ```bash
   bun run db:migrate
   ```

2. **Update Sync Code:**
   - Modify sync endpoints to call `sync_woocommerce_product_data()` after fetching products
   - Or create a background job to normalize existing `sync_data`

3. **Update API Endpoints:**
   - Modify `/api/v1/integrations/woocommerce/table` to query `woocommerce_products_enriched`
   - Return all available columns for column selector

4. **Update Frontend:**
   - Add column selector component (similar to SIP/NXT SOH)
   - Map all available fields to column definitions
   - Allow users to select which columns to display

## Example Queries

### Get all products with selected columns:
```sql
SELECT 
    external_id,
    name,
    sku,
    price,
    regular_price,
    sale_price,
    stock_quantity,
    stock_status,
    category_names,
    tag_names,
    brand,
    mpn
FROM woocommerce_products_enriched
WHERE org_id = 'org-uuid'
ORDER BY updated_at DESC;
```

### Get products on sale:
```sql
SELECT 
    external_id,
    name,
    regular_price,
    sale_price,
    sale_percentage
FROM woocommerce_products_enriched
WHERE org_id = 'org-uuid'
  AND on_sale = true
ORDER BY sale_percentage DESC;
```

### Search products by category:
```sql
SELECT *
FROM woocommerce_products_enriched
WHERE org_id = 'org-uuid'
  AND 'Electronics' = ANY(category_names);
```

## Notes

- All fields are nullable to handle missing data gracefully
- Array fields (category_ids, tag_ids, etc.) allow efficient querying
- JSONB fields preserve full structure for complex nested data
- The view automatically joins sync metadata for complete information
- The function handles extraction of meta_data fields automatically

