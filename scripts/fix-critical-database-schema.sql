-- Critical Database Schema Fixes for MantisNXT Production
-- This script adds missing columns and tables to resolve API errors

-- Fix missing columns in suppliers table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='current_stock') THEN
    ALTER TABLE suppliers ADD COLUMN current_stock integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='overall_rating') THEN
    ALTER TABLE suppliers ADD COLUMN overall_rating numeric(3,2) DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='evaluation_date') THEN
    ALTER TABLE suppliers ADD COLUMN evaluation_date timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='timestamp') THEN
    ALTER TABLE suppliers ADD COLUMN timestamp timestamptz DEFAULT now();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='tier') THEN
    ALTER TABLE suppliers ADD COLUMN tier varchar(20) DEFAULT 'bronze';
  END IF;
END $$;

-- Create missing supplier_price_lists table
CREATE TABLE IF NOT EXISTS supplier_price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  currency varchar(10) DEFAULT 'USD',
  effective_from timestamptz DEFAULT now(),
  effective_to timestamptz,
  status varchar(20) DEFAULT 'active',
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create price list items table
CREATE TABLE IF NOT EXISTS supplier_price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES supplier_price_lists(id) ON DELETE CASCADE,
  sku varchar(100) NOT NULL,
  supplier_sku varchar(100),
  unit_price numeric(15,2) NOT NULL,
  minimum_quantity integer DEFAULT 1,
  maximum_quantity integer,
  lead_time_days integer DEFAULT 7,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create analytics_recommendations table for recommendations API
CREATE TABLE IF NOT EXISTS analytics_recommendations (
  id varchar(255) PRIMARY KEY,
  type varchar(50) NOT NULL,
  priority varchar(20) NOT NULL,
  title varchar(500) NOT NULL,
  description text NOT NULL,
  expected_impact varchar(500),
  confidence numeric(3,2) DEFAULT 0.5,
  timeframe varchar(100),
  category varchar(50),
  target_entity jsonb,
  metrics jsonb,
  actions jsonb,
  organization_id varchar(50) DEFAULT '1',
  status varchar(20) DEFAULT 'active',
  accepted_by varchar(100),
  accepted_at timestamptz,
  rejected_by varchar(100),
  rejected_at timestamptz,
  implemented_by varchar(100),
  implemented_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Create stock_movements table for inventory tracking
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL CHECK (type IN ('inbound', 'outbound', 'adjustment', 'transfer')),
  quantity integer NOT NULL,
  unit_cost numeric(15,2),
  reference_type varchar(50),
  reference_id varchar(100),
  notes text,
  timestamp timestamptz DEFAULT now(),
  created_by varchar(100),
  organization_id varchar(50) DEFAULT '1'
);

-- Create purchase_orders table for process analysis
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number varchar(100) NOT NULL UNIQUE,
  supplier_id uuid REFERENCES suppliers(id),
  status varchar(20) DEFAULT 'draft',
  total_amount numeric(15,2) DEFAULT 0,
  currency varchar(10) DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  organization_id varchar(50) DEFAULT '1'
);

-- Add missing columns to inventory_items if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='current_stock') THEN
    ALTER TABLE inventory_items ADD COLUMN current_stock integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='reorder_point') THEN
    ALTER TABLE inventory_items ADD COLUMN reorder_point integer DEFAULT 10;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='max_stock') THEN
    ALTER TABLE inventory_items ADD COLUMN max_stock integer DEFAULT 100;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='organization_id') THEN
    ALTER TABLE inventory_items ADD COLUMN organization_id varchar(50) DEFAULT '1';
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON suppliers(performance_tier, status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_organization_id ON inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_timestamp ON stock_movements(item_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_recommendations_org_priority ON analytics_recommendations(organization_id, priority, status);

-- Update existing inventory_items with current_stock from stock_qty
UPDATE inventory_items SET current_stock = stock_qty WHERE current_stock = 0 OR current_stock IS NULL;

COMMIT;