# WooCommerce Product Fields & Metadata Reference

This document lists **all available product fields and metadata** from WooCommerce REST API v3 that can be displayed in the product sync preview table.

## Field Categories

### 1. Basic Product Information

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `id` | Product ID | number | Unique WooCommerce product ID | ✅ |
| `name` | Product Name | string | Product title/name | ✅ |
| `slug` | Slug | string | URL-friendly product slug | ❌ |
| `type` | Product Type | string | simple, grouped, external, variable | ❌ |
| `status` | Status | string | draft, pending, private, publish | ❌ |
| `featured` | Featured | boolean | Is product featured? | ❌ |
| `catalog_visibility` | Catalog Visibility | string | visible, catalog, search, hidden | ❌ |
| `description` | Description | string | Full product description (HTML) | ❌ |
| `short_description` | Short Description | string | Brief product summary | ❌ |
| `sku` | SKU | string | Stock Keeping Unit | ✅ |
| `menu_order` | Menu Order | number | Custom ordering position | ❌ |
| `date_created` | Date Created | datetime | Product creation date | ❌ |
| `date_modified` | Date Modified | datetime | Last modification date | ❌ |
| `date_on_sale_from` | Sale Start Date | datetime | When sale price becomes active | ❌ |
| `date_on_sale_to` | Sale End Date | datetime | When sale price expires | ❌ |

### 2. Pricing & Tax

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `price` | Price | string | Current price (regular or sale) | ✅ |
| `regular_price` | Regular Price | string | Standard price before discounts | ✅ |
| `sale_price` | Sale Price | string | Discounted price | ✅ |
| `tax_status` | Tax Status | string | taxable, shipping, none | ❌ |
| `tax_class` | Tax Class | string | Tax class identifier | ❌ |
| `currency` | Currency | string | Product currency code | ❌ |

### 3. Inventory & Stock

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `manage_stock` | Manage Stock | boolean | Enable stock management | ❌ |
| `stock_quantity` | Stock Quantity | number | Available stock count | ✅ |
| `stock_status` | Stock Status | string | instock, outofstock, onbackorder | ✅ |
| `backorders` | Backorders | string | no, notify, yes | ❌ |
| `backorders_allowed` | Backorders Allowed | boolean | Allow backorders? | ❌ |
| `backordered` | Backordered | boolean | Currently on backorder? | ❌ |
| `low_stock_amount` | Low Stock Threshold | number | Alert when stock falls below | ❌ |
| `sold_individually` | Sold Individually | boolean | Limit to 1 per order | ❌ |

### 4. Shipping & Physical Attributes

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `weight` | Weight | string | Product weight (with unit) | ❌ |
| `length` | Length | string | Product length (with unit) | ❌ |
| `width` | Width | string | Product width (with unit) | ❌ |
| `height` | Height | string | Product height (with unit) | ❌ |
| `shipping_required` | Shipping Required | boolean | Requires shipping? | ❌ |
| `shipping_taxable` | Shipping Taxable | boolean | Shipping is taxable? | ❌ |
| `shipping_class` | Shipping Class | string | Shipping class identifier | ❌ |
| `shipping_class_id` | Shipping Class ID | number | Shipping class ID | ❌ |

### 5. Product Relationships

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `parent_id` | Parent ID | number | Parent product ID (for variations) | ❌ |
| `purchase_note` | Purchase Note | string | Message sent after purchase | ❌ |
| `upsell_ids` | Upsell IDs | array | Related products (upsells) | ❌ |
| `cross_sell_ids` | Cross-sell IDs | array | Related products (cross-sells) | ❌ |
| `grouped_products` | Grouped Products | array | Product IDs in grouped product | ❌ |
| `external_url` | External URL | string | URL for external products | ❌ |
| `button_text` | Button Text | string | Button text for external products | ❌ |

### 6. Categories & Tags

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `categories` | Categories | array | Product categories (id, name, slug) | ✅ |
| `category_ids` | Category IDs | array | Array of category IDs | ❌ |
| `category_names` | Category Names | array | Array of category names | ❌ |
| `tags` | Tags | array | Product tags (id, name, slug) | ❌ |
| `tag_ids` | Tag IDs | array | Array of tag IDs | ❌ |
| `tag_names` | Tag Names | array | Array of tag names | ❌ |

### 7. Images & Media

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `images` | Images | array | Product images (id, src, alt, name, position) | ❌ |
| `image_count` | Image Count | number | Number of product images | ❌ |
| `featured_image` | Featured Image | string | Main product image URL | ❌ |
| `gallery_images` | Gallery Images | array | Additional product images | ❌ |

### 8. Attributes & Variations

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `attributes` | Attributes | array | Product attributes (id, name, options, position, visible, variation) | ❌ |
| `default_attributes` | Default Attributes | array | Default attribute values | ❌ |
| `variations` | Variations | array | Product variation IDs | ❌ |
| `variation_count` | Variation Count | number | Number of variations | ❌ |
| `has_options` | Has Options | boolean | Product has selectable options | ❌ |

### 9. Downloads (Digital Products)

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `downloadable` | Downloadable | boolean | Is product downloadable? | ❌ |
| `downloads` | Downloads | array | Downloadable files (id, name, file) | ❌ |
| `download_limit` | Download Limit | number | Max download attempts (-1 = unlimited) | ❌ |
| `download_expiry` | Download Expiry | number | Days until download expires (-1 = never) | ❌ |

### 10. Reviews & Ratings

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `reviews_allowed` | Reviews Allowed | boolean | Allow customer reviews? | ❌ |
| `average_rating` | Average Rating | string | Average review rating (0-5) | ❌ |
| `rating_count` | Rating Count | number | Number of reviews | ❌ |
| `review_count` | Review Count | number | Total review count | ❌ |

### 11. Advanced Settings

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `virtual` | Virtual Product | boolean | Is product virtual (no shipping)? | ❌ |
| `permalink` | Permalink | string | Product URL | ❌ |
| `button_text` | Button Text | string | Add to cart button text | ❌ |
| `total_sales` | Total Sales | number | Number of units sold | ❌ |
| `on_sale` | On Sale | boolean | Currently on sale? | ❌ |
| `purchasable` | Purchasable | boolean | Can be purchased? | ❌ |

### 12. Meta Data (Custom Fields)

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `meta_data` | Meta Data | array | Custom metadata (key-value pairs) | ❌ |

**Common Meta Data Keys** (extracted from meta_data array):
- `_product_version`
- `_wp_old_slug`
- `_thumbnail_id`
- `_product_image_gallery`
- `_visibility`
- `_stock_status`
- `_tax_status`
- `_tax_class`
- `_manage_stock`
- `_backorders`
- `_sold_individually`
- `_virtual`
- `_downloadable`
- `_download_limit`
- `_download_expiry`
- `_featured`
- `_weight`
- `_length`
- `_width`
- `_height`
- `_sku`
- `_price`
- `_regular_price`
- `_sale_price`
- `_sale_price_dates_from`
- `_sale_price_dates_to`
- `_purchase_note`
- `_default_attributes`
- `_product_attributes`
- `_product_version`
- `_wp_old_date`
- `_edit_lock`
- `_edit_last`
- `_wc_rating_count`
- `_wc_average_rating`
- `_wc_review_count`
- `_product_image_gallery`
- `_wp_attachment_image_alt`
- Custom plugin fields (varies by store)

### 13. Additional Plugin Fields

These fields may be available depending on installed WooCommerce plugins:

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `mpn` | MPN (Manufacturer Part Number) | string | Manufacturer part number | ❌ |
| `isbn` | ISBN | string | International Standard Book Number | ❌ |
| `gtin` | GTIN | string | Global Trade Item Number | ❌ |
| `ean` | EAN | string | European Article Number | ❌ |
| `upc` | UPC | string | Universal Product Code | ❌ |
| `brand` | Brand | string | Product brand/manufacturer | ❌ |
| `model` | Model | string | Product model number | ❌ |
| `color` | Color | string | Product color | ❌ |
| `size` | Size | string | Product size | ❌ |
| `material` | Material | string | Product material | ❌ |
| `warranty` | Warranty | string | Warranty information | ❌ |
| `net_weight` | Net Weight | string | Weight excluding packaging | ❌ |
| `net_length` | Net Length | string | Length excluding packaging | ❌ |
| `net_width` | Net Width | string | Width excluding packaging | ❌ |
| `net_height` | Net Height | string | Height excluding packaging | ❌ |
| `fluid_volume` | Fluid Volume | string | Volume for liquid products | ❌ |

### 14. Calculated/Computed Fields

| Field ID | Label | Type | Description | Default Visible |
|----------|-------|------|-------------|-----------------|
| `price_html` | Price HTML | string | Formatted price with HTML | ❌ |
| `formatted_price` | Formatted Price | string | Human-readable price | ❌ |
| `sale_percentage` | Sale Percentage | number | Discount percentage | ❌ |
| `is_on_sale` | Is On Sale | boolean | Currently on sale? | ❌ |
| `stock_display` | Stock Display | string | Formatted stock status | ❌ |
| `availability_html` | Availability HTML | string | Formatted availability | ❌ |

## Usage Notes

1. **Meta Data Fields**: The `meta_data` array contains custom fields. Common keys are listed above, but each store may have additional custom meta fields.

2. **Array Fields**: Fields like `categories`, `tags`, `images`, `attributes`, etc. are arrays. You may want to display:
   - Count (e.g., "3 categories")
   - First item (e.g., "Electronics")
   - All items (e.g., "Electronics, Audio, Speakers")
   - As separate columns (e.g., "Category 1", "Category 2", etc.)

3. **Nested Objects**: Some fields contain nested objects (e.g., `categories[0].name`). Consider flattening for display.

4. **Date Fields**: Date fields are in ISO 8601 format. Consider formatting for display.

5. **Boolean Fields**: Boolean fields can be displayed as checkmarks, icons, or "Yes/No" text.

6. **Price Fields**: Prices are strings in WooCommerce API. Consider formatting with currency symbols.

## Implementation Recommendation

When implementing the column selector, consider:

1. **Grouping**: Group related fields together in the selector UI
2. **Search**: Add search/filter in column selector for large lists
3. **Presets**: Create column presets (e.g., "Basic Info", "Full Details", "Inventory Focus")
4. **Persistence**: Save user's column preferences to localStorage
5. **Array Handling**: For array fields, provide options to display as count, list, or expand into multiple columns

## Next Steps

1. Review this list and indicate which fields you want to display
2. Specify how array fields should be displayed (count, list, expanded)
3. Indicate any custom meta_data keys from your WooCommerce store that should be included
4. Specify default visible columns (currently: Select, Status, SKU, Name, External ID)

