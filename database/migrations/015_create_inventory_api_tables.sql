-- Migration 015: Materialize inventory_items and stock_movements tables for unified API
-- Ensures application routes can perform full CRUD operations against Neon

BEGIN;

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Replace compatibility views with writable tables
DROP VIEW IF EXISTS public.inventory_items;
DROP VIEW IF EXISTS public.stock_movements;

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    brand VARCHAR(100),
    supplier_id UUID REFERENCES core.supplier (supplier_id) ON DELETE SET NULL,
    supplier_sku VARCHAR(100),
    cost_price NUMERIC(15,4),
    sale_price NUMERIC(15,4),
    currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
    stock_qty INTEGER NOT NULL DEFAULT 0,
    reserved_qty INTEGER NOT NULL DEFAULT 0,
    available_qty INTEGER NOT NULL DEFAULT 0,
    reorder_point INTEGER NOT NULL DEFAULT 0,
    max_stock INTEGER,
    unit VARCHAR(50),
    weight NUMERIC(10,3),
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    barcode VARCHAR(100),
    location VARCHAR(100),
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_items_sku_unique UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_id ON public.inventory_items (supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items (status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items (category);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Seed inventory data from core schema on first run
INSERT INTO public.inventory_items (
    id,
    sku,
    name,
    description,
    category,
    supplier_id,
    supplier_sku,
    cost_price,
    sale_price,
    currency,
    stock_qty,
    reserved_qty,
    available_qty,
    reorder_point,
    unit,
    barcode,
    location,
    status,
    created_at,
    updated_at
)
SELECT
    soh.soh_id,
    COALESCE(NULLIF(sp.supplier_sku, ''), sp.name_from_supplier),
    COALESCE(sp.name_from_supplier, sp.supplier_sku),
    NULL,
    COALESCE(p.category_id::text, 'uncategorized'),
    sp.supplier_id,
    sp.supplier_sku,
    soh.unit_cost,
    NULL,
    'ZAR',
    soh.qty,
    0,
    soh.qty,
    10,
    sp.uom,
    sp.barcode,
    sl.name,
    CASE WHEN sp.is_active THEN 'active' ELSE 'inactive' END,
    COALESCE(soh.created_at, NOW()),
    COALESCE(soh.as_of_ts, NOW())
FROM core.stock_on_hand soh
JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
LEFT JOIN core.product p ON p.product_id = sp.product_id
LEFT JOIN core.stock_location sl ON sl.location_id = soh.location_id
WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items)
ON CONFLICT (id) DO NOTHING;

-- Dedicated stock movements table aligned with API contract
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory_items (id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (
      type IN ('in', 'out', 'inbound', 'outbound', 'transfer', 'adjustment', 'adjustment_in', 'adjustment_out')
    ),
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(15,4),
    reason TEXT,
    reference VARCHAR(255),
    location_from VARCHAR(100),
    location_to VARCHAR(100),
    created_by VARCHAR(255),
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON public.stock_movements (item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements (type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_timestamp ON public.stock_movements ("timestamp" DESC);

-- Backfill historic movements if data exists
INSERT INTO public.stock_movements (
    id,
    item_id,
    type,
    quantity,
    unit_cost,
    reason,
    reference,
    created_by,
    "timestamp",
    notes,
    metadata,
    created_at
)
SELECT
    sm.movement_id,
    ii.id,
    CASE
      WHEN sm.movement_type IN ('RECEIPT', 'INBOUND') THEN 'in'
      WHEN sm.movement_type IN ('SHIPMENT', 'OUTBOUND') THEN 'out'
      WHEN sm.movement_type = 'TRANSFER' THEN 'transfer'
      ELSE 'adjustment'
    END,
    sm.qty,
    NULL,
    sm.reference_doc,
    sm.reference_doc,
    sm.created_by,
    COALESCE(sm.movement_ts, NOW()),
    sm.notes,
    jsonb_build_object('source', 'core.stock_movement'),
    COALESCE(sm.created_at, sm.movement_ts, NOW())
FROM core.stock_movement sm
JOIN core.stock_on_hand soh
  ON soh.supplier_product_id = sm.supplier_product_id
 AND (soh.location_id = sm.location_id OR sm.location_id IS NULL)
JOIN public.inventory_items ii ON ii.id = soh.soh_id
WHERE NOT EXISTS (SELECT 1 FROM public.stock_movements)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE VIEW public.suppliers AS
SELECT
  supplier_id AS id,
  name,
  CASE
    WHEN active THEN 'active'::text
    ELSE 'inactive'::text
  END AS status,
  (contact_info ->> 'email')::varchar(255) AS email,
  (contact_info ->> 'phone')::varchar(50) AS phone,
  default_currency AS currency,
  payment_terms AS terms,
  contact_person,
  created_at,
  updated_at
FROM core.supplier;

COMMIT;
