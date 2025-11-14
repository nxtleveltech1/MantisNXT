-- Migration: 0214_sales_orders.sql
-- Description: Normalized sales orders and items tables for Woo inbound

BEGIN;

CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES integration_connector(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  order_number text,
  status text,
  currency text,
  total numeric(12,2),
  total_tax numeric(12,2),
  customer_id uuid,
  billing jsonb DEFAULT '{}',
  shipping jsonb DEFAULT '{}',
  payment_method text,
  created_at timestamptz,
  modified_at timestamptz,
  metadata jsonb DEFAULT '{}',
  UNIQUE (connector_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_org ON sales_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created ON sales_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_number ON sales_orders(order_number);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id uuid,
  product_external_id text,
  sku text,
  name text,
  quantity numeric(12,3) NOT NULL DEFAULT 0,
  price numeric(12,2),
  subtotal numeric(12,2),
  total numeric(12,2),
  tax numeric(12,2),
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_sku ON sales_order_items(sku);

COMMIT;
