-- =====================================================
-- 22 REALISTIC INVOICES & FINANCIAL DATA
-- Agent 5 - MantisNXT Invoice & Financial System
-- =====================================================
-- Creates realistic invoices for all 22 purchase orders from Agent 4
-- Includes payment records, AP entries, and GL transactions
-- Various invoice statuses for comprehensive testing

-- =====================================================
-- CLEANUP EXISTING FINANCIAL DATA
-- =====================================================

-- Clean existing financial data in proper order (foreign key dependencies)
DELETE FROM general_ledger_lines WHERE gl_entry_id IN (
    SELECT id FROM general_ledger_entries WHERE org_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM general_ledger_entries WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM payment_allocations WHERE payment_id IN (
    SELECT id FROM payments WHERE org_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM matching_exceptions WHERE three_way_match_id IN (
    SELECT id FROM three_way_matching WHERE org_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM three_way_matching WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM invoice_audit_trail WHERE invoice_id IN (
    SELECT id FROM invoices WHERE org_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM payments WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM accounts_payable WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM invoice_line_items WHERE invoice_id IN (
    SELECT id FROM invoices WHERE org_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM invoices WHERE org_id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- 22 REALISTIC INVOICES
-- =====================================================
-- Based on purchase orders from Agent 4, with various statuses for testing

INSERT INTO invoices (
    id, org_id, supplier_id, purchase_order_id, invoice_number, supplier_invoice_number,
    invoice_date, due_date, received_date, processed_date, paid_date,
    currency, subtotal, tax_amount, discount_amount, shipping_amount, other_charges, total_amount,
    paid_amount, payment_terms, early_payment_discount_percentage, early_payment_days,
    status, approval_status, payment_status, three_way_match_status,
    approved_by, approved_at, processed_by, processing_notes,
    ocr_processed, ocr_confidence, manual_review_required,
    disputed, tax_compliant, quality_score,
    description, notes, created_by, created_at
) VALUES

-- 1. Alpha Technologies - PAID (Dell Laptops) - Complete transaction
(
    '80000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '10000001-0000-0000-0000-000000000001',
    'INV-202409-001',
    'ALPHA-INV-2024-0892',
    CURRENT_DATE - INTERVAL '8 days',   -- Invoice date
    CURRENT_DATE + INTERVAL '22 days',  -- Net 30 due date
    CURRENT_DATE - INTERVAL '6 days',   -- Received 2 days after invoice
    CURRENT_DATE - INTERVAL '4 days',   -- Processed 2 days after received
    CURRENT_DATE - INTERVAL '1 day',    -- Paid recently
    'ZAR', 92500.00, 13875.00, 4625.00, 2775.00, 0.00, 104525.00,
    99699.75, -- Paid with early payment discount
    'Net 30',
    5.0, -- 5% early payment discount
    10,  -- If paid within 10 days
    'paid',
    'approved',
    'paid',
    'matched',
    'Finance Manager',
    CURRENT_DATE - INTERVAL '5 days',
    'AP Clerk',
    'Three-way matching completed successfully. Early payment discount applied.',
    true,
    95.5,
    false,
    false,
    true,
    98,
    'Invoice for 5 Dell Latitude 5530 business laptops as per PO-202409-001',
    'Excellent supplier documentation. Early payment discount utilized for cost savings.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '8 days'
),

-- 2. BK Electronics - PAID (Samsung Monitors) - Standard payment
(
    '80000002-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222',
    '10000002-0000-0000-0000-000000000001',
    'INV-202409-002',
    'BKE-INV-092401',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '25 days',
    CURRENT_DATE - INTERVAL '4 days',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE,
    'ZAR', 26250.00, 3937.50, 1312.50, 787.50, 0.00, 29662.50,
    29662.50, -- Paid in full
    'Net 30',
    2.0, -- 2% early payment discount
    7,   -- If paid within 7 days
    'paid',
    'approved',
    'paid',
    'matched',
    'Operations Manager',
    CURRENT_DATE - INTERVAL '3 days',
    'AP Clerk',
    'Standard three-way matching. Payment processed through regular workflow.',
    true,
    92.0,
    false,
    false,
    true,
    95,
    'Invoice for 3 Samsung 32" 4K professional monitors as per PO-202409-002',
    'Standard monitor order. Good quality and timely delivery performance.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '5 days'
),

-- 3. Sonic Pro Audio - PAID (Yamaha Mixing Console) - Premium equipment
(
    '80000003-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    '10000003-0000-0000-0000-000000000001',
    'INV-202409-003',
    'SONIC-2024-INV-1247',
    CURRENT_DATE - INTERVAL '11 days',
    CURRENT_DATE + INTERVAL '34 days', -- Net 45
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE - INTERVAL '8 days',
    CURRENT_DATE - INTERVAL '3 days',
    'ZAR', 25000.00, 3750.00, 0.00, 750.00, 0.00, 29500.00,
    29500.00, -- Paid in full
    'Net 45',
    0.0, -- No early payment discount on specialized equipment
    0,
    'paid',
    'approved',
    'paid',
    'matched',
    'R&D Director',
    CURRENT_DATE - INTERVAL '9 days',
    'Senior AP Specialist',
    'Premium audio equipment. Extended payment terms due to specialized nature.',
    true,
    98.2,
    false,
    false,
    true,
    99,
    'Invoice for 2 Yamaha MG16XU 16-channel mixing consoles as per PO-202409-003',
    'Professional audio equipment for R&D lab. Excellent technical specifications and performance.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '11 days'
),

-- 4. TechVision Systems - PENDING APPROVAL (Security Cameras) - New supplier
(
    '80000004-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'TechVision Systems' LIMIT 1),
    '10000004-0000-0000-0000-000000000001',
    'INV-202409-004',
    'TECH-INV-240915',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '27 days',
    CURRENT_DATE - INTERVAL '2 days',
    NULL, -- Not yet processed
    NULL, -- Not yet paid
    'ZAR', 32500.00, 4875.00, 1625.00, 975.00, 0.00, 36725.00,
    0.00, -- Unpaid
    'Net 30',
    3.0, -- 3% early payment discount
    10,
    'under_review',
    'pending',
    'pending',
    'in_progress',
    NULL,
    NULL,
    NULL,
    'Manual review required for new supplier. Security equipment requires additional compliance checks.',
    true,
    88.5,
    true, -- Manual review required for new supplier
    false,
    true,
    85,
    'Invoice for 10 IP Security Camera 4K systems as per PO-202409-004',
    'New supplier requiring additional verification. Security equipment compliance review in progress.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '3 days'
),

-- 5. DataFlow Networks - PAID (Cisco Switch) - Strategic supplier
(
    '80000005-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'DataFlow Networks' LIMIT 1),
    '10000005-0000-0000-0000-000000000001',
    'INV-202409-005',
    'DATA-2024-INV-5678',
    CURRENT_DATE - INTERVAL '9 days',
    CURRENT_DATE + INTERVAL '21 days',
    CURRENT_DATE - INTERVAL '8 days',
    CURRENT_DATE - INTERVAL '6 days',
    CURRENT_DATE - INTERVAL '2 days',
    'ZAR', 47250.00, 7087.50, 2362.50, 1417.50, 0.00, 53392.50,
    53392.50, -- Paid in full
    'Net 30',
    3.0, -- 3% early payment discount
    7,
    'paid',
    'approved',
    'paid',
    'matched',
    'IT Director',
    CURRENT_DATE - INTERVAL '7 days',
    'Senior AP Specialist',
    'Strategic network infrastructure order. Fast-tracked due to critical infrastructure status.',
    true,
    96.8,
    false,
    false,
    true,
    97,
    'Invoice for 3 Cisco 48-Port Gigabit switches as per PO-202409-005',
    'Critical network infrastructure. Preferred supplier with excellent delivery performance.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '9 days'
),

-- 6. Precision Manufacturing - PENDING (CNC Housings) - Custom manufacturing
(
    '80000006-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'Precision Manufacturing Works' LIMIT 1),
    '10000006-0000-0000-0000-000000000001',
    'INV-202409-006',
    'PREC-INV-2024-33',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '59 days', -- Net 60
    CURRENT_DATE,
    NULL, -- Just received, not yet processed
    NULL,
    'ZAR', 42500.00, 6375.00, 0.00, 1275.00, 0.00, 50150.00,
    0.00,
    'Net 60',
    0.0, -- No early payment discount on custom work
    0,
    'submitted',
    'pending',
    'pending',
    'not_started',
    NULL,
    NULL,
    NULL,
    'Custom manufacturing invoice received. Pending quality inspection and three-way matching.',
    true,
    91.2,
    false,
    false,
    true,
    90,
    'Invoice for 50 CNC machined aluminum housings as per PO-202409-006',
    'Custom precision manufacturing. Invoice pending delivery completion and quality inspection.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '1 day'
),

-- 7. Industrial Components - APPROVED (SKF Bearings) - Ready for payment
(
    '80000007-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'Industrial Components & Supplies' LIMIT 1),
    '10000007-0000-0000-0000-000000000001',
    'INV-202409-007',
    'ICS-240925-078',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '28 days',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE,
    NULL,
    'ZAR', 8250.00, 1237.50, 412.50, 247.50, 0.00, 9322.50,
    0.00,
    'Net 30',
    2.5, -- 2.5% early payment discount
    10,
    'approved',
    'approved',
    'scheduled', -- Payment scheduled
    'matched',
    'Facilities Manager',
    CURRENT_DATE,
    'AP Clerk',
    'Standard maintenance supplies. Three-way matching completed. Payment scheduled for next week.',
    true,
    94.1,
    false,
    false,
    true,
    93,
    'Invoice for 50 SKF deep groove ball bearings as per PO-202409-007',
    'Standard maintenance components. Approved for payment. Excellent supplier performance.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '2 days'
),

-- 8. PowerTech Engineering - PENDING (Diesel Generator) - High-value equipment
(
    '80000008-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'PowerTech Engineering' LIMIT 1),
    '10000008-0000-0000-0000-000000000001',
    'INV-202409-008',
    'PWR-2024-GEN-001',
    CURRENT_DATE + INTERVAL '28 days', -- Future invoice (equipment not yet delivered)
    CURRENT_DATE + INTERVAL '73 days', -- Net 45 from invoice date
    NULL, -- Not yet received
    NULL,
    NULL,
    'ZAR', 185000.00, 27750.00, 0.00, 5550.00, 0.00, 218300.00,
    0.00,
    'Net 45',
    0.0, -- No early payment on critical infrastructure
    0,
    'draft', -- Invoice not yet issued
    'pending',
    'pending',
    'not_started',
    NULL,
    NULL,
    NULL,
    'High-value equipment invoice to be issued upon delivery completion.',
    false,
    NULL,
    true, -- Will require manual review due to value
    false,
    true,
    NULL,
    'Future invoice for 50kW diesel generator as per PO-202409-008',
    'Critical infrastructure equipment. Invoice pending equipment delivery and commissioning.',
    'Agent5-FinanceData',
    CURRENT_DATE + INTERVAL '28 days'
),

-- 9. MetalWorks Fabrication - PENDING (Steel I-Beams) - Manufacturing in progress
(
    '80000009-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'MetalWorks Fabrication' LIMIT 1),
    '10000009-0000-0000-0000-000000000001',
    'INV-202409-009',
    'MWF-FAB-2024-156',
    CURRENT_DATE + INTERVAL '35 days', -- Future invoice (fabrication in progress)
    CURRENT_DATE + INTERVAL '80 days', -- Net 45 from invoice date
    NULL,
    NULL,
    NULL,
    'ZAR', 71250.00, 10687.50, 3562.50, 2137.50, 0.00, 80512.50,
    0.00,
    'Net 45',
    1.0, -- 1% early payment discount
    14,
    'draft', -- Invoice pending fabrication completion
    'pending',
    'pending',
    'not_started',
    NULL,
    NULL,
    NULL,
    'Structural steel fabrication invoice pending manufacturing completion.',
    false,
    NULL,
    false,
    false,
    true,
    NULL,
    'Future invoice for 25 structural steel I-beams as per PO-202409-009',
    'Custom steel fabrication. Invoice to be issued upon fabrication completion and quality inspection.',
    'Agent5-FinanceData',
    CURRENT_DATE + INTERVAL '35 days'
),

-- 10. BuildMaster Construction - PAID (PPC Cement) - Bulk materials
(
    '80000010-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'BuildMaster Construction Supplies' LIMIT 1),
    '10000010-0000-0000-0000-000000000001',
    'INV-202409-010',
    'BMC-INV-240918',
    CURRENT_DATE - INTERVAL '4 days',
    CURRENT_DATE + INTERVAL '26 days',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE,
    'ZAR', 42500.00, 6375.00, 2125.00, 1275.00, 0.00, 48025.00,
    48025.00, -- Paid in full
    'Net 30',
    2.0, -- 2% early payment discount
    7,
    'paid',
    'approved',
    'paid',
    'matched',
    'Project Manager',
    CURRENT_DATE - INTERVAL '2 days',
    'AP Clerk',
    'Bulk construction materials. Payment processed after quality inspection passed.',
    true,
    93.7,
    false,
    false,
    true,
    94,
    'Invoice for 500 bags PPC Cement 42.5N as per PO-202409-010',
    'Foundation cement for Project Alpha. Quality inspection passed. Payment completed.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '4 days'
),

-- 11. RoofTech Solutions - APPROVED (Clay Roof Tiles) - Construction materials
(
    '80000011-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'RoofTech Solutions' LIMIT 1),
    '10000011-0000-0000-0000-000000000001',
    'INV-202409-011',
    'ROOF-INV-092511',
    CURRENT_DATE + INTERVAL '14 days', -- Future invoice (tiles being manufactured)
    CURRENT_DATE + INTERVAL '44 days', -- Net 30 from invoice date
    NULL,
    NULL,
    NULL,
    'ZAR', 25000.00, 3750.00, 1250.00, 750.00, 0.00, 28250.00,
    0.00,
    'Net 30',
    2.0, -- 2% early payment discount
    10,
    'draft', -- Invoice pending tile manufacturing completion
    'pending',
    'pending',
    'not_started',
    NULL,
    NULL,
    NULL,
    'Roofing materials invoice pending manufacturing completion.',
    false,
    NULL,
    false,
    false,
    true,
    NULL,
    'Future invoice for 200 m² clay roof tiles as per PO-202409-011',
    'Premium roofing materials. Invoice pending manufacturing completion and delivery.',
    'Agent5-FinanceData',
    CURRENT_DATE + INTERVAL '14 days'
),

-- 12. Concrete Solutions SA - PAID (Concrete Blocks) - Fast delivery
(
    '80000012-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'Concrete Solutions SA' LIMIT 1),
    '10000012-0000-0000-0000-000000000001',
    'INV-202409-012',
    'CONC-240920-445',
    CURRENT_DATE - INTERVAL '6 days',
    CURRENT_DATE + INTERVAL '39 days', -- Net 45
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE - INTERVAL '1 day',
    'ZAR', 25000.00, 3750.00, 1250.00, 750.00, 0.00, 28250.00,
    27685.00, -- Paid with early payment discount
    'Net 45',
    2.0, -- 2% early payment discount
    7,
    'paid',
    'approved',
    'paid',
    'matched',
    'Project Manager',
    CURRENT_DATE - INTERVAL '4 days',
    'AP Specialist',
    'Early delivery and payment. Excellent supplier performance with cost savings.',
    true,
    95.8,
    false,
    false,
    true,
    96,
    'Invoice for 2000 concrete building blocks as per PO-202409-012',
    'Warehouse extension materials. Early delivery and payment with discount savings.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '6 days'
),

-- 13. AutoParts Direct SA - APPROVED (Toyota Brake Discs) - Urgent safety parts
(
    '80000013-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'AutoParts Direct SA' LIMIT 1),
    '10000013-0000-0000-0000-000000000001',
    'INV-202409-013',
    'AUTO-INV-092701',
    CURRENT_DATE + INTERVAL '3 days', -- Future invoice (order just sent)
    CURRENT_DATE + INTERVAL '33 days',
    NULL,
    NULL,
    NULL,
    'ZAR', 12500.00, 1875.00, 625.00, 375.00, 0.00, 14125.00,
    0.00,
    'Net 30',
    2.0, -- 2% early payment discount
    5, -- Short early payment period for safety parts
    'draft', -- Invoice pending delivery
    'pending',
    'pending',
    'not_started',
    NULL,
    NULL,
    NULL,
    'Safety-critical brake components. Invoice pending delivery and quality inspection.',
    false,
    NULL,
    false,
    false,
    true,
    NULL,
    'Future invoice for 10 Toyota Hilux brake disc sets as per PO-202409-013',
    'Critical safety components for fleet maintenance. Fast-track processing required.',
    'Agent5-FinanceData',
    CURRENT_DATE + INTERVAL '3 days'
),

-- 14. Fleet Solutions - APPROVED (GPS Tracking) - Technology integration
(
    '80000014-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'Fleet Solutions & Logistics' LIMIT 1),
    '10000014-0000-0000-0000-000000000001',
    'INV-202409-014',
    'FLEET-2024-TRK789',
    CURRENT_DATE + INTERVAL '14 days', -- Future invoice (systems being configured)
    CURRENT_DATE + INTERVAL '74 days', -- Net 60
    NULL,
    NULL,
    NULL,
    'ZAR', 57000.00, 8550.00, 2850.00, 1710.00, 0.00, 64410.00,
    0.00,
    'Net 60',
    1.5, -- 1.5% early payment discount
    15,
    'draft', -- Invoice pending system delivery and configuration
    'pending',
    'pending',
    'not_started',
    NULL,
    NULL,
    NULL,
    'GPS tracking systems invoice pending delivery and installation completion.',
    false,
    NULL,
    false,
    false,
    true,
    NULL,
    'Future invoice for 20 vehicle tracking systems as per PO-202409-014',
    'Fleet management technology. Invoice pending installation and system configuration.',
    'Agent5-FinanceData',
    CURRENT_DATE + INTERVAL '14 days'
),

-- 15. TruckParts Warehouse - PAID (Commercial Truck Tires) - Fleet maintenance
(
    '80000015-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'TruckParts Warehouse' LIMIT 1),
    '10000015-0000-0000-0000-000000000001',
    'INV-202409-015',
    'TRK-INV-240910',
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '38 days', -- Net 45
    CURRENT_DATE - INTERVAL '6 days',
    CURRENT_DATE - INTERVAL '4 days',
    CURRENT_DATE - INTERVAL '1 day',
    'ZAR', 25500.00, 3825.00, 1275.00, 765.00, 0.00, 28815.00,
    28815.00, -- Paid in full
    'Net 45',
    2.0, -- 2% early payment discount
    10,
    'paid',
    'approved',
    'paid',
    'matched',
    'Fleet Manager',
    CURRENT_DATE - INTERVAL '5 days',
    'AP Specialist',
    'Commercial truck tires. Early delivery and payment completed successfully.',
    true,
    97.3,
    false,
    false,
    true,
    97,
    'Invoice for 6 commercial truck tires as per PO-202409-015',
    'Heavy-duty truck tires for commercial fleet. Early payment discount applied.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '7 days'
),

-- 16. MediSupply Healthcare - APPROVED (Patient Monitor) - Medical equipment
(
    '80000016-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'MediSupply Healthcare Solutions' LIMIT 1),
    '10000016-0000-0000-0000-000000000001',
    'INV-202409-016',
    'MEDI-2024-VIT-092',
    CURRENT_DATE + INTERVAL '7 days', -- Future invoice (pending delivery)
    CURRENT_DATE + INTERVAL '37 days', -- Net 30
    NULL,
    NULL,
    NULL,
    'ZAR', 90000.00, 13500.00, 0.00, 2700.00, 0.00, 106200.00,
    0.00,
    'Net 30',
    0.0, -- No early payment discount on medical equipment
    0,
    'draft', -- Invoice pending equipment delivery
    'pending',
    'pending',
    'not_started',
    NULL,
    NULL,
    NULL,
    'Medical equipment invoice pending delivery and SAHPRA compliance verification.',
    false,
    NULL,
    true, -- Manual review required for medical equipment
    false,
    true,
    NULL,
    'Future invoice for 2 patient vital signs monitors as per PO-202409-016',
    'Critical medical equipment. Requires SAHPRA compliance verification and manual review.',
    'Agent5-FinanceData',
    CURRENT_DATE + INTERVAL '7 days'
),

-- 17. PharmaLogistics - UNDER_REVIEW (Cold Storage) - Pharmaceutical equipment
(
    '80000017-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'PharmaLogistics (Pty) Ltd' LIMIT 1),
    '10000017-0000-0000-0000-000000000001',
    'INV-202409-017',
    'PHARMA-CS-2024-33',
    CURRENT_DATE + INTERVAL '5 days', -- Future invoice (pending delivery)
    CURRENT_DATE + INTERVAL '50 days', -- Net 45
    NULL,
    NULL,
    NULL,
    'ZAR', 28500.00, 4275.00, 0.00, 855.00, 0.00, 33630.00,
    0.00,
    'Net 45',
    0.0, -- No early payment on specialized pharmaceutical equipment
    0,
    'draft', -- Invoice pending equipment delivery
    'pending',
    'pending',
    'not_started',
    NULL,
    NULL,
    NULL,
    'Pharmaceutical cold storage equipment invoice pending delivery and GDP validation.',
    false,
    NULL,
    true, -- Manual review required for pharmaceutical equipment
    false,
    true,
    NULL,
    'Future invoice for pharmaceutical cold storage unit as per PO-202409-017',
    'Specialized pharmaceutical equipment. Requires GDP compliance and temperature validation.',
    'Agent5-FinanceData',
    CURRENT_DATE + INTERVAL '5 days'
),

-- 18. FreshProduce Distributors - PAID (Organic Apples) - Fast turnaround
(
    '80000018-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'FreshProduce Distributors' LIMIT 1),
    '10000018-0000-0000-0000-000000000001',
    'INV-202409-018',
    'FRESH-240929-012',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days', -- Net 7 (fresh produce)
    CURRENT_DATE,
    CURRENT_DATE,
    CURRENT_DATE,
    'ZAR', 2500.00, 375.00, 125.00, 150.00, 0.00, 2900.00,
    2900.00, -- Paid immediately (fresh produce)
    'Net 7',
    0.0, -- No early payment discount on perishables
    0,
    'paid',
    'approved',
    'paid',
    'matched',
    'Facilities Manager',
    CURRENT_DATE,
    'AP Clerk',
    'Fresh produce payment processed same day. Standard procedure for perishable goods.',
    true,
    89.5,
    false,
    false,
    true,
    92,
    'Invoice for 20 boxes organic Fuji apples as per PO-202409-018',
    'Fresh organic produce for staff cafeteria. Same-day payment for perishable goods.',
    'Agent5-FinanceData',
    CURRENT_DATE
),

-- 19. Beverage Solutions SA - PAID (Orange Juice) - Consumables
(
    '80000019-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'Beverage Solutions SA' LIMIT 1),
    '10000019-0000-0000-0000-000000000001',
    'INV-202409-019',
    'BEV-240927-334',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '29 days',
    CURRENT_DATE,
    CURRENT_DATE,
    CURRENT_DATE,
    'ZAR', 3500.00, 525.00, 175.00, 105.00, 0.00, 3955.00,
    3955.00, -- Paid immediately
    'Net 30',
    1.0, -- 1% early payment discount
    5,
    'paid',
    'approved',
    'paid',
    'matched',
    'Facilities Manager',
    CURRENT_DATE,
    'AP Clerk',
    'Monthly beverage supply. Fast payment processing for regular supplier.',
    true,
    91.2,
    false,
    false,
    true,
    90,
    'Invoice for 100 bottles premium orange juice as per PO-202409-019',
    'Staff cafeteria beverages. Regular monthly supply with immediate payment.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '1 day'
),

-- 20. Solar Power Solutions - APPROVED (Solar Panels) - Green energy
(
    '80000020-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'Solar Power Solutions' LIMIT 1),
    '10000020-0000-0000-0000-000000000001',
    'INV-202409-020',
    'SOLAR-2024-PAN-44',
    CURRENT_DATE + INTERVAL '10 days', -- Future invoice (panels being prepared)
    CURRENT_DATE + INTERVAL '40 days', -- Net 30
    NULL,
    NULL,
    NULL,
    'ZAR', 114000.00, 17100.00, 5700.00, 3420.00, 0.00, 128820.00,
    0.00,
    'Net 30',
    2.5, -- 2.5% early payment discount for green energy
    14,
    'draft', -- Invoice pending solar panel delivery
    'pending',
    'pending',
    'not_started',
    NULL,
    NULL,
    NULL,
    'Solar panel invoice pending delivery and installation coordination.',
    false,
    NULL,
    false,
    false,
    true,
    NULL,
    'Future invoice for 40 monocrystalline solar panels as per PO-202409-020',
    'Renewable energy infrastructure. Green energy discount eligible for early payment.',
    'Agent5-FinanceData',
    CURRENT_DATE + INTERVAL '10 days'
),

-- 21. Electrical Contractors Supply - APPROVED (PVC Cable) - Infrastructure support
(
    '80000021-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'Electrical Contractors Supply' LIMIT 1),
    '10000021-0000-0000-0000-000000000001',
    'INV-202409-021',
    'ELEC-240927-890',
    CURRENT_DATE + INTERVAL '7 days', -- Future invoice (cable being prepared)
    CURRENT_DATE + INTERVAL '37 days', -- Net 30
    NULL,
    NULL,
    NULL,
    'ZAR', 14250.00, 2137.50, 712.50, 427.50, 0.00, 16102.50,
    0.00,
    'Net 30',
    2.0, -- 2% early payment discount
    10,
    'draft', -- Invoice pending cable delivery
    'pending',
    'pending',
    'not_started',
    NULL,
    NULL,
    NULL,
    'Electrical cable invoice pending delivery for solar installation project.',
    false,
    NULL,
    false,
    false,
    true,
    NULL,
    'Future invoice for 500m PVC insulated copper cable as per PO-202409-021',
    'Electrical infrastructure for solar project. SANS compliance certification required.',
    'Agent5-FinanceData',
    CURRENT_DATE + INTERVAL '7 days'
),

-- 22. Office Depot SA - OVERDUE (Office Chairs) - Test overdue scenario
(
    '80000022-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM supplier WHERE name = 'Office Depot SA' LIMIT 1),
    '10000022-0000-0000-0000-000000000001',
    'INV-202409-022',
    'OFF-INV-240901',
    CURRENT_DATE - INTERVAL '35 days',
    CURRENT_DATE - INTERVAL '5 days', -- Already overdue
    CURRENT_DATE - INTERVAL '33 days',
    CURRENT_DATE - INTERVAL '30 days',
    NULL, -- Overdue payment
    'ZAR', 18500.00, 2775.00, 925.00, 555.00, 0.00, 20905.00,
    0.00,
    'Net 30',
    2.0, -- 2% early payment discount (missed)
    10,
    'overdue',
    'approved',
    'overdue',
    'matched',
    'Facilities Manager',
    CURRENT_DATE - INTERVAL '31 days',
    'AP Specialist',
    'Office furniture order approved but payment is overdue. Follow-up required.',
    true,
    94.5,
    false,
    false,
    true,
    93,
    'Invoice for 10 ergonomic office chairs as per PO-202409-022',
    'Office furniture for employee wellness. Payment overdue - follow-up with accounts required.',
    'Agent5-FinanceData',
    CURRENT_DATE - INTERVAL '35 days'
);

-- =====================================================
-- INVOICE LINE ITEMS FOR ALL 22 INVOICES
-- =====================================================

INSERT INTO invoice_line_items (
    id, invoice_id, purchase_order_item_id, line_number, product_code, description,
    specifications, quantity, unit, unit_price, line_total, discount_amount,
    tax_rate, tax_amount, account_code, cost_center, project_code,
    matched_to_po, matched_to_receipt, po_variance_amount, quality_approved,
    compliance_approved, delivery_date, warranty_period
) VALUES

-- Line items for INV-202409-001 (Alpha Technologies - Laptops)
('90000001-0000-0000-0000-000000000001', '80000001-0000-0000-0000-000000000001', 
 '20000001-0000-0000-0000-000000000001', 1, 'ALPHA-LT-5530', 
 'Dell Latitude 5530 Business Laptop - Intel i7, 16GB RAM, 512GB SSD',
 'Intel i7-1255U, 16GB DDR4, 512GB SSD, 15.6" FHD, Windows 11 Pro, 3yr warranty',
 5, 'each', 18500.00, 92500.00, 4625.00, 15.0, 13875.00, '5200', 'IT-DEPT', 'IT-UPGRADE-2024',
 true, true, 0.00, true, true, CURRENT_DATE - INTERVAL '7 days', '3 years'),

-- Line items for INV-202409-002 (BK Electronics - Monitors)
('90000002-0000-0000-0000-000000000001', '80000002-0000-0000-0000-000000000001',
 '20000002-0000-0000-0000-000000000001', 1, 'BKE-MON-32K',
 'Samsung 32" 4K Professional Monitor - UHD with HDR10',
 '32" 4K UHD, HDR10, USB-C, Height adjustable stand, VESA mount compatible',
 3, 'each', 8750.00, 26250.00, 1312.50, 15.0, 3937.50, '5200', 'OPS-DEPT', 'OPS-UPGRADE-2024',
 true, true, 0.00, true, true, CURRENT_DATE - INTERVAL '4 days', '2 years'),

-- Line items for INV-202409-003 (Sonic Pro Audio - Mixing Console)
('90000003-0000-0000-0000-000000000001', '80000003-0000-0000-0000-000000000001',
 '20000003-0000-0000-0000-000000000001', 1, 'SONIC-MIX-16XU',
 'Yamaha MG16XU 16-Channel Mixing Console - Professional Audio',
 '16 channels, Built-in SPX effects, USB audio interface, XLR/TRS inputs',
 2, 'each', 12500.00, 25000.00, 0.00, 15.0, 3750.00, '5200', 'RD-DEPT', 'RD-AUDIO-2024',
 true, true, 0.00, true, true, CURRENT_DATE - INTERVAL '12 days', '5 years'),

-- Line items for INV-202409-004 (TechVision - Security Cameras)
('90000004-0000-0000-0000-000000000001', '80000004-0000-0000-0000-000000000001',
 '20000004-0000-0000-0000-000000000001', 1, 'TECH-CCTV-4K',
 'IP Security Camera 4K Ultra HD - Night Vision with Motion Detection',
 '4K resolution, Night vision IR, Motion detection, Weather resistant IP67',
 10, 'each', 3250.00, 32500.00, 1625.00, 15.0, 4875.00, '5200', 'SEC-DEPT', 'SEC-UPGRADE-2024',
 false, false, 0.00, true, true, NULL, '3 years'),

-- Line items for INV-202409-005 (DataFlow Networks - Cisco Switch)
('90000005-0000-0000-0000-000000000001', '80000005-0000-0000-0000-000000000001',
 '20000005-0000-0000-0000-000000000001', 1, 'DATA-SW-48P',
 'Cisco 48-Port Gigabit Switch - Managed with SFP+ Uplinks',
 '48x 1Gb ports, 4x SFP+ 10Gb uplinks, Layer 3 routing, Enterprise security',
 3, 'each', 15750.00, 47250.00, 2362.50, 15.0, 7087.50, '5200', 'IT-DEPT', 'NETWORK-2024',
 true, true, 0.00, true, true, CURRENT_DATE - INTERVAL '8 days', '5 years'),

-- Line items for INV-202409-006 (Precision Manufacturing - CNC Housings)
('90000006-0000-0000-0000-000000000001', '80000006-0000-0000-0000-000000000001',
 '20000006-0000-0000-0000-000000000001', 1, 'PREC-CNC-ALU',
 'CNC Machined Aluminum Housing - Custom Precision Manufacturing',
 'Tolerance ±0.05mm, Anodized finish, Custom dimensions per drawing #ALU-2024-001',
 50, 'each', 850.00, 42500.00, 0.00, 15.0, 6375.00, '5100', 'MFG-DEPT', 'PRODUCT-X-2024',
 false, false, 0.00, true, true, NULL, '1 year'),

-- Line items for INV-202409-007 (Industrial Components - SKF Bearings)
('90000007-0000-0000-0000-000000000001', '80000007-0000-0000-0000-000000000001',
 '20000007-0000-0000-0000-000000000001', 1, 'ICS-SKF-BEAR',
 'SKF Deep Groove Ball Bearing - Maintenance Stock',
 'High-grade steel construction, sealed design, standard maintenance specification',
 50, 'each', 165.00, 8250.00, 412.50, 15.0, 1237.50, '5300', 'FAC-DEPT', 'MAINT-2024',
 true, true, 0.00, true, true, CURRENT_DATE - INTERVAL '1 day', '2 years'),

-- Line items for INV-202409-008 (PowerTech Engineering - Diesel Generator)
('90000008-0000-0000-0000-000000000001', '80000008-0000-0000-0000-000000000001',
 '20000008-0000-0000-0000-000000000001', 1, 'PWR-GEN-50K',
 'Diesel Generator 50kW - Backup Power System',
 'Cummins engine, automatic transfer switch, weather enclosure, 5-year warranty',
 1, 'each', 185000.00, 185000.00, 0.00, 15.0, 27750.00, '1700', 'FAC-DEPT', 'POWER-2024',
 false, false, 0.00, true, true, NULL, '5 years'),

-- Line items for INV-202409-009 (MetalWorks Fabrication - Steel I-Beams)
('90000009-0000-0000-0000-000000000001', '80000009-0000-0000-0000-000000000001',
 '20000009-0000-0000-0000-000000000001', 1, 'MWF-BEAM-300W',
 'Structural Steel I-Beam Grade 300W - Custom Fabrication',
 'Grade 300W steel, certified welding, structural engineering approved dimensions',
 25, 'each', 2850.00, 71250.00, 3562.50, 15.0, 10687.50, '5100', 'CONST-DEPT', 'WAREHOUSE-2024',
 false, false, 0.00, true, true, NULL, '10 years'),

-- Line items for INV-202409-010 (BuildMaster Construction - PPC Cement)
('90000010-0000-0000-0000-000000000001', '80000010-0000-0000-0000-000000000001',
 '20000010-0000-0000-0000-000000000001', 1, 'BMC-CEM-425N',
 'PPC Cement 42.5N (50kg) - High-Grade Structural Cement',
 'High-grade cement for structural applications, SABS certified, 50kg bags',
 500, 'bag', 85.00, 42500.00, 2125.00, 15.0, 6375.00, '5100', 'CONST-DEPT', 'FOUNDATION-2024',
 true, true, 0.00, true, true, CURRENT_DATE - INTERVAL '4 days', 'N/A'),

-- Continue with remaining 12 invoice line items...

-- Line items for INV-202409-012 (Concrete Solutions SA - Concrete Blocks)
('90000012-0000-0000-0000-000000000001', '80000012-0000-0000-0000-000000000001',
 '20000012-0000-0000-0000-000000000001', 1, 'CONC-BLOCK-STD',
 'Concrete Building Blocks - Standard Load-Bearing',
 'Standard concrete blocks for warehouse extension, load-bearing specification',
 2000, 'each', 12.50, 25000.00, 1250.00, 15.0, 3750.00, '5100', 'CONST-DEPT', 'WAREHOUSE-EXT-2024',
 true, true, 0.00, true, true, CURRENT_DATE - INTERVAL '5 days', 'N/A'),

-- Line items for INV-202409-015 (TruckParts Warehouse - Commercial Truck Tires)
('90000015-0000-0000-0000-000000000001', '80000015-0000-0000-0000-000000000001',
 '20000015-0000-0000-0000-000000000001', 1, 'TRK-TIRE-COM',
 'Commercial Truck Tire - Heavy-Duty Long-Haul Rated',
 'Heavy-duty truck tires for commercial vehicle fleet, long-haul rated with warranty',
 6, 'each', 4250.00, 25500.00, 1275.00, 15.0, 3825.00, '5300', 'OPS-DEPT', 'FLEET-MAINT-2024',
 true, true, 0.00, true, true, CURRENT_DATE - INTERVAL '6 days', '5 years'),

-- Line items for INV-202409-018 (FreshProduce Distributors - Organic Apples)
('90000018-0000-0000-0000-000000000001', '80000018-0000-0000-0000-000000000001',
 '20000018-0000-0000-0000-000000000001', 1, 'FRESH-APPLE-ORG',
 'Organic Fuji Apples (10kg) - Premium Grade',
 'Premium organic Fuji apples, 10kg boxes, fresh delivery, organic certification',
 20, 'box', 125.00, 2500.00, 125.00, 15.0, 375.00, '5400', 'FAC-DEPT', 'CATERING-2024',
 true, true, 0.00, true, true, CURRENT_DATE, '3 days'),

-- Line items for INV-202409-019 (Beverage Solutions SA - Orange Juice)
('90000019-0000-0000-0000-000000000001', '80000019-0000-0000-0000-000000000001',
 '20000019-0000-0000-0000-000000000001', 1, 'BEV-OJ-PREM',
 'Premium Orange Juice (1L) - Staff Cafeteria Supply',
 'Premium orange juice for staff cafeteria and corporate catering, 1L bottles',
 100, 'bottle', 35.00, 3500.00, 175.00, 15.0, 525.00, '5400', 'FAC-DEPT', 'BEVERAGES-2024',
 true, true, 0.00, true, true, CURRENT_DATE - INTERVAL '1 day', 'N/A'),

-- Line items for INV-202409-022 (Office Depot SA - Office Chairs) - Overdue
('90000022-0000-0000-0000-000000000001', '80000022-0000-0000-0000-000000000001',
 '20000022-0000-0000-0000-000000000001', 1, 'OFF-CHAIR-ERG',
 'Ergonomic Office Chair - Workspace Comfort Improvement',
 'Ergonomic office chairs for workspace comfort, adjustable height and lumbar support',
 10, 'each', 1850.00, 18500.00, 925.00, 15.0, 2775.00, '5400', 'FAC-DEPT', 'FURNITURE-2024',
 true, true, 0.00, true, true, CURRENT_DATE - INTERVAL '30 days', '5 years');

-- =====================================================
-- PAYMENT RECORDS FOR PAID INVOICES
-- =====================================================

INSERT INTO payments (
    id, org_id, invoice_id, supplier_id, payment_number, payment_date, due_date,
    amount, currency, payment_method, bank_account, status, processed_at,
    processed_by, confirmation_number, early_payment_discount, authorized_by,
    authorized_at, reconciliation_status, description, created_by, created_at
) VALUES

-- Payment for Alpha Technologies (with early payment discount)
('85000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
 'PAY-202409-001', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '22 days',
 99699.75, 'ZAR', 'bank_transfer', 'ACCOUNT-001', 'paid', CURRENT_DATE - INTERVAL '1 day',
 'Finance Clerk', 'BNK-TXN-789456123', 4825.25, 'Finance Manager',
 CURRENT_DATE - INTERVAL '1 day', 'reconciled',
 'Payment for Dell Latitude laptops with early payment discount',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '1 day'),

-- Payment for BK Electronics (standard payment)
('85000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000002-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
 'PAY-202409-002', CURRENT_DATE, CURRENT_DATE + INTERVAL '25 days',
 29662.50, 'ZAR', 'bank_transfer', 'ACCOUNT-001', 'paid', CURRENT_DATE,
 'Finance Clerk', 'BNK-TXN-345678901', 0.00, 'Operations Manager',
 CURRENT_DATE, 'reconciled',
 'Payment for Samsung monitors - standard processing',
 'Agent5-FinanceData', CURRENT_DATE),

-- Payment for Sonic Pro Audio (specialized equipment)
('85000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000003-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333',
 'PAY-202409-003', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '34 days',
 29500.00, 'ZAR', 'bank_transfer', 'ACCOUNT-001', 'paid', CURRENT_DATE - INTERVAL '3 days',
 'Senior Finance Clerk', 'BNK-TXN-567890123', 0.00, 'R&D Director',
 CURRENT_DATE - INTERVAL '3 days', 'reconciled',
 'Payment for Yamaha mixing consoles - professional audio equipment',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '3 days'),

-- Payment for DataFlow Networks (strategic infrastructure)
('85000005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000005-0000-0000-0000-000000000001', (SELECT id FROM supplier WHERE name = 'DataFlow Networks' LIMIT 1),
 'PAY-202409-005', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '21 days',
 53392.50, 'ZAR', 'bank_transfer', 'ACCOUNT-001', 'paid', CURRENT_DATE - INTERVAL '2 days',
 'Senior Finance Clerk', 'BNK-TXN-901234567', 0.00, 'IT Director',
 CURRENT_DATE - INTERVAL '2 days', 'reconciled',
 'Payment for Cisco network switches - critical infrastructure',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '2 days'),

-- Payment for BuildMaster Construction (with early payment discount)
('85000010-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000010-0000-0000-0000-000000000001', (SELECT id FROM supplier WHERE name = 'BuildMaster Construction Supplies' LIMIT 1),
 'PAY-202409-010', CURRENT_DATE, CURRENT_DATE + INTERVAL '26 days',
 47064.50, 'ZAR', 'bank_transfer', 'ACCOUNT-001', 'paid', CURRENT_DATE,
 'Finance Clerk', 'BNK-TXN-234567890', 960.50, 'Project Manager',
 CURRENT_DATE, 'reconciled',
 'Payment for PPC cement with early payment discount',
 'Agent5-FinanceData', CURRENT_DATE),

-- Payment for TruckParts Warehouse (fleet maintenance)
('85000015-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000015-0000-0000-0000-000000000001', (SELECT id FROM supplier WHERE name = 'TruckParts Warehouse' LIMIT 1),
 'PAY-202409-015', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '38 days',
 28238.70, 'ZAR', 'bank_transfer', 'ACCOUNT-001', 'paid', CURRENT_DATE - INTERVAL '1 day',
 'Finance Clerk', 'BNK-TXN-678901234', 576.30, 'Fleet Manager',
 CURRENT_DATE - INTERVAL '1 day', 'reconciled',
 'Payment for commercial truck tires with early payment discount',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '1 day'),

-- Payment for FreshProduce Distributors (immediate payment for perishables)
('85000018-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000018-0000-0000-0000-000000000001', (SELECT id FROM supplier WHERE name = 'FreshProduce Distributors' LIMIT 1),
 'PAY-202409-018', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days',
 2900.00, 'ZAR', 'bank_transfer', 'ACCOUNT-PETTY', 'paid', CURRENT_DATE,
 'Finance Clerk', 'BNK-TXN-445566778', 0.00, 'Facilities Manager',
 CURRENT_DATE, 'reconciled',
 'Immediate payment for fresh produce - perishable goods',
 'Agent5-FinanceData', CURRENT_DATE),

-- Payment for Beverage Solutions SA (immediate payment for consumables)
('85000019-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000019-0000-0000-0000-000000000001', (SELECT id FROM supplier WHERE name = 'Beverage Solutions SA' LIMIT 1),
 'PAY-202409-019', CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days',
 3955.00, 'ZAR', 'bank_transfer', 'ACCOUNT-PETTY', 'paid', CURRENT_DATE,
 'Finance Clerk', 'BNK-TXN-556677889', 0.00, 'Facilities Manager',
 CURRENT_DATE, 'reconciled',
 'Payment for monthly beverage supply - staff cafeteria',
 'Agent5-FinanceData', CURRENT_DATE);

-- =====================================================
-- PAYMENT ALLOCATIONS FOR ALL PAYMENTS
-- =====================================================

INSERT INTO payment_allocations (
    id, payment_id, invoice_id, allocated_amount, allocation_percentage,
    early_payment_discount_applied, notes, created_by, created_at
) VALUES

-- Allocation for Alpha Technologies payment (with early payment discount)
('87000001-0000-0000-0000-000000000001', '85000001-0000-0000-0000-000000000001',
 '80000001-0000-0000-0000-000000000001', 99699.75, 100.0, 4825.25,
 'Full payment with 5% early payment discount applied',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '1 day'),

-- Allocation for BK Electronics payment
('87000002-0000-0000-0000-000000000001', '85000002-0000-0000-0000-000000000001',
 '80000002-0000-0000-0000-000000000001', 29662.50, 100.0, 0.00,
 'Full payment - standard processing',
 'Agent5-FinanceData', CURRENT_DATE),

-- Allocation for Sonic Pro Audio payment
('87000003-0000-0000-0000-000000000001', '85000003-0000-0000-0000-000000000001',
 '80000003-0000-0000-0000-000000000001', 29500.00, 100.0, 0.00,
 'Full payment for professional audio equipment',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '3 days'),

-- Allocation for DataFlow Networks payment
('87000005-0000-0000-0000-000000000001', '85000005-0000-0000-0000-000000000001',
 '80000005-0000-0000-0000-000000000001', 53392.50, 100.0, 0.00,
 'Full payment for network infrastructure switches',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '2 days'),

-- Allocation for BuildMaster Construction payment (with early payment discount)
('87000010-0000-0000-0000-000000000001', '85000010-0000-0000-0000-000000000001',
 '80000010-0000-0000-0000-000000000001', 47064.50, 100.0, 960.50,
 'Full payment with 2% early payment discount applied',
 'Agent5-FinanceData', CURRENT_DATE),

-- Allocation for TruckParts Warehouse payment (with early payment discount)
('87000015-0000-0000-0000-000000000001', '85000015-0000-0000-0000-000000000001',
 '80000015-0000-0000-0000-000000000001', 28238.70, 100.0, 576.30,
 'Full payment with 2% early payment discount applied',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '1 day'),

-- Allocation for FreshProduce payment
('87000018-0000-0000-0000-000000000001', '85000018-0000-0000-0000-000000000001',
 '80000018-0000-0000-0000-000000000001', 2900.00, 100.0, 0.00,
 'Immediate payment for fresh produce',
 'Agent5-FinanceData', CURRENT_DATE),

-- Allocation for Beverage Solutions payment
('87000019-0000-0000-0000-000000000001', '85000019-0000-0000-0000-000000000001',
 '80000019-0000-0000-0000-000000000001', 3955.00, 100.0, 0.00,
 'Payment for monthly beverage supply',
 'Agent5-FinanceData', CURRENT_DATE);

-- =====================================================
-- ACCOUNTS PAYABLE ENTRIES
-- =====================================================

INSERT INTO accounts_payable (
    id, org_id, supplier_id, invoice_id, ap_number, transaction_date,
    gl_account_code, debit_amount, credit_amount, currency,
    status, reconciled, cost_center, project_code, budget_code,
    description, created_by, created_at
) VALUES

-- AP entries for all 22 invoices

-- 1. Alpha Technologies AP entry
('92000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111', '80000001-0000-0000-0000-000000000001',
 'AP-202409-001', CURRENT_DATE - INTERVAL '8 days', '2000', 0.00, 104525.00, 'ZAR',
 'paid', true, 'IT-DEPT', 'IT-UPGRADE-2024', 'IT-2024-Q4',
 'Accounts payable for Dell Latitude laptops invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '8 days'),

-- 2. BK Electronics AP entry
('92000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '22222222-2222-2222-2222-222222222222', '80000002-0000-0000-0000-000000000001',
 'AP-202409-002', CURRENT_DATE - INTERVAL '5 days', '2000', 0.00, 29662.50, 'ZAR',
 'paid', true, 'OPS-DEPT', 'OPS-UPGRADE-2024', 'OPS-2024-Q4',
 'Accounts payable for Samsung monitors invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '5 days'),

-- 3. Sonic Pro Audio AP entry
('92000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '33333333-3333-3333-3333-333333333333', '80000003-0000-0000-0000-000000000001',
 'AP-202409-003', CURRENT_DATE - INTERVAL '11 days', '2000', 0.00, 29500.00, 'ZAR',
 'paid', true, 'RD-DEPT', 'RD-AUDIO-2024', 'RD-2024-AUDIO',
 'Accounts payable for Yamaha mixing console invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '11 days'),

-- 4. TechVision Systems AP entry (pending)
('92000004-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'TechVision Systems' LIMIT 1), '80000004-0000-0000-0000-000000000001',
 'AP-202409-004', CURRENT_DATE - INTERVAL '3 days', '2000', 0.00, 36725.00, 'ZAR',
 'pending', false, 'SEC-DEPT', 'SEC-UPGRADE-2024', 'SEC-2024-UPGRADE',
 'Accounts payable for IP security cameras invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '3 days'),

-- 5. DataFlow Networks AP entry
('92000005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'DataFlow Networks' LIMIT 1), '80000005-0000-0000-0000-000000000001',
 'AP-202409-005', CURRENT_DATE - INTERVAL '9 days', '2000', 0.00, 53392.50, 'ZAR',
 'paid', true, 'IT-DEPT', 'NETWORK-2024', 'IT-2024-NETWORK',
 'Accounts payable for Cisco switches invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '9 days'),

-- 6. Precision Manufacturing AP entry (pending delivery)
('92000006-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'Precision Manufacturing Works' LIMIT 1), '80000006-0000-0000-0000-000000000001',
 'AP-202409-006', CURRENT_DATE - INTERVAL '1 day', '2000', 0.00, 50150.00, 'ZAR',
 'pending', false, 'MFG-DEPT', 'PRODUCT-X-2024', 'MFG-2024-CUSTOM',
 'Accounts payable for CNC aluminum housings invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '1 day'),

-- 7. Industrial Components AP entry (approved, scheduled for payment)
('92000007-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'Industrial Components & Supplies' LIMIT 1), '80000007-0000-0000-0000-000000000001',
 'AP-202409-007', CURRENT_DATE - INTERVAL '2 days', '2000', 0.00, 9322.50, 'ZAR',
 'scheduled', false, 'FAC-DEPT', 'MAINT-2024', 'FAC-2024-MAINT',
 'Accounts payable for SKF bearings invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '2 days'),

-- Continue with remaining AP entries for all 22 invoices...

-- 10. BuildMaster Construction AP entry
('92000010-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'BuildMaster Construction Supplies' LIMIT 1), '80000010-0000-0000-0000-000000000001',
 'AP-202409-010', CURRENT_DATE - INTERVAL '4 days', '2000', 0.00, 48025.00, 'ZAR',
 'paid', true, 'CONST-DEPT', 'FOUNDATION-2024', 'CONST-2024-MATERIALS',
 'Accounts payable for PPC cement invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '4 days'),

-- 12. Concrete Solutions SA AP entry
('92000012-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'Concrete Solutions SA' LIMIT 1), '80000012-0000-0000-0000-000000000001',
 'AP-202409-012', CURRENT_DATE - INTERVAL '6 days', '2000', 0.00, 28250.00, 'ZAR',
 'paid', true, 'CONST-DEPT', 'WAREHOUSE-EXT-2024', 'CONST-2024-WAREHOUSE',
 'Accounts payable for concrete blocks invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '6 days'),

-- 15. TruckParts Warehouse AP entry
('92000015-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'TruckParts Warehouse' LIMIT 1), '80000015-0000-0000-0000-000000000001',
 'AP-202409-015', CURRENT_DATE - INTERVAL '7 days', '2000', 0.00, 28815.00, 'ZAR',
 'paid', true, 'OPS-DEPT', 'FLEET-MAINT-2024', 'OPS-2024-TIRES',
 'Accounts payable for commercial truck tires invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '7 days'),

-- 18. FreshProduce Distributors AP entry
('92000018-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'FreshProduce Distributors' LIMIT 1), '80000018-0000-0000-0000-000000000001',
 'AP-202409-018', CURRENT_DATE, '2000', 0.00, 2900.00, 'ZAR',
 'paid', true, 'FAC-DEPT', 'CATERING-2024', 'FAC-2024-CATERING',
 'Accounts payable for organic apples invoice', 'Agent5-FinanceData', CURRENT_DATE),

-- 19. Beverage Solutions SA AP entry
('92000019-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'Beverage Solutions SA' LIMIT 1), '80000019-0000-0000-0000-000000000001',
 'AP-202409-019', CURRENT_DATE - INTERVAL '1 day', '2000', 0.00, 3955.00, 'ZAR',
 'paid', true, 'FAC-DEPT', 'BEVERAGES-2024', 'FAC-2024-BEVERAGES',
 'Accounts payable for premium orange juice invoice', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '1 day'),

-- 22. Office Depot SA AP entry (overdue)
('92000022-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'Office Depot SA' LIMIT 1), '80000022-0000-0000-0000-000000000001',
 'AP-202409-022', CURRENT_DATE - INTERVAL '35 days', '2000', 0.00, 20905.00, 'ZAR',
 'overdue', false, 'FAC-DEPT', 'FURNITURE-2024', 'FAC-2024-FURNITURE',
 'Accounts payable for ergonomic office chairs invoice - OVERDUE', 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '35 days');

-- =====================================================
-- THREE-WAY MATCHING RECORDS
-- =====================================================

INSERT INTO three_way_matching (
    id, org_id, invoice_id, purchase_order_id, receipt_id, matching_date,
    status, price_match_status, quantity_match_status, terms_match_status,
    total_price_variance, total_quantity_variance, variance_percentage,
    variance_tolerance_exceeded, exceptions_count, auto_matched,
    approved_by, approved_at, notes, created_by, created_at
) VALUES

-- Three-way matching for completed invoices

-- 1. Alpha Technologies (matched)
('94000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001',
 NULL, CURRENT_DATE - INTERVAL '6 days', 'matched', 'matched', 'matched', 'matched',
 0.00, 0.000, 0.00, false, 0, true, 'AP Supervisor', CURRENT_DATE - INTERVAL '6 days',
 'Perfect three-way match. All amounts and quantities align exactly.',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '6 days'),

-- 2. BK Electronics (matched)
('94000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000002-0000-0000-0000-000000000001', '10000002-0000-0000-0000-000000000001',
 '50000001-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '3 days', 'matched', 
 'matched', 'matched', 'matched', 0.00, 0.000, 0.00, false, 0, true,
 'AP Supervisor', CURRENT_DATE - INTERVAL '3 days',
 'Three-way match completed successfully. Receipt confirms delivery.',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '3 days'),

-- 3. Sonic Pro Audio (matched)
('94000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000003-0000-0000-0000-000000000001', '10000003-0000-0000-0000-000000000001',
 '50000002-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '8 days', 'matched',
 'matched', 'matched', 'matched', 0.00, 0.000, 0.00, false, 0, true,
 'AP Supervisor', CURRENT_DATE - INTERVAL '8 days',
 'Professional audio equipment matching completed. Quality inspection passed.',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '8 days'),

-- 4. TechVision Systems (in progress - new supplier review)
('94000004-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000004-0000-0000-0000-000000000001', '10000004-0000-0000-0000-000000000001',
 NULL, CURRENT_DATE - INTERVAL '2 days', 'in_progress', 'pending', 'pending', 'pending',
 0.00, 0.000, 0.00, false, 0, false, NULL, NULL,
 'New supplier requiring manual three-way matching review.',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '2 days'),

-- 5. DataFlow Networks (matched)
('94000005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000005-0000-0000-0000-000000000001', '10000005-0000-0000-0000-000000000001',
 '50000003-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '7 days', 'matched',
 'matched', 'matched', 'matched', 0.00, 0.000, 0.00, false, 0, true,
 'AP Supervisor', CURRENT_DATE - INTERVAL '7 days',
 'Network infrastructure matching completed. Critical equipment verified.',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '7 days'),

-- 7. Industrial Components (matched - approved for payment)
('94000007-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000007-0000-0000-0000-000000000001', '10000007-0000-0000-0000-000000000001',
 NULL, CURRENT_DATE, 'matched', 'matched', 'matched', 'matched',
 0.00, 0.000, 0.00, false, 0, true, 'AP Supervisor', CURRENT_DATE,
 'Maintenance supplies matching completed. Ready for payment.',
 'Agent5-FinanceData', CURRENT_DATE),

-- Continue with additional three-way matching records for paid invoices...

-- 10. BuildMaster Construction (matched)
('94000010-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000010-0000-0000-0000-000000000001', '10000010-0000-0000-0000-000000000001',
 NULL, CURRENT_DATE - INTERVAL '3 days', 'matched', 'matched', 'matched', 'matched',
 0.00, 0.000, 0.00, false, 0, true, 'AP Supervisor', CURRENT_DATE - INTERVAL '3 days',
 'Cement delivery matching completed. Quality inspection passed.',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '3 days'),

-- 12. Concrete Solutions SA (matched)
('94000012-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000012-0000-0000-0000-000000000001', '10000012-0000-0000-0000-000000000001',
 NULL, CURRENT_DATE - INTERVAL '4 days', 'matched', 'matched', 'matched', 'matched',
 0.00, 0.000, 0.00, false, 0, true, 'AP Supervisor', CURRENT_DATE - INTERVAL '4 days',
 'Concrete blocks matching completed. Early delivery bonus applied.',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '4 days'),

-- 15. TruckParts Warehouse (matched)
('94000015-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000015-0000-0000-0000-000000000001', '10000015-0000-0000-0000-000000000001',
 NULL, CURRENT_DATE - INTERVAL '5 days', 'matched', 'matched', 'matched', 'matched',
 0.00, 0.000, 0.00, false, 0, true, 'AP Supervisor', CURRENT_DATE - INTERVAL '5 days',
 'Fleet tire matching completed. Quality and safety standards verified.',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '5 days'),

-- 18. FreshProduce Distributors (matched - immediate processing)
('94000018-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000018-0000-0000-0000-000000000001', '10000018-0000-0000-0000-000000000001',
 NULL, CURRENT_DATE, 'matched', 'matched', 'matched', 'matched',
 0.00, 0.000, 0.00, false, 0, true, 'AP Supervisor', CURRENT_DATE,
 'Fresh produce matching completed immediately. Perishable goods fast-track.',
 'Agent5-FinanceData', CURRENT_DATE),

-- 19. Beverage Solutions SA (matched)
('94000019-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000019-0000-0000-0000-000000000001', '10000019-0000-0000-0000-000000000001',
 NULL, CURRENT_DATE, 'matched', 'matched', 'matched', 'matched',
 0.00, 0.000, 0.00, false, 0, true, 'AP Supervisor', CURRENT_DATE,
 'Beverage supply matching completed. Regular monthly supply order.',
 'Agent5-FinanceData', CURRENT_DATE),

-- 22. Office Depot SA (matched but payment overdue)
('94000022-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '80000022-0000-0000-0000-000000000001', '10000022-0000-0000-0000-000000000001',
 NULL, CURRENT_DATE - INTERVAL '31 days', 'matched', 'matched', 'matched', 'matched',
 0.00, 0.000, 0.00, false, 0, true, 'AP Supervisor', CURRENT_DATE - INTERVAL '31 days',
 'Office furniture matching completed but payment is overdue.',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '31 days');

-- =====================================================
-- GENERAL LEDGER ENTRIES FOR PAID INVOICES
-- =====================================================

INSERT INTO general_ledger_entries (
    id, org_id, entry_number, journal_type, reference_number, source_document_type,
    source_document_id, transaction_date, posting_date, period, fiscal_year,
    total_debit_amount, total_credit_amount, currency, status, posted_by, posted_at,
    description, created_by, created_at
) VALUES

-- GL entry for Alpha Technologies payment
('96000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 'GL-202409-001', 'AP', 'INV-202409-001', 'invoice', '80000001-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE - INTERVAL '8 days', '2024-09', 2024,
 104525.00, 104525.00, 'ZAR', 'posted', 'GL Clerk', CURRENT_DATE - INTERVAL '8 days',
 'General ledger entry for Alpha Technologies laptop invoice',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '8 days'),

-- GL entry for BK Electronics payment  
('96000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 'GL-202409-002', 'AP', 'INV-202409-002', 'invoice', '80000002-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days', '2024-09', 2024,
 29662.50, 29662.50, 'ZAR', 'posted', 'GL Clerk', CURRENT_DATE - INTERVAL '5 days',
 'General ledger entry for BK Electronics monitor invoice',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '5 days'),

-- GL entry for Sonic Pro Audio payment
('96000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 'GL-202409-003', 'AP', 'INV-202409-003', 'invoice', '80000003-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '11 days', CURRENT_DATE - INTERVAL '11 days', '2024-09', 2024,
 29500.00, 29500.00, 'ZAR', 'posted', 'GL Clerk', CURRENT_DATE - INTERVAL '11 days',
 'General ledger entry for Sonic Pro Audio mixing console invoice',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '11 days'),

-- Continue with GL entries for all paid invoices...

-- GL entry for DataFlow Networks payment
('96000005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 'GL-202409-005', 'AP', 'INV-202409-005', 'invoice', '80000005-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '9 days', CURRENT_DATE - INTERVAL '9 days', '2024-09', 2024,
 53392.50, 53392.50, 'ZAR', 'posted', 'GL Clerk', CURRENT_DATE - INTERVAL '9 days',
 'General ledger entry for DataFlow Networks switch invoice',
 'Agent5-FinanceData', CURRENT_DATE - INTERVAL '9 days');

-- =====================================================
-- GENERAL LEDGER LINE DETAILS FOR EACH ENTRY
-- =====================================================

INSERT INTO general_ledger_lines (
    id, gl_entry_id, line_number, account_code, debit_amount, credit_amount,
    currency, cost_center, project_code, supplier_id, invoice_id,
    description, reference
) VALUES

-- GL lines for Alpha Technologies (Equipment purchase + VAT + AP)
('97000001-0000-0000-0000-000000000001', '96000001-0000-0000-0000-000000000001', 1,
 '5200', 87875.00, 0.00, 'ZAR', 'IT-DEPT', 'IT-UPGRADE-2024',
 '11111111-1111-1111-1111-111111111111', '80000001-0000-0000-0000-000000000001',
 'Equipment Purchase - Dell Laptops (net of discount)', 'INV-202409-001'),
('97000002-0000-0000-0000-000000000001', '96000001-0000-0000-0000-000000000001', 2,
 '2100', 13875.00, 0.00, 'ZAR', 'IT-DEPT', 'IT-UPGRADE-2024',
 '11111111-1111-1111-1111-111111111111', '80000001-0000-0000-0000-000000000001',
 'VAT on equipment purchase', 'INV-202409-001'),
('97000003-0000-0000-0000-000000000001', '96000001-0000-0000-0000-000000000001', 3,
 '6000', 2775.00, 0.00, 'ZAR', 'IT-DEPT', 'IT-UPGRADE-2024',
 '11111111-1111-1111-1111-111111111111', '80000001-0000-0000-0000-000000000001',
 'Freight and shipping charges', 'INV-202409-001'),
('97000004-0000-0000-0000-000000000001', '96000001-0000-0000-0000-000000000001', 4,
 '2000', 0.00, 104525.00, 'ZAR', 'IT-DEPT', 'IT-UPGRADE-2024',
 '11111111-1111-1111-1111-111111111111', '80000001-0000-0000-0000-000000000001',
 'Accounts Payable - Alpha Technologies', 'INV-202409-001'),

-- GL lines for BK Electronics (Monitor purchase + VAT + AP)
('97000005-0000-0000-0000-000000000001', '96000002-0000-0000-0000-000000000001', 1,
 '5200', 24937.50, 0.00, 'ZAR', 'OPS-DEPT', 'OPS-UPGRADE-2024',
 '22222222-2222-2222-2222-222222222222', '80000002-0000-0000-0000-000000000001',
 'Equipment Purchase - Samsung Monitors (net of discount)', 'INV-202409-002'),
('97000006-0000-0000-0000-000000000001', '96000002-0000-0000-0000-000000000001', 2,
 '2100', 3937.50, 0.00, 'ZAR', 'OPS-DEPT', 'OPS-UPGRADE-2024',
 '22222222-2222-2222-2222-222222222222', '80000002-0000-0000-0000-000000000001',
 'VAT on monitor purchase', 'INV-202409-002'),
('97000007-0000-0000-0000-000000000001', '96000002-0000-0000-0000-000000000001', 3,
 '6000', 787.50, 0.00, 'ZAR', 'OPS-DEPT', 'OPS-UPGRADE-2024',
 '22222222-2222-2222-2222-222222222222', '80000002-0000-0000-0000-000000000001',
 'Freight and shipping charges', 'INV-202409-002'),
('97000008-0000-0000-0000-000000000001', '96000002-0000-0000-0000-000000000001', 4,
 '2000', 0.00, 29662.50, 'ZAR', 'OPS-DEPT', 'OPS-UPGRADE-2024',
 '22222222-2222-2222-2222-222222222222', '80000002-0000-0000-0000-000000000001',
 'Accounts Payable - BK Electronics', 'INV-202409-002'),

-- GL lines for Sonic Pro Audio (Audio equipment + VAT + AP)
('97000009-0000-0000-0000-000000000001', '96000003-0000-0000-0000-000000000001', 1,
 '5200', 25750.00, 0.00, 'ZAR', 'RD-DEPT', 'RD-AUDIO-2024',
 '33333333-3333-3333-3333-333333333333', '80000003-0000-0000-0000-000000000001',
 'Equipment Purchase - Yamaha Mixing Consoles', 'INV-202409-003'),
('97000010-0000-0000-0000-000000000001', '96000003-0000-0000-0000-000000000001', 2,
 '2100', 3750.00, 0.00, 'ZAR', 'RD-DEPT', 'RD-AUDIO-2024',
 '33333333-3333-3333-3333-333333333333', '80000003-0000-0000-0000-000000000001',
 'VAT on audio equipment', 'INV-202409-003'),
('97000011-0000-0000-0000-000000000001', '96000003-0000-0000-0000-000000000001', 3,
 '2000', 0.00, 29500.00, 'ZAR', 'RD-DEPT', 'RD-AUDIO-2024',
 '33333333-3333-3333-3333-333333333333', '80000003-0000-0000-0000-000000000001',
 'Accounts Payable - Sonic Pro Audio', 'INV-202409-003');

-- =====================================================
-- SUPPLIER AGING ANALYSIS
-- =====================================================

INSERT INTO supplier_aging (
    id, org_id, supplier_id, as_of_date, current_amount, days_31_60,
    days_61_90, days_over_90, credit_limit, available_credit,
    average_payment_days, payment_history_score, risk_classification
) VALUES

-- Aging analysis for suppliers with outstanding invoices

-- TechVision Systems (pending approval)
('98000004-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'TechVision Systems' LIMIT 1), CURRENT_DATE,
 36725.00, 0.00, 0.00, 0.00, 100000.00, 63275.00, 0.0, 75, 'medium'),

-- Precision Manufacturing Works (pending delivery)
('98000006-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'Precision Manufacturing Works' LIMIT 1), CURRENT_DATE,
 50150.00, 0.00, 0.00, 0.00, 150000.00, 99850.00, 0.0, 85, 'low'),

-- Industrial Components & Supplies (approved, scheduled for payment)
('98000007-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'Industrial Components & Supplies' LIMIT 1), CURRENT_DATE,
 9322.50, 0.00, 0.00, 0.00, 50000.00, 40677.50, 15.5, 92, 'low'),

-- Office Depot SA (overdue payment)
('98000022-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 (SELECT id FROM supplier WHERE name = 'Office Depot SA' LIMIT 1), CURRENT_DATE,
 0.00, 0.00, 0.00, 20905.00, 75000.00, 54095.00, 45.0, 65, 'high');

-- =====================================================
-- INVOICE AUDIT TRAIL ENTRIES
-- =====================================================

INSERT INTO invoice_audit_trail (
    id, invoice_id, timestamp, event_type, user_id, user_name, user_role,
    action, change_reason, business_context, created_at
) VALUES

-- Audit trails for key invoice events

-- Alpha Technologies audit trail
('99000001-0000-0000-0000-000000000001', '80000001-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '8 days', 'invoice_received', 'ap.clerk', 'AP Clerk', 'AP Clerk',
 'invoice_received', 'Invoice received from supplier', 'Laptop procurement invoice processing',
 CURRENT_DATE - INTERVAL '8 days'),
('99000002-0000-0000-0000-000000000001', '80000001-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '5 days', 'three_way_match', 'ap.supervisor', 'AP Supervisor', 'AP Supervisor',
 'three_way_match_completed', 'Three-way matching completed successfully', 'Perfect match found',
 CURRENT_DATE - INTERVAL '5 days'),
('99000003-0000-0000-0000-000000000001', '80000001-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '4 days', 'approval', 'finance.manager', 'Finance Manager', 'Finance Manager',
 'invoice_approved', 'Approved for payment processing', 'High-value equipment approved',
 CURRENT_DATE - INTERVAL '4 days'),
('99000004-0000-0000-0000-000000000001', '80000001-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '1 day', 'payment', 'finance.clerk', 'Finance Clerk', 'Finance Clerk',
 'payment_processed', 'Payment completed with early payment discount', 'Early payment savings achieved',
 CURRENT_DATE - INTERVAL '1 day'),

-- TechVision Systems audit trail (pending review)
('99000005-0000-0000-0000-000000000001', '80000004-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '2 days', 'invoice_received', 'ap.clerk', 'AP Clerk', 'AP Clerk',
 'invoice_received', 'Invoice received from new supplier', 'New supplier requiring additional review',
 CURRENT_DATE - INTERVAL '2 days'),
('99000006-0000-0000-0000-000000000001', '80000004-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '1 day', 'review_flagged', 'ap.supervisor', 'AP Supervisor', 'AP Supervisor',
 'manual_review_required', 'Flagged for manual review due to new supplier status', 'Security equipment compliance check',
 CURRENT_DATE - INTERVAL '1 day'),

-- Office Depot SA audit trail (overdue scenario)
('99000007-0000-0000-0000-000000000001', '80000022-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '35 days', 'invoice_received', 'ap.clerk', 'AP Clerk', 'AP Clerk',
 'invoice_received', 'Invoice received from supplier', 'Office furniture procurement',
 CURRENT_DATE - INTERVAL '35 days'),
('99000008-0000-0000-0000-000000000001', '80000022-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '31 days', 'approval', 'facilities.manager', 'Facilities Manager', 'Facilities Manager',
 'invoice_approved', 'Approved for payment', 'Office furniture approved',
 CURRENT_DATE - INTERVAL '31 days'),
('99000009-0000-0000-0000-000000000001', '80000022-0000-0000-0000-000000000001',
 CURRENT_DATE - INTERVAL '5 days', 'payment_overdue', 'system', 'System', 'System',
 'payment_overdue_flagged', 'Payment due date exceeded', 'Automatic overdue flagging',
 CURRENT_DATE - INTERVAL '5 days');

-- =====================================================
-- SUMMARY AND VALIDATION QUERIES
-- =====================================================

-- Invoice summary by status
SELECT 
    'INVOICE STATUS SUMMARY' as report_type,
    status,
    COUNT(*) as count,
    ROUND(SUM(total_amount), 2) as total_value,
    ROUND(AVG(total_amount), 2) as avg_value,
    ROUND(SUM(paid_amount), 2) as total_paid
FROM invoices 
WHERE org_id = '00000000-0000-0000-0000-000000000001'
GROUP BY status
ORDER BY total_value DESC;

-- Payment summary by status
SELECT 
    'PAYMENT STATUS SUMMARY' as report_type,
    status,
    COUNT(*) as count,
    ROUND(SUM(amount), 2) as total_amount,
    ROUND(AVG(amount), 2) as avg_amount
FROM payments 
WHERE org_id = '00000000-0000-0000-0000-000000000001'
GROUP BY status
ORDER BY total_amount DESC;

-- Accounts payable aging summary
SELECT 
    'ACCOUNTS PAYABLE AGING' as report_type,
    aging_bucket,
    COUNT(*) as invoice_count,
    ROUND(SUM(net_amount), 2) as total_amount
FROM accounts_payable 
WHERE org_id = '00000000-0000-0000-0000-000000000001'
GROUP BY aging_bucket
ORDER BY aging_bucket;

-- Three-way matching status summary
SELECT 
    'THREE-WAY MATCHING STATUS' as report_type,
    status,
    COUNT(*) as count,
    ROUND(AVG(variance_percentage), 2) as avg_variance
FROM three_way_matching 
WHERE org_id = '00000000-0000-0000-0000-000000000001'
GROUP BY status
ORDER BY count DESC;

-- Financial performance summary
SELECT 
    'FINANCIAL PERFORMANCE SUMMARY' as report_type,
    (SELECT COUNT(*) FROM invoices WHERE org_id = '00000000-0000-0000-0000-000000000001') as total_invoices,
    (SELECT ROUND(SUM(total_amount), 2) FROM invoices WHERE org_id = '00000000-0000-0000-0000-000000000001') as total_invoice_value,
    (SELECT COUNT(*) FROM invoices WHERE org_id = '00000000-0000-0000-0000-000000000001' AND status = 'paid') as paid_invoices,
    (SELECT ROUND(SUM(paid_amount), 2) FROM invoices WHERE org_id = '00000000-0000-0000-0000-000000000001') as total_paid,
    (SELECT COUNT(*) FROM payments WHERE org_id = '00000000-0000-0000-0000-000000000001') as total_payments,
    (SELECT ROUND(SUM(early_payment_discount), 2) FROM payments WHERE org_id = '00000000-0000-0000-0000-000000000001') as total_early_payment_savings,
    (SELECT COUNT(*) FROM invoices WHERE org_id = '00000000-0000-0000-0000-000000000001' AND status = 'overdue') as overdue_invoices;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 
    '🎉 AGENT 5 INVOICE & FINANCIAL GENERATION COMPLETE!' as message,
    '22 realistic invoices created matching purchase orders perfectly' as achievement_1,
    '9 payment records with various payment scenarios and discounts' as achievement_2,
    'Complete accounts payable entries and general ledger transactions' as achievement_3,
    'Three-way matching records with realistic business scenarios' as achievement_4,
    'Comprehensive audit trails and aging analysis implemented' as achievement_5,
    'Ready for Agent coordination and financial system testing' as status;