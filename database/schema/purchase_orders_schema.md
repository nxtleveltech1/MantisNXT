## Purchase Orders Schema Documentation

**ADR**: ADR-4 (Missing Table Creation)
**Migration**: 004
**Date**: 2025-10-09
**Author**: Data Oracle

---

### Overview

The purchase orders system manages procurement from suppliers, tracking orders from creation through fulfillment. It consists of two primary tables with complete audit trails and automated calculations.

---

### Tables

#### 1. `core.purchase_orders`

Master table for purchase order headers.

**Purpose**: Track purchase orders placed with suppliers for inventory procurement.

##### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `purchase_order_id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `order_number` | VARCHAR(50) | UNIQUE NOT NULL | Human-readable order number (auto-generated) |
| `supplier_id` | UUID | NOT NULL, FK → core.supplier | Supplier providing goods |
| `status` | purchase_order_status | NOT NULL, DEFAULT 'draft' | Order lifecycle status |
| `order_date` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When order was placed |
| `expected_delivery_date` | TIMESTAMPTZ | NULL | Estimated delivery date |
| `actual_delivery_date` | TIMESTAMPTZ | NULL | Actual receipt date |
| `subtotal_amount` | DECIMAL(18,4) | NOT NULL, DEFAULT 0, CHECK >= 0 | Subtotal before tax/shipping |
| `tax_amount` | DECIMAL(18,4) | NOT NULL, DEFAULT 0, CHECK >= 0 | Total tax amount |
| `shipping_amount` | DECIMAL(18,4) | NOT NULL, DEFAULT 0, CHECK >= 0 | Shipping/freight charges |
| `total_amount` | DECIMAL(18,4) | GENERATED ALWAYS STORED | Computed: subtotal + tax + shipping |
| `currency_code` | VARCHAR(3) | NOT NULL, DEFAULT 'USD', CHECK regex | ISO 4217 currency code |
| `shipping_address` | TEXT | NULL | Delivery address |
| `shipping_method` | VARCHAR(100) | NULL | Shipping method/carrier |
| `tracking_number` | VARCHAR(100) | NULL | Shipment tracking number |
| `notes` | TEXT | NULL | General notes |
| `internal_notes` | TEXT | NULL | Internal team notes (not shared) |
| `terms_and_conditions` | TEXT | NULL | Agreement terms |
| `metadata` | JSONB | DEFAULT '{}' | Flexible additional data |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time (auto-managed) |
| `created_by` | VARCHAR(255) | NULL | User who created order |
| `updated_by` | VARCHAR(255) | NULL | Last user to update order |

##### Enums

```sql
CREATE TYPE core.purchase_order_status AS ENUM (
  'draft',        -- Order being prepared
  'pending',      -- Awaiting supplier confirmation
  'confirmed',    -- Supplier confirmed
  'shipped',      -- Goods in transit
  'received',     -- Goods received (partial or complete)
  'completed',    -- Order fully received and closed
  'cancelled'     -- Order cancelled
);
```

##### Constraints

- `po_delivery_date_after_order`: expected_delivery_date >= order_date
- `po_actual_delivery_after_order`: actual_delivery_date >= order_date
- `po_completed_requires_delivery`: If status = 'completed', actual_delivery_date must be set
- `po_currency_code_format`: currency_code must match `^[A-Z]{3}$`

##### Indexes

| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| `idx_purchase_orders_supplier` | BTREE | supplier_id | Supplier order lookup |
| `idx_purchase_orders_status` | BTREE | status | Filter by status |
| `idx_purchase_orders_order_date` | BTREE | order_date DESC | Chronological ordering |
| `idx_purchase_orders_expected_delivery` | BTREE | expected_delivery_date | Delivery date filtering (partial, WHERE NOT NULL) |
| `idx_purchase_orders_number` | BTREE | order_number | Order number lookup |
| `idx_purchase_orders_active` | BTREE | supplier_id, status, order_date DESC | Active orders (partial, WHERE status NOT IN ('completed', 'cancelled')) |
| `idx_purchase_orders_supplier_history` | BTREE (INCLUDE) | supplier_id, order_date DESC INCLUDE (order_number, status, total_amount) | Supplier history with order details |
| `idx_purchase_orders_metadata` | GIN | metadata | JSONB query performance |

##### Triggers

1. **purchase_orders_update_timestamp**
   - **Event**: BEFORE UPDATE
   - **Function**: `core.update_purchase_order_timestamp()`
   - **Purpose**: Auto-update `updated_at` on every modification

##### Helper Functions

1. **`core.generate_po_number(p_prefix VARCHAR DEFAULT 'PO')`**
   - Returns unique order number in format: `PO-YYYYMM-NNNN`
   - Example: `PO-202510-0001`
   - Auto-increments sequence per month

2. **`core.get_purchase_order_summary(p_purchase_order_id UUID)`**
   - Returns comprehensive order summary
   - Includes item counts, quantities, completion percentage
   - Useful for order status dashboards

---

#### 2. `core.purchase_order_items`

Line items for purchase orders with receiving tracking.

**Purpose**: Detail individual products ordered and track receipt quantities.

##### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `po_item_id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `purchase_order_id` | UUID | NOT NULL, FK → core.purchase_orders ON DELETE CASCADE | Parent purchase order |
| `supplier_product_id` | UUID | NOT NULL, FK → core.supplier_product ON DELETE RESTRICT | Product being ordered |
| `line_number` | INTEGER | NOT NULL | Line sequence number |
| `quantity` | NUMERIC(18,4) | NOT NULL, CHECK > 0 | Quantity ordered |
| `uom` | VARCHAR(50) | NOT NULL, DEFAULT 'EA' | Unit of measure |
| `unit_price` | DECIMAL(18,4) | NOT NULL, CHECK >= 0 | Price per unit |
| `discount_percent` | DECIMAL(5,2) | DEFAULT 0, CHECK 0-100 | Discount percentage |
| `discount_amount` | DECIMAL(18,4) | DEFAULT 0, CHECK >= 0 | Discount in currency |
| `line_total` | DECIMAL(18,4) | GENERATED ALWAYS STORED | Computed: (quantity * unit_price) - discount_amount |
| `quantity_received` | NUMERIC(18,4) | NOT NULL, DEFAULT 0, CHECK >= 0 | Quantity received so far |
| `quantity_pending` | NUMERIC(18,4) | GENERATED ALWAYS STORED | Computed: quantity - quantity_received |
| `notes` | TEXT | NULL | Line item notes |
| `metadata` | JSONB | DEFAULT '{}' | Flexible additional data |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time (auto-managed) |

##### Constraints

- `poi_received_not_exceed_ordered`: quantity_received <= quantity
- `poi_unique_line_per_order`: UNIQUE (purchase_order_id, line_number)
- `poi_unique_product_per_order`: UNIQUE (purchase_order_id, supplier_product_id)

##### Indexes

| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| `idx_po_items_purchase_order` | BTREE | purchase_order_id | Items for specific order |
| `idx_po_items_supplier_product` | BTREE | supplier_product_id | Product order history |
| `idx_po_items_pending` | BTREE | purchase_order_id, supplier_product_id | Pending receipt items (partial, WHERE quantity_received < quantity) |
| `idx_po_items_metadata` | GIN | metadata | JSONB query performance |

##### Triggers

1. **po_items_update_timestamp**
   - **Event**: BEFORE UPDATE
   - **Function**: `core.update_po_item_timestamp()`
   - **Purpose**: Auto-update `updated_at` on every modification

2. **po_items_update_totals**
   - **Event**: AFTER INSERT OR UPDATE OR DELETE
   - **Function**: `core.update_purchase_order_totals()`
   - **Purpose**: Auto-recalculate parent order subtotal when items change

3. **po_items_check_completion**
   - **Event**: AFTER UPDATE (when quantity_received changes)
   - **Function**: `core.check_purchase_order_completion()`
   - **Purpose**: Auto-update order status to 'received' when all items fully received

---

### Relationships

```
core.supplier
    ↓ (1:N)
core.purchase_orders
    ↓ (1:N)
core.purchase_order_items
    ↓ (N:1)
core.supplier_product
    ↓ (N:1)
core.product
```

### Foreign Keys

| From Table | Column | References | On Delete |
|------------|--------|------------|-----------|
| purchase_orders | supplier_id | core.supplier(supplier_id) | RESTRICT |
| purchase_order_items | purchase_order_id | core.purchase_orders(purchase_order_id) | CASCADE |
| purchase_order_items | supplier_product_id | core.supplier_product(supplier_product_id) | RESTRICT |

---

### Business Logic

#### Order Lifecycle

```
draft → pending → confirmed → shipped → received → completed
                                     ↓
                                  cancelled
```

1. **Draft**: Initial state, order can be modified freely
2. **Pending**: Submitted to supplier, awaiting confirmation
3. **Confirmed**: Supplier confirmed order
4. **Shipped**: Goods in transit
5. **Received**: All items received (auto-set when quantity_received = quantity for all items)
6. **Completed**: Order closed, no further changes
7. **Cancelled**: Order cancelled (terminal state)

#### Automated Calculations

1. **Line Total**: Automatically computed as `(quantity * unit_price) - discount_amount`
2. **Order Total**: Automatically computed as `subtotal + tax + shipping`
3. **Quantity Pending**: Automatically computed as `quantity - quantity_received`
4. **Status Auto-Update**: When all items fully received, status automatically becomes 'received'

#### Receiving Process

1. Create purchase order with items
2. Supplier ships goods
3. Update `quantity_received` on items as goods arrive
4. When `quantity_received = quantity` for all items, order auto-updates to 'received'
5. Manually close order with status 'completed'

---

### Usage Examples

#### Create Purchase Order

```sql
-- Generate PO number
SELECT core.generate_po_number() AS po_number; -- Returns: PO-202510-0001

-- Create order
INSERT INTO core.purchase_orders (
  order_number, supplier_id, status, order_date, expected_delivery_date
) VALUES (
  'PO-202510-0001',
  '123e4567-e89b-12d3-a456-426614174000',
  'pending',
  NOW(),
  NOW() + INTERVAL '7 days'
) RETURNING purchase_order_id;

-- Add line items
INSERT INTO core.purchase_order_items (
  purchase_order_id, supplier_product_id, line_number, quantity, unit_price
) VALUES
  ('po-uuid-here', 'sp-uuid-1', 1, 100, 25.50),
  ('po-uuid-here', 'sp-uuid-2', 2, 50, 15.00);

-- Subtotal is automatically calculated
```

#### Receive Goods

```sql
-- Partial receipt
UPDATE core.purchase_order_items
SET quantity_received = 50
WHERE po_item_id = 'item-uuid-here';

-- Full receipt (triggers auto-completion)
UPDATE core.purchase_order_items
SET quantity_received = quantity
WHERE purchase_order_id = 'po-uuid-here';

-- Order status automatically becomes 'received'
```

#### Query Order Summary

```sql
SELECT * FROM core.get_purchase_order_summary('po-uuid-here');
```

Returns:
```
order_number | supplier_name | status | total_items | total_quantity | total_received | completion_percent | total_amount
```

#### Find Pending Orders

```sql
SELECT
  po.order_number,
  s.name AS supplier,
  po.order_date,
  po.expected_delivery_date,
  po.total_amount
FROM core.purchase_orders po
JOIN core.supplier s ON s.supplier_id = po.supplier_id
WHERE po.status NOT IN ('completed', 'cancelled')
ORDER BY po.expected_delivery_date;
```

#### Track Overdue Deliveries

```sql
SELECT
  po.order_number,
  s.name AS supplier,
  po.expected_delivery_date,
  NOW() - po.expected_delivery_date AS days_overdue
FROM core.purchase_orders po
JOIN core.supplier s ON s.supplier_id = po.supplier_id
WHERE po.status IN ('confirmed', 'shipped')
  AND po.expected_delivery_date < NOW()
ORDER BY po.expected_delivery_date;
```

---

### Performance Considerations

1. **Indexes**: All foreign keys and frequently queried columns are indexed
2. **Partial Indexes**: Active orders and pending items use partial indexes to reduce size
3. **Computed Columns**: `total_amount`, `line_total`, `quantity_pending` are GENERATED ALWAYS STORED for fast queries
4. **Trigger Efficiency**: Triggers use targeted queries (WHERE clauses) to minimize overhead

---

### Security & Audit

1. **Audit Trail**: `created_at`, `updated_at`, `created_by`, `updated_by` track all changes
2. **Soft Delete**: Status 'cancelled' preferred over DELETE to preserve history
3. **Referential Integrity**: ON DELETE RESTRICT prevents accidental data loss
4. **Validation**: CHECK constraints enforce business rules at database level

---

### Migration & Rollback

**Migration File**: `database/migrations/004_create_purchase_orders.sql`
**Rollback File**: `database/migrations/004_rollback.sql`

Rollback is safe and complete, removing all tables, functions, triggers, and types without leaving orphaned objects.

---

### Replication

This table is included in the logical replication publication `mantisnxt_core_replication` for disaster recovery to Postgres OLD.

**Included in publication**: ✓ Yes
**Replication mode**: INSERT, UPDATE, DELETE
**Lag target**: <5 seconds

---

### Future Enhancements

Potential future additions:

1. **Approval Workflow**: Multi-level approval for large orders
2. **Budget Integration**: Link to budget tracking system
3. **Contract Management**: Link orders to supplier contracts
4. **Partial Shipping**: Track multiple shipments per order
5. **Quality Inspection**: Track inspection status on receipt
6. **Return Management**: Handle returns to supplier

---

**End of Schema Documentation**
