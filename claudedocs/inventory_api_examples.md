# Inventory Management System - API Examples and Query Patterns

## Overview

This document provides practical SQL examples and API query patterns for the Enhanced Inventory Management System. All queries include proper organization isolation and performance optimization.

## Core CRUD Operations

### 1. Supplier Management

#### Create Supplier
```sql
INSERT INTO supplier (
    org_id,
    name,
    contact_email,
    contact_phone,
    address,
    payment_terms,
    lead_time_days,
    currency_code,
    tax_number
) VALUES (
    $1,  -- org_id
    'Acme Supply Co',
    'orders@acmesupply.com',
    '+27-11-123-4567',
    '{"street": "123 Industrial Ave", "city": "Johannesburg", "postal_code": "2000"}',
    'Net 30 days',
    7,
    'ZAR',
    '1234567890'
);
```

#### Get Supplier Performance Dashboard
```sql
SELECT * FROM supplier_performance_view
WHERE org_id = $1
ORDER BY performance_score DESC, total_spend DESC;
```

#### Update Supplier Performance (Automated)
```sql
-- This is handled automatically by triggers when purchase orders are completed
-- Manual override example:
UPDATE supplier
SET
    performance_score = 95.5,
    performance_tier = 'gold',
    last_evaluation_date = CURRENT_DATE
WHERE id = $1 AND org_id = $2;
```

### 2. Brand Management

#### Create Brand
```sql
INSERT INTO brand (org_id, name, description, logo_url, website)
VALUES ($1, 'Premium Tech', 'High-end technology products', 'https://example.com/logo.png', 'https://premiumtech.com');
```

#### Get Active Brands
```sql
SELECT id, name, description, logo_url
FROM brand
WHERE org_id = $1 AND is_active = true
ORDER BY name;
```

### 3. Inventory Item Management

#### Create Inventory Item with XLSX Fields
```sql
INSERT INTO inventory_item (
    org_id,
    supplier_id,
    brand_id,
    sku,
    name,
    description,
    category,
    unit_price,
    cost_price,
    default_vat_rate,
    quantity_on_hand,
    reorder_point,
    unit_of_measure,
    barcode
) VALUES (
    $1,  -- org_id
    $2,  -- supplier_id
    $3,  -- brand_id
    'SKU-001',
    'Wireless Mouse',
    'Ergonomic wireless mouse with USB receiver',
    'components',
    299.99,
    150.00,
    15.00,
    50,
    10,
    'each',
    '1234567890123'
);
```

#### XLSX Export Query
```sql
SELECT
    supplier_name,
    brand,
    category,
    sku,
    description,
    price,
    vat_rate,
    stock_qty,
    barcode,
    unit_of_measure
FROM inventory_xlsx_view
WHERE org_id = $1
AND is_active = true
ORDER BY sku;
```

#### Low Stock Alert Query
```sql
SELECT * FROM low_stock_alert_view
WHERE org_id = $1
ORDER BY quantity_needed DESC;
```

### 4. Stock Movement Tracking

#### Record Stock Receipt
```sql
INSERT INTO stock_movement (
    org_id,
    inventory_item_id,
    movement_type,
    quantity_change,
    unit_cost,
    reference_table,
    reference_id,
    location_to,
    notes
) VALUES (
    $1,  -- org_id
    $2,  -- inventory_item_id
    'purchase_receipt',
    100,
    150.00,
    'purchase_order_item',
    $3,  -- po_item_id
    'WAREHOUSE-A',
    'Goods received from Acme Supply Co'
);
```

#### Record Stock Sale
```sql
INSERT INTO stock_movement (
    org_id,
    inventory_item_id,
    movement_type,
    quantity_change,
    location_from,
    notes
) VALUES (
    $1,  -- org_id
    $2,  -- inventory_item_id
    'sale_shipment',
    -5,
    'WAREHOUSE-A',
    'Sold to customer order #12345'
);
```

#### Stock Movement History
```sql
SELECT * FROM stock_movement_summary_view
WHERE org_id = $1
AND inventory_item_id = $2
ORDER BY movement_date DESC
LIMIT 50;
```

### 5. Price List Management

#### Create Price List
```sql
INSERT INTO price_list (org_id, name, description, currency_code, is_default, created_by)
VALUES ($1, 'Standard 2024', 'Standard pricing for 2024', 'ZAR', true, $2);
```

#### Add Item to Price List
```sql
INSERT INTO price_list_item (
    price_list_id,
    inventory_item_id,
    price,
    vat_rate,
    min_quantity,
    created_by
) VALUES ($1, $2, 299.99, 15.00, 1, $3);
```

#### Get Current Pricing
```sql
SELECT
    i.sku,
    i.name,
    pli.price,
    pli.vat_rate,
    pli.min_quantity
FROM price_list_item pli
JOIN inventory_item i ON pli.inventory_item_id = i.id
JOIN price_list pl ON pli.price_list_id = pl.id
WHERE pl.org_id = $1
AND pl.is_default = true
AND (pli.effective_until IS NULL OR pli.effective_until > now())
ORDER BY i.sku;
```

## Advanced Queries

### 1. Inventory Valuation Report

```sql
SELECT
    i.category,
    COUNT(*) as item_count,
    SUM(i.quantity_on_hand) as total_quantity,
    SUM(i.quantity_on_hand * i.unit_price) as total_value,
    SUM(i.quantity_on_hand * i.cost_price) as total_cost,
    SUM(i.quantity_on_hand * (i.unit_price - i.cost_price)) as total_profit
FROM inventory_item i
WHERE i.org_id = $1
AND i.is_active = true
AND i.quantity_on_hand > 0
GROUP BY i.category
ORDER BY total_value DESC;
```

### 2. Supplier Performance Analysis

```sql
SELECT
    s.name as supplier_name,
    s.performance_tier,
    s.performance_score,
    s.on_time_delivery_rate,
    COUNT(po.id) as total_orders,
    SUM(po.total_amount) as total_spend,
    AVG(po.total_amount) as avg_order_value,
    COUNT(po.id) FILTER (WHERE po.actual_delivery_date <= po.expected_delivery_date) as on_time_orders
FROM supplier s
LEFT JOIN purchase_order po ON s.id = po.supplier_id
WHERE s.org_id = $1
AND s.status = 'active'
GROUP BY s.id, s.name, s.performance_tier, s.performance_score, s.on_time_delivery_rate
ORDER BY s.performance_score DESC;
```

### 3. ABC Analysis (Inventory Classification)

```sql
WITH inventory_value AS (
    SELECT
        i.id,
        i.sku,
        i.name,
        i.quantity_on_hand,
        i.unit_price,
        (i.quantity_on_hand * i.unit_price) as total_value
    FROM inventory_item i
    WHERE i.org_id = $1
    AND i.is_active = true
    AND i.quantity_on_hand > 0
),
ranked_inventory AS (
    SELECT
        *,
        SUM(total_value) OVER () as grand_total,
        SUM(total_value) OVER (ORDER BY total_value DESC ROWS UNBOUNDED PRECEDING) as running_total,
        ROW_NUMBER() OVER (ORDER BY total_value DESC) as rank_num
    FROM inventory_value
),
abc_classification AS (
    SELECT
        *,
        (running_total / grand_total) * 100 as cumulative_percentage,
        CASE
            WHEN (running_total / grand_total) * 100 <= 80 THEN 'A'
            WHEN (running_total / grand_total) * 100 <= 95 THEN 'B'
            ELSE 'C'
        END as abc_class
    FROM ranked_inventory
)
SELECT
    abc_class,
    COUNT(*) as item_count,
    SUM(total_value) as class_value,
    ROUND((SUM(total_value) / MAX(grand_total)) * 100, 2) as percentage_of_total
FROM abc_classification
GROUP BY abc_class
ORDER BY abc_class;
```

### 4. Stock Turnover Analysis

```sql
WITH stock_movements_90d AS (
    SELECT
        sm.inventory_item_id,
        SUM(ABS(sm.quantity_change)) FILTER (WHERE sm.movement_type = 'sale_shipment') as sold_quantity,
        AVG(i.quantity_on_hand) as avg_stock_level
    FROM stock_movement sm
    JOIN inventory_item i ON sm.inventory_item_id = i.id
    WHERE sm.org_id = $1
    AND sm.movement_date >= CURRENT_DATE - INTERVAL '90 days'
    AND sm.movement_type = 'sale_shipment'
    GROUP BY sm.inventory_item_id
)
SELECT
    i.sku,
    i.name,
    sm.sold_quantity,
    sm.avg_stock_level,
    CASE
        WHEN sm.avg_stock_level > 0 THEN ROUND((sm.sold_quantity / sm.avg_stock_level) * 4, 2)
        ELSE 0
    END as annual_turnover_ratio,
    CASE
        WHEN sm.avg_stock_level > 0 AND sm.sold_quantity > 0 THEN ROUND(365 / ((sm.sold_quantity / sm.avg_stock_level) * 4), 0)
        ELSE NULL
    END as days_of_inventory
FROM inventory_item i
JOIN stock_movements_90d sm ON i.id = sm.inventory_item_id
WHERE i.org_id = $1
AND i.is_active = true
ORDER BY annual_turnover_ratio DESC;
```

### 5. Reorder Recommendations

```sql
WITH supplier_costs AS (
    SELECT DISTINCT ON (sp.inventory_item_id)
        sp.inventory_item_id,
        sp.supplier_id,
        s.name as supplier_name,
        sp.cost_price,
        sp.minimum_order_quantity,
        sp.lead_time_days
    FROM supplier_product sp
    JOIN supplier s ON sp.supplier_id = s.id
    WHERE sp.is_active = true
    AND s.status = 'active'
    ORDER BY sp.inventory_item_id, sp.is_preferred DESC, sp.cost_price ASC
)
SELECT
    i.sku,
    i.name,
    i.quantity_on_hand,
    i.reorder_point,
    i.max_stock_level,
    (i.reorder_point - i.quantity_on_hand) as quantity_needed,
    GREATEST(sc.minimum_order_quantity, i.reorder_point - i.quantity_on_hand) as recommended_order_qty,
    sc.supplier_name,
    sc.cost_price,
    sc.lead_time_days,
    (GREATEST(sc.minimum_order_quantity, i.reorder_point - i.quantity_on_hand) * sc.cost_price) as estimated_cost
FROM inventory_item i
LEFT JOIN supplier_costs sc ON i.id = sc.inventory_item_id
WHERE i.org_id = $1
AND i.is_active = true
AND i.quantity_on_hand <= i.reorder_point
ORDER BY quantity_needed DESC;
```

## Bulk Operations

### 1. Bulk Price Update

```sql
-- Update prices for specific category with audit trail
WITH price_updates AS (
    UPDATE inventory_item
    SET
        unit_price = unit_price * 1.05,  -- 5% increase
        updated_at = now()
    WHERE org_id = $1
    AND category = 'components'
    AND is_active = true
    RETURNING id, unit_price as new_price
)
INSERT INTO price_change_history (
    inventory_item_id,
    old_price,
    new_price,
    old_vat_rate,
    new_vat_rate,
    change_reason,
    change_percentage,
    changed_by
)
SELECT
    pu.id,
    pu.new_price / 1.05,  -- Calculate old price
    pu.new_price,
    15.00,
    15.00,
    'market_adjustment',
    5.00,
    $2  -- user_id
FROM price_updates pu;
```

### 2. Bulk Stock Adjustment

```sql
-- Perform cycle count adjustments
INSERT INTO stock_movement (
    org_id,
    inventory_item_id,
    movement_type,
    quantity_change,
    notes,
    created_by
)
SELECT
    $1,  -- org_id
    unnest($2::uuid[]),  -- inventory_item_ids
    'cycle_count',
    unnest($3::integer[]),  -- quantity_adjustments
    'Cycle count adjustment',
    $4  -- user_id
WHERE array_length($2::uuid[], 1) = array_length($3::integer[], 1);
```

### 3. XLSX Import Processing

```sql
-- Import from XLSX data with conflict resolution
INSERT INTO inventory_item (
    org_id,
    supplier_id,
    brand_id,
    sku,
    name,
    category,
    unit_price,
    default_vat_rate,
    quantity_on_hand
)
SELECT
    $1,  -- org_id
    s.id,
    b.id,
    xlsx.sku,
    xlsx.description,
    xlsx.category::inventory_category,
    xlsx.price,
    xlsx.vat_rate,
    xlsx.stock_qty
FROM (
    SELECT
        unnest($2::text[]) as supplier_name,
        unnest($3::text[]) as brand,
        unnest($4::text[]) as sku,
        unnest($5::text[]) as description,
        unnest($6::text[]) as category,
        unnest($7::numeric[]) as price,
        unnest($8::numeric[]) as vat_rate,
        unnest($9::integer[]) as stock_qty
) xlsx
LEFT JOIN supplier s ON s.name = xlsx.supplier_name AND s.org_id = $1
LEFT JOIN brand b ON b.name = xlsx.brand AND b.org_id = $1
ON CONFLICT (org_id, sku)
DO UPDATE SET
    unit_price = EXCLUDED.unit_price,
    quantity_on_hand = EXCLUDED.quantity_on_hand,
    updated_at = now();
```

## Performance Monitoring Queries

### 1. Index Usage Analysis

```sql
SELECT * FROM index_usage_stats
WHERE tablename IN ('inventory_item', 'supplier', 'stock_movement')
ORDER BY idx_scan DESC;
```

### 2. Table Size Monitoring

```sql
SELECT * FROM table_size_summary
ORDER BY total_size DESC;
```

### 3. Query Performance Analysis

```sql
-- Check slow queries related to inventory
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE query ILIKE '%inventory_item%'
OR query ILIKE '%supplier%'
OR query ILIKE '%stock_movement%'
ORDER BY mean_time DESC
LIMIT 10;
```

## API Integration Examples

### 1. REST API Endpoints

```typescript
// GET /api/inventory/items?org_id={uuid}&page=1&limit=50
// Returns paginated inventory items with XLSX fields

// GET /api/inventory/low-stock?org_id={uuid}
// Returns items below reorder point

// POST /api/inventory/movement
// Records stock movement with automatic level updates

// GET /api/suppliers/performance?org_id={uuid}
// Returns supplier performance dashboard data

// POST /api/inventory/bulk-import
// Processes XLSX file upload with validation
```

### 2. Real-time Notifications

```sql
-- Trigger function for low stock notifications
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity_on_hand <= NEW.reorder_point AND
       OLD.quantity_on_hand > OLD.reorder_point THEN

        INSERT INTO notification (
            org_id,
            type,
            title,
            message,
            metadata
        ) VALUES (
            NEW.org_id,
            'warning',
            'Low Stock Alert',
            'Item ' || NEW.name || ' (' || NEW.sku || ') is below reorder point',
            jsonb_build_object(
                'item_id', NEW.id,
                'current_qty', NEW.quantity_on_hand,
                'reorder_point', NEW.reorder_point
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER low_stock_notification_trigger
    AFTER UPDATE ON inventory_item
    FOR EACH ROW EXECUTE FUNCTION notify_low_stock();
```

This comprehensive set of examples provides a solid foundation for building applications on top of the Enhanced Inventory Management System, with proper performance optimization and business logic implementation.