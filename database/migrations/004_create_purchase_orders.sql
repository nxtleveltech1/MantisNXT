-- ============================================================================
-- MantisNXT Database Migration - Purchase Orders Table Creation
-- ============================================================================
-- Migration: 004
-- ADR: ADR-4 (Missing Table Creation)
-- Description: Create purchase_orders table with complete relationships
-- Author: Data Oracle
-- Date: 2025-10-09
-- Target: Neon Primary Database
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CREATE PURCHASE ORDER STATUS ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE core.purchase_order_status AS ENUM (
    'draft',        -- Order being prepared
    'pending',      -- Awaiting supplier confirmation
    'confirmed',    -- Supplier confirmed
    'shipped',      -- Goods in transit
    'received',     -- Goods received (partial or complete)
    'completed',    -- Order fully received and closed
    'cancelled'     -- Order cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE core.purchase_order_status IS 'Purchase order lifecycle status values';

-- ============================================================================
-- SECTION 2: CREATE PURCHASE_ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.purchase_orders (
  -- Primary key
  purchase_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order identification
  order_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES core.supplier(supplier_id) ON DELETE RESTRICT,

  -- Order status and dates
  status core.purchase_order_status NOT NULL DEFAULT 'draft',
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,

  -- Financial details
  subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  tax_amount DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_amount DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  total_amount DECIMAL(18,4) GENERATED ALWAYS AS (subtotal_amount + tax_amount + shipping_amount) STORED,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Shipping information
  shipping_address TEXT,
  shipping_method VARCHAR(100),
  tracking_number VARCHAR(100),

  -- Additional information
  notes TEXT,
  internal_notes TEXT,
  terms_and_conditions TEXT,

  -- Metadata and audit
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255),

  -- Business logic constraints
  CONSTRAINT po_delivery_date_after_order CHECK (
    expected_delivery_date IS NULL OR expected_delivery_date >= order_date
  ),
  CONSTRAINT po_actual_delivery_after_order CHECK (
    actual_delivery_date IS NULL OR actual_delivery_date >= order_date
  ),
  CONSTRAINT po_completed_requires_delivery CHECK (
    status != 'completed' OR actual_delivery_date IS NOT NULL
  ),
  CONSTRAINT po_currency_code_format CHECK (
    currency_code ~ '^[A-Z]{3}$'
  )
);

-- ============================================================================
-- SECTION 3: CREATE PURCHASE_ORDER_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.purchase_order_items (
  -- Primary key
  po_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  purchase_order_id UUID NOT NULL REFERENCES core.purchase_orders(purchase_order_id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE RESTRICT,

  -- Item details
  line_number INTEGER NOT NULL,
  quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  uom VARCHAR(50) NOT NULL DEFAULT 'EA',

  -- Pricing
  unit_price DECIMAL(18,4) NOT NULL CHECK (unit_price >= 0),
  discount_percent DECIMAL(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount DECIMAL(18,4) DEFAULT 0 CHECK (discount_amount >= 0),
  line_total DECIMAL(18,4) GENERATED ALWAYS AS (
    (quantity * unit_price) - discount_amount
  ) STORED,

  -- Receiving tracking
  quantity_received NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  quantity_pending NUMERIC(18,4) GENERATED ALWAYS AS (quantity - quantity_received) STORED,

  -- Item status
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT poi_received_not_exceed_ordered CHECK (quantity_received <= quantity),
  CONSTRAINT poi_unique_line_per_order UNIQUE (purchase_order_id, line_number),
  CONSTRAINT poi_unique_product_per_order UNIQUE (purchase_order_id, supplier_product_id)
);

-- ============================================================================
-- SECTION 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Purchase Orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier
  ON core.purchase_orders(supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON core.purchase_orders(status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date
  ON core.purchase_orders(order_date DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_delivery
  ON core.purchase_orders(expected_delivery_date)
  WHERE expected_delivery_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_number
  ON core.purchase_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_active
  ON core.purchase_orders(supplier_id, status, order_date DESC)
  WHERE status NOT IN ('completed', 'cancelled');

-- Composite index for supplier order history
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_history
  ON core.purchase_orders(supplier_id, order_date DESC)
  INCLUDE (order_number, status, total_amount);

-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_metadata
  ON core.purchase_orders USING gin(metadata);

-- Purchase Order Items indexes
CREATE INDEX IF NOT EXISTS idx_po_items_purchase_order
  ON core.purchase_order_items(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_po_items_supplier_product
  ON core.purchase_order_items(supplier_product_id);

CREATE INDEX IF NOT EXISTS idx_po_items_pending
  ON core.purchase_order_items(purchase_order_id, supplier_product_id)
  WHERE quantity_received < quantity;

-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_po_items_metadata
  ON core.purchase_order_items USING gin(metadata);

-- ============================================================================
-- SECTION 5: CREATE TRIGGERS FOR AUTOMATED UPDATES
-- ============================================================================

-- Trigger to update updated_at timestamp on purchase_orders
CREATE OR REPLACE FUNCTION core.update_purchase_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS purchase_orders_update_timestamp ON core.purchase_orders;
CREATE TRIGGER purchase_orders_update_timestamp
BEFORE UPDATE ON core.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION core.update_purchase_order_timestamp();

-- Trigger to update updated_at timestamp on purchase_order_items
CREATE OR REPLACE FUNCTION core.update_po_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS po_items_update_timestamp ON core.purchase_order_items;
CREATE TRIGGER po_items_update_timestamp
BEFORE UPDATE ON core.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION core.update_po_item_timestamp();

-- Trigger to update purchase order totals when items change
CREATE OR REPLACE FUNCTION core.update_purchase_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_new_subtotal DECIMAL(18,4);
BEGIN
  -- Calculate new subtotal from all items
  SELECT COALESCE(SUM(line_total), 0)
  INTO v_new_subtotal
  FROM core.purchase_order_items
  WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

  -- Update purchase order subtotal
  UPDATE core.purchase_orders
  SET subtotal_amount = v_new_subtotal
  WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS po_items_update_totals ON core.purchase_order_items;
CREATE TRIGGER po_items_update_totals
AFTER INSERT OR UPDATE OR DELETE ON core.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION core.update_purchase_order_totals();

-- Trigger to auto-complete purchase orders when fully received
CREATE OR REPLACE FUNCTION core.check_purchase_order_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_all_received BOOLEAN;
  v_has_items BOOLEAN;
BEGIN
  -- Check if order has items
  SELECT EXISTS(
    SELECT 1 FROM core.purchase_order_items
    WHERE purchase_order_id = NEW.purchase_order_id
  ) INTO v_has_items;

  -- Only process if order has items
  IF v_has_items THEN
    -- Check if all items are fully received
    SELECT NOT EXISTS(
      SELECT 1 FROM core.purchase_order_items
      WHERE purchase_order_id = NEW.purchase_order_id
      AND quantity_received < quantity
    ) INTO v_all_received;

    -- Update order status if all received
    IF v_all_received THEN
      UPDATE core.purchase_orders
      SET
        status = 'received',
        actual_delivery_date = COALESCE(actual_delivery_date, NOW())
      WHERE purchase_order_id = NEW.purchase_order_id
        AND status NOT IN ('completed', 'cancelled');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS po_items_check_completion ON core.purchase_order_items;
CREATE TRIGGER po_items_check_completion
AFTER UPDATE ON core.purchase_order_items
FOR EACH ROW
WHEN (NEW.quantity_received <> OLD.quantity_received)
EXECUTE FUNCTION core.check_purchase_order_completion();

-- ============================================================================
-- SECTION 6: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to generate next purchase order number
CREATE OR REPLACE FUNCTION core.generate_po_number(
  p_prefix VARCHAR(10) DEFAULT 'PO'
)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year VARCHAR(4);
  v_month VARCHAR(2);
  v_sequence INTEGER;
  v_po_number VARCHAR(50);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_month := TO_CHAR(NOW(), 'MM');

  -- Get next sequence number for current month
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(order_number FROM LENGTH(p_prefix || '-' || v_year || v_month || '-') + 1)
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM core.purchase_orders
  WHERE order_number LIKE p_prefix || '-' || v_year || v_month || '-%';

  -- Format: PO-YYYYMM-NNNN
  v_po_number := p_prefix || '-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_po_number;
END;
$$ LANGUAGE plpgsql;

-- Function to check purchase order status
CREATE OR REPLACE FUNCTION core.get_purchase_order_summary(
  p_purchase_order_id UUID
)
RETURNS TABLE (
  order_number VARCHAR(50),
  supplier_name VARCHAR(255),
  status core.purchase_order_status,
  total_items BIGINT,
  total_quantity NUMERIC,
  total_received NUMERIC,
  total_pending NUMERIC,
  completion_percent NUMERIC,
  total_amount DECIMAL(18,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    po.order_number,
    s.name AS supplier_name,
    po.status,
    COUNT(poi.po_item_id) AS total_items,
    COALESCE(SUM(poi.quantity), 0) AS total_quantity,
    COALESCE(SUM(poi.quantity_received), 0) AS total_received,
    COALESCE(SUM(poi.quantity - poi.quantity_received), 0) AS total_pending,
    CASE
      WHEN COALESCE(SUM(poi.quantity), 0) = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(poi.quantity_received), 0) / SUM(poi.quantity)) * 100, 2)
    END AS completion_percent,
    po.total_amount
  FROM core.purchase_orders po
  LEFT JOIN core.supplier s ON s.supplier_id = po.supplier_id
  LEFT JOIN core.purchase_order_items poi ON poi.purchase_order_id = po.purchase_order_id
  WHERE po.purchase_order_id = p_purchase_order_id
  GROUP BY po.purchase_order_id, po.order_number, s.name, po.status, po.total_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 7: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

-- Table comments
COMMENT ON TABLE core.purchase_orders IS 'Purchase orders from suppliers for inventory procurement';
COMMENT ON TABLE core.purchase_order_items IS 'Line items for purchase orders with receiving tracking';

-- Column comments - purchase_orders
COMMENT ON COLUMN core.purchase_orders.order_number IS 'Unique purchase order number (auto-generated)';
COMMENT ON COLUMN core.purchase_orders.status IS 'Current status of purchase order';
COMMENT ON COLUMN core.purchase_orders.total_amount IS 'Total order amount including tax and shipping (computed)';
COMMENT ON COLUMN core.purchase_orders.expected_delivery_date IS 'Expected delivery date from supplier';
COMMENT ON COLUMN core.purchase_orders.actual_delivery_date IS 'Actual delivery date (set when received)';

-- Column comments - purchase_order_items
COMMENT ON COLUMN core.purchase_order_items.quantity IS 'Ordered quantity';
COMMENT ON COLUMN core.purchase_order_items.quantity_received IS 'Quantity received so far';
COMMENT ON COLUMN core.purchase_order_items.quantity_pending IS 'Quantity still pending receipt (computed)';
COMMENT ON COLUMN core.purchase_order_items.line_total IS 'Line item total after discounts (computed)';

-- ============================================================================
-- SECTION 8: VALIDATION QUERIES
-- ============================================================================

DO $$
DECLARE
  v_po_table_exists BOOLEAN;
  v_po_items_table_exists BOOLEAN;
  v_index_count INTEGER;
  v_trigger_count INTEGER;
BEGIN
  -- Verify tables created
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'purchase_orders'
  ) INTO v_po_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'purchase_order_items'
  ) INTO v_po_items_table_exists;

  -- Count indexes created
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'core'
  AND (tablename = 'purchase_orders' OR tablename = 'purchase_order_items');

  -- Count triggers created
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'core'
  AND c.relname IN ('purchase_orders', 'purchase_order_items')
  AND NOT t.tgisinternal;

  RAISE NOTICE 'Purchase Orders table exists: %', v_po_table_exists;
  RAISE NOTICE 'Purchase Order Items table exists: %', v_po_items_table_exists;
  RAISE NOTICE 'Indexes created: %', v_index_count;
  RAISE NOTICE 'Triggers created: %', v_trigger_count;

  IF NOT v_po_table_exists OR NOT v_po_items_table_exists THEN
    RAISE EXCEPTION 'Critical tables not created!';
  END IF;

  IF v_index_count < 10 THEN
    RAISE WARNING 'Expected more indexes. Created: %', v_index_count;
  END IF;

  IF v_trigger_count < 4 THEN
    RAISE WARNING 'Expected at least 4 triggers. Created: %', v_trigger_count;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Test purchase order number generation
SELECT core.generate_po_number() as sample_po_number;

-- Verify foreign key relationships
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'core'
AND rel.relname IN ('purchase_orders', 'purchase_order_items')
AND con.contype = 'f'
ORDER BY rel.relname, con.conname;

-- ============================================================================
-- END OF MIGRATION 004
-- ============================================================================
