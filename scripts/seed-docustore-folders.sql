-- Seed DocuStore folders for all platform modules
-- Run via: psql or bun run db:seed-docustore

INSERT INTO docustore.document_folders (id, org_id, name, slug, icon, color) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sales', 'sales', 'file-text', '#3b82f6'),
  ('f0000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rentals', 'rentals', 'calendar', '#10b981'),
  ('f0000003-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Repairs', 'repairs', 'wrench', '#f59e0b'),
  ('f0000004-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Financial', 'financial', 'dollar-sign', '#8b5cf6'),
  ('f0000005-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Purchasing', 'purchasing', 'shopping-cart', '#ec4899'),
  ('f0000006-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Logistics', 'logistics', 'truck', '#06b6d4'),
  ('f0000007-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Customers', 'customers', 'users', '#84cc16'),
  ('f0000008-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Inventory', 'inventory', 'package', '#f97316')
ON CONFLICT (org_id, slug) DO NOTHING;

-- Seed sample documents for each module
INSERT INTO docustore.documents (id, org_id, title, description, document_type, status, folder_id, tags) VALUES
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sales Invoice #INV-2025-001', 'Invoice for customer order', 'invoice', 'active', 'f0000001-0000-0000-0000-000000000001', ARRAY['sales', 'invoice']),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Quotation #QUO-2025-001', 'Sales quotation', 'quotation', 'active', 'f0000001-0000-0000-0000-000000000001', ARRAY['sales', 'quotation']),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sales Order #SO-2025-001', 'Confirmed sales order', 'sales_order', 'active', 'f0000001-0000-0000-0000-000000000001', ARRAY['sales', 'order']),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rental Agreement #RA-2025-001', 'Equipment rental agreement', 'rental_agreement', 'active', 'f0000002-0000-0000-0000-000000000002', ARRAY['rentals', 'agreement']),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Repair Order #RO-2025-001', 'Repair service order', 'repair_order', 'active', 'f0000003-0000-0000-0000-000000000003', ARRAY['repairs', 'order']),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Journal Entry #JE-2025-001', 'GL journal entry', 'journal_entry', 'active', 'f0000004-0000-0000-0000-000000000004', ARRAY['financial', 'gl']),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AP Invoice #AP-2025-001', 'Accounts payable invoice', 'ap_invoice', 'active', 'f0000004-0000-0000-0000-000000000004', ARRAY['financial', 'ap']),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Purchase Order #PO-2025-001', 'Supplier purchase order', 'purchase_order', 'active', 'f0000005-0000-0000-0000-000000000005', ARRAY['purchasing', 'order']),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Delivery Note #DN-2025-001', 'Delivery documentation', 'delivery_note', 'active', 'f0000006-0000-0000-0000-000000000006', ARRAY['logistics', 'delivery']),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Customer Statement #CS-2025-001', 'Customer account statement', 'customer_statement', 'active', 'f0000007-0000-0000-0000-000000000007', ARRAY['customers', 'statement']),
  (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stock Adjustment #SA-2025-001', 'Inventory adjustment report', 'stock_adjustment', 'active', 'f0000008-0000-0000-0000-000000000008', ARRAY['inventory', 'adjustment']);

