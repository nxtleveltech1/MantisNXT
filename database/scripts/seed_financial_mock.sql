-- Seed: Mock Financial Data
-- One set of each financial entity for dashboard and testing
-- Run: psql "$DATABASE_URL" -f database/scripts/seed_financial_mock.sql

\set ON_ERROR_STOP on
BEGIN;

-- Use existing TechCorp org from 0010_seed, or create demo org for financial
-- Dashboard fallback uses aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
INSERT INTO organization (id, name, slug, plan_type, settings)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Financial Demo Org',
  'financial-demo',
  'enterprise',
  '{"features": ["financial", "ar", "ap", "gl", "cash"]}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Supplier for AP
INSERT INTO supplier (id, org_id, name, contact_email, contact_phone, status)
VALUES (
  'ffff1111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Demo Vendor Co',
  'vendor@demo.com',
  '+27-11-555-0100',
  'active'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Customer for AR
INSERT INTO customer (id, org_id, name, email, company, segment, status, lifetime_value)
VALUES (
  'eeee1111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Demo Customer Ltd',
  'customer@demo.com',
  'Demo Customer Ltd',
  'smb',
  'active',
  50000.00
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- AP Vendor Invoice (unpaid, for aging)
INSERT INTO ap_vendor_invoices (
  id, org_id, vendor_id, invoice_number, vendor_invoice_number,
  invoice_date, due_date, subtotal, tax_amount, total_amount, paid_amount, status
)
VALUES (
  'aaaa1111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'ffff1111-aaaa-1111-aaaa-111111111111',
  'AP-INV-001',
  'V-2025-001',
  CURRENT_DATE - INTERVAL '45 days',
  CURRENT_DATE - INTERVAL '15 days',
  15000.00,
  2250.00,
  17250.00,
  0,
  'approved'
)
ON CONFLICT (id) DO UPDATE SET total_amount = EXCLUDED.total_amount;

-- AR Customer Invoice (unpaid, for aging)
INSERT INTO ar_customer_invoices (
  id, org_id, customer_id, invoice_number, invoice_date, due_date,
  subtotal, tax_amount, total_amount, paid_amount, status
)
VALUES (
  'aaaa2111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'eeee1111-aaaa-1111-aaaa-111111111111',
  'AR-INV-001',
  CURRENT_DATE - INTERVAL '60 days',
  CURRENT_DATE - INTERVAL '30 days',
  25000.00,
  3750.00,
  28750.00,
  0,
  'sent'
)
ON CONFLICT (id) DO UPDATE SET total_amount = EXCLUDED.total_amount;

-- Cash Bank Account
INSERT INTO cash_bank_accounts (
  id, org_id, account_name, account_number, bank_name, account_type,
  currency, opening_balance, current_balance, is_active
)
VALUES (
  'aaaa3111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Operating Account',
  '1234567890',
  'Demo Bank',
  'checking',
  'ZAR',
  100000.00,
  125000.00,
  true
)
ON CONFLICT (id) DO UPDATE SET current_balance = EXCLUDED.current_balance;

-- AP Payment (paid)
INSERT INTO ap_payments (
  id, org_id, vendor_id, payment_number, payment_date, amount,
  currency, payment_method, status
)
VALUES (
  'aaaa4111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'ffff1111-aaaa-1111-aaaa-111111111111',
  'AP-PAY-001',
  CURRENT_DATE - INTERVAL '5 days',
  5000.00,
  'ZAR',
  'bank_transfer',
  'paid'
)
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;

-- AR Receipt (paid)
INSERT INTO ar_receipts (
  id, org_id, customer_id, receipt_number, receipt_date, amount,
  currency, payment_method, status
)
VALUES (
  'aaaa5111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'eeee1111-aaaa-1111-aaaa-111111111111',
  'AR-REC-001',
  CURRENT_DATE - INTERVAL '3 days',
  10000.00,
  'ZAR',
  'bank_transfer',
  'paid'
)
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;

-- AP Credit Note
INSERT INTO ap_credit_notes (
  id, org_id, vendor_id, credit_note_number, credit_note_date,
  reason, currency, total_amount, status
)
VALUES (
  'aaaa6111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'ffff1111-aaaa-1111-aaaa-111111111111',
  'AP-CN-001',
  CURRENT_DATE - INTERVAL '10 days',
  'Returned goods',
  'ZAR',
  1500.00,
  'applied'
)
ON CONFLICT (id) DO UPDATE SET total_amount = EXCLUDED.total_amount;

-- AR Credit Note
INSERT INTO ar_credit_notes (
  id, org_id, customer_id, credit_note_number, credit_note_date,
  reason, currency, total_amount, status
)
VALUES (
  'aaaa7111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'eeee1111-aaaa-1111-aaaa-111111111111',
  'AR-CN-001',
  CURRENT_DATE - INTERVAL '7 days',
  'Discount adjustment',
  'ZAR',
  2000.00,
  'applied'
)
ON CONFLICT (id) DO UPDATE SET total_amount = EXCLUDED.total_amount;

-- Cost Center
INSERT INTO cost_centers (id, org_id, cost_center_code, cost_center_name, is_active)
VALUES (
  'cccc1111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'CC001',
  'Head Office',
  true
)
ON CONFLICT (id) DO UPDATE SET cost_center_name = EXCLUDED.cost_center_name;

-- Project Costing
INSERT INTO project_costing (id, org_id, project_code, project_name, start_date, budget_amount, actual_cost, status, cost_center_id)
VALUES (
  'bbbb1111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'PRJ-001',
  'Demo Project',
  CURRENT_DATE - INTERVAL '90 days',
  50000.00,
  12500.00,
  'active',
  'cccc1111-aaaa-1111-aaaa-111111111111'
)
ON CONFLICT (id) DO UPDATE SET project_name = EXCLUDED.project_name;

-- Tax Return
INSERT INTO tax_returns (id, org_id, return_period, fiscal_year, return_type, due_date, total_tax_due, status)
VALUES (
  'dddd1111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  to_char(CURRENT_DATE, 'YYYY-MM'),
  EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  'vat',
  CURRENT_DATE + INTERVAL '20 days',
  15000.00,
  'draft'
)
ON CONFLICT (id) DO UPDATE SET total_tax_due = EXCLUDED.total_tax_due;

-- Tax Return Line
INSERT INTO tax_return_lines (id, tax_return_id, line_number, description, amount)
VALUES (
  'dddd2111-aaaa-1111-aaaa-111111111111',
  'dddd1111-aaaa-1111-aaaa-111111111111',
  1,
  'VAT on sales',
  15000.00
)
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount;

-- FA Asset Category
INSERT INTO fa_asset_categories (id, org_id, category_code, category_name, default_depreciation_method, default_useful_life_years, is_active)
VALUES (
  'fafa1111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'IT',
  'IT Equipment',
  'straight_line',
  5,
  true
)
ON CONFLICT (id) DO UPDATE SET category_name = EXCLUDED.category_name;

-- FA Asset Register
INSERT INTO fa_asset_register (id, org_id, asset_number, asset_name, asset_category_id, purchase_date, purchase_cost, current_value, depreciation_method, useful_life_years, status)
VALUES (
  'fafa2111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'AST-001',
  'Demo Laptop',
  'fafa1111-aaaa-1111-aaaa-111111111111',
  CURRENT_DATE - INTERVAL '365 days',
  25000.00,
  20000.00,
  'straight_line',
  5,
  'active'
)
ON CONFLICT (id) DO UPDATE SET current_value = EXCLUDED.current_value;

-- GL Fiscal Year
INSERT INTO gl_fiscal_years (id, org_id, fiscal_year, start_date, end_date, is_closed)
VALUES (
  'eeee8111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  date_trunc('year', CURRENT_DATE)::date,
  (date_trunc('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day')::date,
  false
)
ON CONFLICT (org_id, fiscal_year) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date;

-- GL Period
INSERT INTO gl_periods (id, org_id, period, fiscal_year, start_date, end_date, is_closed)
VALUES (
  'eeee9111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  to_char(CURRENT_DATE, 'YYYY-MM'),
  EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  date_trunc('month', CURRENT_DATE)::date,
  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date,
  false
)
ON CONFLICT (org_id, period, fiscal_year) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date;

-- GL Account Balance (account_id is placeholder; no FK in schema)
INSERT INTO gl_account_balances (id, org_id, account_id, period, fiscal_year, opening_balance, debit_total, credit_total, closing_balance)
VALUES (
  'eeeea111-aaaa-1111-aaaa-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-1111-1111-1111-111111111111',
  to_char(CURRENT_DATE, 'YYYY-MM'),
  EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  0,
  10000.00,
  5000.00,
  5000.00
)
ON CONFLICT (org_id, account_id, period, fiscal_year) DO UPDATE SET closing_balance = EXCLUDED.closing_balance, debit_total = EXCLUDED.debit_total, credit_total = EXCLUDED.credit_total;

COMMIT;
