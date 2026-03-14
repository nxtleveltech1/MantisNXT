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

COMMIT;
