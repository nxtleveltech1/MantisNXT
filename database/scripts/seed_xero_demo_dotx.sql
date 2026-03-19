-- Seed: Xero Demo data for NXT DOTX organization
-- Run: psql "$DATABASE_URL" -f database/scripts/seed_xero_demo_dotx.sql
-- Prereq: NXT DOTX org exists (e.g. from add-nxt-dotx-org or migration 0265)

\set ON_ERROR_STOP on
BEGIN;

-- Org (id from migration 0265 / add-nxt-dotx-org)
INSERT INTO organization (id, name, slug, plan_type, is_active)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'NXT DOTX',
  'nxt-dotx',
  'starter',
  true
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, is_active = EXCLUDED.is_active, updated_at = NOW();

-- Suppliers (2)
INSERT INTO supplier (id, org_id, name, contact_email, contact_phone, status)
VALUES
  ('dddd1111-bbbb-bbbb-bbbb-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Demo Supplies Co', 'supplies@demodotx.com', '+27-11-555-0200', 'active'),
  ('dddd2222-bbbb-bbbb-bbbb-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Office Goods Ltd', 'orders@officegoodsltd.co.za', '+27-11-555-0201', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, contact_email = EXCLUDED.contact_email, status = EXCLUDED.status, updated_at = NOW();

-- Customers (3)
INSERT INTO customer (id, org_id, name, email, company, segment, status, lifetime_value)
VALUES
  ('dddd3111-bbbb-bbbb-bbbb-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Acme Trading (Pty) Ltd', 'accounts@acmetrading.co.za', 'Acme Trading (Pty) Ltd', 'smb', 'active', 75000.00),
  ('dddd3222-bbbb-bbbb-bbbb-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beta Industries', 'finance@betaindustries.com', 'Beta Industries', 'mid_market', 'active', 120000.00),
  ('dddd3333-bbbb-bbbb-bbbb-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Gamma Retail', 'ap@gammaretail.co.za', 'Gamma Retail', 'smb', 'active', 25000.00)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, company = EXCLUDED.company, status = EXCLUDED.status, updated_at = NOW();

-- Products: inventory_item (org_id, sku, name, etc.) – skip if table has no org_id (e.g. 0200-only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_item' AND column_name = 'org_id'
  ) THEN
    INSERT INTO inventory_item (id, org_id, sku, name, description, category, unit_price, quantity_on_hand, reorder_point, max_stock_level, supplier_id, location)
    VALUES
      ('dddd4111-bbbb-bbbb-bbbb-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'DOTX-SVC-001', 'Consulting Day Rate', 'Professional services per day', 'services', 2500.00, 0, 0, NULL, 'dddd1111-bbbb-bbbb-bbbb-111111111111', 'N/A'),
      ('dddd4222-bbbb-bbbb-bbbb-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'DOTX-SVC-002', 'Support Retainer', 'Monthly support retainer', 'services', 5000.00, 0, 0, NULL, 'dddd1111-bbbb-bbbb-bbbb-111111111111', 'N/A'),
      ('dddd4333-bbbb-bbbb-bbbb-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'DOTX-OFF-001', 'Desk Kit', 'Desk stationery kit', 'consumables', 350.00, 100, 20, 200, 'dddd2222-bbbb-bbbb-bbbb-222222222222', 'Warehouse-1')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, unit_price = EXCLUDED.unit_price, updated_at = NOW();
  END IF;
END $$;

-- AR Customer Invoices (2) with line items
INSERT INTO ar_customer_invoices (
  id, org_id, customer_id, invoice_number, invoice_date, due_date,
  subtotal, tax_amount, total_amount, paid_amount, status, source_type, currency
)
VALUES
  ('dddd5111-bbbb-bbbb-bbbb-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddd3111-bbbb-bbbb-bbbb-111111111111', 'DOTX-AR-001', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 25000.00, 3750.00, 28750.00, 0, 'sent', 'direct_ar', 'ZAR'),
  ('dddd5222-bbbb-bbbb-bbbb-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddd3222-bbbb-bbbb-bbbb-222222222222', 'DOTX-AR-002', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '16 days', 10000.00, 1500.00, 11500.00, 0, 'sent', 'direct_ar', 'ZAR')
ON CONFLICT (id) DO UPDATE SET subtotal = EXCLUDED.subtotal, tax_amount = EXCLUDED.tax_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status, updated_at = NOW();

INSERT INTO ar_invoice_line_items (ar_invoice_id, description, quantity, unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total, line_number)
SELECT 'dddd5111-bbbb-bbbb-bbbb-111111111111', 'Consulting Day Rate', 10, 2500.00, 0, 0, 0.15, 3750.00, 28750.00, 1
WHERE NOT EXISTS (SELECT 1 FROM ar_invoice_line_items WHERE ar_invoice_id = 'dddd5111-bbbb-bbbb-bbbb-111111111111' AND line_number = 1);

INSERT INTO ar_invoice_line_items (ar_invoice_id, description, quantity, unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total, line_number)
SELECT 'dddd5222-bbbb-bbbb-bbbb-222222222222', 'Support Retainer', 2, 5000.00, 0, 0, 0.15, 1500.00, 11500.00, 1
WHERE NOT EXISTS (SELECT 1 FROM ar_invoice_line_items WHERE ar_invoice_id = 'dddd5222-bbbb-bbbb-bbbb-222222222222' AND line_number = 1);

-- AP Vendor Invoice (1) with line items
INSERT INTO ap_vendor_invoices (
  id, org_id, vendor_id, invoice_number, vendor_invoice_number,
  invoice_date, due_date, subtotal, tax_amount, total_amount, paid_amount, status
)
VALUES (
  'dddd6111-bbbb-bbbb-bbbb-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'dddd2222-bbbb-bbbb-bbbb-222222222222',
  'DOTX-AP-001',
  'OG-V-2025-001',
  CURRENT_DATE - INTERVAL '20 days',
  CURRENT_DATE + INTERVAL '10 days',
  10500.00,
  1575.00,
  12075.00,
  0,
  'approved'
)
ON CONFLICT (id) DO UPDATE SET subtotal = EXCLUDED.subtotal, tax_amount = EXCLUDED.tax_amount, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status, updated_at = NOW();

INSERT INTO ap_invoice_line_items (ap_invoice_id, description, quantity, unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total, line_number)
SELECT 'dddd6111-bbbb-bbbb-bbbb-111111111111', 'Desk Kit', 30, 350.00, 0, 0, 0.15, 1575.00, 12075.00, 1
WHERE NOT EXISTS (SELECT 1 FROM ap_invoice_line_items WHERE ap_invoice_id = 'dddd6111-bbbb-bbbb-bbbb-111111111111' AND line_number = 1);

COMMIT;
