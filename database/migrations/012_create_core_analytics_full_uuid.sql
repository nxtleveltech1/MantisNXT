-- Comprehensive analytics objects aligned to core (UUID-based where appropriate)
-- Date: 2025-10-29

BEGIN;

-- Ensure helper function exists
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'core' AND p.proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION core.update_updated_at_column()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $do$;

-- Purchase orders (UUID-based)
CREATE TABLE IF NOT EXISTS core.purchase_orders (
  purchase_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES core.supplier(supplier_id),
  po_number VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  total_amount NUMERIC(18,4) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'ZAR',
  notes TEXT,
  created_by VARCHAR(255),
  approved_by VARCHAR(255),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.purchase_order_items (
  purchase_order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES core.purchase_orders(purchase_order_id) ON DELETE CASCADE,
  supplier_product_id UUID REFERENCES core.supplier_product(supplier_product_id),
  item_sku VARCHAR(255),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(18,4) NOT NULL CHECK (unit_price >= 0),
  total_amount NUMERIC(18,4) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  delivery_date TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dashboard config
CREATE TABLE IF NOT EXISTS core.analytics_dashboard_config (
  organization_id INTEGER PRIMARY KEY DEFAULT 1,
  refresh_interval_ms INTEGER DEFAULT 30000,
  widgets JSONB DEFAULT '{}'::jsonb,
  alerts JSONB DEFAULT '{}'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON core.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_order_date ON core.purchase_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_po_status ON core.purchase_orders(status);

CREATE INDEX IF NOT EXISTS idx_poi_po_id ON core.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_supplier_product_id ON core.purchase_order_items(supplier_product_id);

CREATE INDEX IF NOT EXISTS idx_aa_org ON core.analytics_anomalies(organization_id);
CREATE INDEX IF NOT EXISTS idx_aa_detected ON core.analytics_anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_aa_severity ON core.analytics_anomalies(severity);

CREATE INDEX IF NOT EXISTS idx_ap_org ON core.analytics_predictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ap_created ON core.analytics_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ap_entity ON core.analytics_predictions(entity_type, entity_id);

-- Triggers
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON core.purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON core.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_order_items_updated_at ON core.purchase_order_items;
CREATE TRIGGER update_purchase_order_items_updated_at
  BEFORE UPDATE ON core.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

DROP TRIGGER IF EXISTS update_analytics_dashboard_config_updated_at ON core.analytics_dashboard_config;
CREATE TRIGGER update_analytics_dashboard_config_updated_at
  BEFORE UPDATE ON core.analytics_dashboard_config
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

COMMIT;

-- Validation
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema='core'
  AND table_name IN ('purchase_orders','purchase_order_items','analytics_dashboard_config');
