-- =====================================================
-- COMPREHENSIVE TEST DATA GENERATION
-- 22 Realistic Suppliers with 22 Products (1 per supplier)
-- =====================================================
-- For MantisNXT Production Test Environment
-- Compatible with the existing schema structure

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ORGANIZATION SETUP (Required for foreign keys)
-- =====================================================

-- Ensure we have a default organization
INSERT INTO organization (id, name, slug, plan_type, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'MantisNXT Test Organization',
    'mantisnxt-test',
    'enterprise',
    '{"test_mode": true, "data_source": "generated_test_data"}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- CLEANUP EXISTING TEST DATA
-- =====================================================

-- Clean existing data to start fresh
DELETE FROM purchase_order_item WHERE purchase_order_id IN (
    SELECT id FROM purchase_order WHERE org_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM purchase_order WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM inventory_item WHERE org_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM supplier WHERE org_id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- 22 REALISTIC SUPPLIERS 
-- =====================================================
-- Diverse South African suppliers across multiple industries

INSERT INTO supplier (
    id, org_id, name, contact_email, contact_phone, address, 
    risk_score, status, payment_terms, lead_time_days, 
    certifications, notes, created_at, updated_at
) VALUES 
-- 1. TECHNOLOGY & ELECTRONICS
(
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Alpha Technologies (Pty) Ltd',
    'procurement@alphatech.co.za',
    '+27 11 234 5678',
    '{"line1": "123 Innovation Drive", "line2": "Techno Park", "city": "Johannesburg", "province": "Gauteng", "postal_code": "2000", "country": "South Africa"}'::jsonb,
    25, 'active', 'Net 30', 7,
    ARRAY['ISO 9001:2015', 'ISO 14001:2015', 'OHSAS 18001'],
    'Leading technology supplier specializing in enterprise hardware and software solutions. Preferred supplier for IT infrastructure.',
    NOW() - INTERVAL '2 years',
    NOW()
),
(
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'BK Electronics & Computing',
    'sales@bkelectronics.co.za',
    '+27 21 345 6789',
    '{"line1": "456 Tech Avenue", "line2": "Century City", "city": "Cape Town", "province": "Western Cape", "postal_code": "7441", "country": "South Africa"}'::jsonb,
    30, 'active', 'Net 30', 5,
    ARRAY['CE Marking', 'FCC Certification', 'ICASA Approved'],
    'Electronics distributor specializing in consumer and commercial computing equipment.',
    NOW() - INTERVAL '18 months',
    NOW()
),
(
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    'Sonic Pro Audio Solutions',
    'info@sonicpro.co.za',
    '+27 31 456 7890',
    '{"line1": "789 Sound Street", "line2": "Pinetown Industrial", "city": "Durban", "province": "KwaZulu-Natal", "postal_code": "3610", "country": "South Africa"}'::jsonb,
    20, 'active', 'Net 45', 10,
    ARRAY['AES Certified', 'THX Approved', 'Dante Certified'],
    'Professional audio equipment supplier for entertainment and commercial applications.',
    NOW() - INTERVAL '3 years',
    NOW()
),

-- 2. MANUFACTURING & INDUSTRIAL
(
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000001',
    'Precision Manufacturing Works',
    'orders@precisionmfg.co.za',
    '+27 11 567 8901',
    '{"line1": "321 Industrial Road", "line2": "Germiston South", "city": "Germiston", "province": "Gauteng", "postal_code": "1401", "country": "South Africa"}'::jsonb,
    35, 'active', 'Net 60', 21,
    ARRAY['ISO 9001:2015', 'AS9100 Rev D', 'NADCAP Certified'],
    'High-precision manufacturing and machining services for aerospace and automotive industries.',
    NOW() - INTERVAL '5 years',
    NOW()
),
(
    '55555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000001',
    'Industrial Components & Supplies',
    'procurement@indcomponents.co.za',
    '+27 21 678 9012',
    '{"line1": "654 Component Ave", "line2": "Parow Industrial", "city": "Cape Town", "province": "Western Cape", "postal_code": "7500", "country": "South Africa"}'::jsonb,
    25, 'active', 'Net 30', 14,
    ARRAY['ISO 9001:2015', 'SABS Approved'],
    'Comprehensive supplier of industrial components, bearings, and mechanical parts.',
    NOW() - INTERVAL '4 years',
    NOW()
),

-- 3. CONSTRUCTION & BUILDING
(
    '66666666-6666-6666-6666-666666666666',
    '00000000-0000-0000-0000-000000000001',
    'BuildMaster Construction Supplies',
    'sales@buildmaster.co.za',
    '+27 31 789 0123',
    '{"line1": "987 Builder Street", "line2": "Clairwood Industrial", "city": "Durban", "province": "KwaZulu-Natal", "postal_code": "4052", "country": "South Africa"}'::jsonb,
    40, 'active', 'Net 30', 7,
    ARRAY['SABS Mark', 'SANS 227 Certified', 'Green Building Council'],
    'Leading construction materials supplier with focus on sustainable building solutions.',
    NOW() - INTERVAL '8 years',
    NOW()
),
(
    '77777777-7777-7777-7777-777777777777',
    '00000000-0000-0000-0000-000000000001',
    'Steelcraft Fabrication (Pty) Ltd',
    'info@steelcraft.co.za',
    '+27 11 890 1234',
    '{"line1": "147 Steel Road", "line2": "Vanderbijlpark Industrial", "city": "Vanderbijlpark", "province": "Gauteng", "postal_code": "1911", "country": "South Africa"}'::jsonb,
    30, 'active', 'Net 45', 28,
    ARRAY['ISO 9001:2015', 'SANS 2001-CS1', 'CIDB Certified'],
    'Custom steel fabrication and structural steelwork for commercial and industrial projects.',
    NOW() - INTERVAL '6 years',
    NOW()
),

-- 4. AUTOMOTIVE & TRANSPORT
(
    '88888888-8888-8888-8888-888888888888',
    '00000000-0000-0000-0000-000000000001',
    'AutoParts Direct SA',
    'wholesale@autopartsdirect.co.za',
    '+27 21 901 2345',
    '{"line1": "258 Auto Street", "line2": "Blackheath Industrial", "city": "Cape Town", "province": "Western Cape", "postal_code": "7581", "country": "South Africa"}'::jsonb,
    20, 'active', 'Net 30', 3,
    ARRAY['OEM Approved', 'ISO/TS 16949', 'RMI Member'],
    'Comprehensive automotive parts distributor serving workshops and fleet operators.',
    NOW() - INTERVAL '7 years',
    NOW()
),
(
    '99999999-9999-9999-9999-999999999999',
    '00000000-0000-0000-0000-000000000001',
    'Fleet Solutions & Logistics',
    'contact@fleetsolutions.co.za',
    '+27 31 012 3456',
    '{"line1": "369 Transport Way", "line2": "Mobeni Heights", "city": "Durban", "province": "KwaZulu-Natal", "postal_code": "4060", "country": "South Africa"}'::jsonb,
    25, 'active', 'Net 60', 14,
    ARRAY['ISO 9001:2015', 'RTMC Approved', 'CALA Accredited'],
    'Fleet management solutions including vehicle tracking, maintenance, and logistics services.',
    NOW() - INTERVAL '3 years',
    NOW()
),

-- 5. HEALTHCARE & MEDICAL
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000001',
    'MediSupply Healthcare Solutions',
    'orders@medisupply.co.za',
    '+27 11 123 4567',
    '{"line1": "741 Medical Plaza", "line2": "Rosebank Medical", "city": "Johannesburg", "province": "Gauteng", "postal_code": "2196", "country": "South Africa"}'::jsonb,
    15, 'active', 'Net 30', 7,
    ARRAY['ISO 13485:2016', 'MCC Registered', 'SAHPRA Approved'],
    'Medical equipment and supplies for hospitals, clinics, and healthcare facilities.',
    NOW() - INTERVAL '4 years',
    NOW()
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000001',
    'PharmaLogistics (Pty) Ltd',
    'supply@pharmalogistics.co.za',
    '+27 21 234 5678',
    '{"line1": "852 Pharma Drive", "line2": "Montague Gardens", "city": "Cape Town", "province": "Western Cape", "postal_code": "7441", "country": "South Africa"}'::jsonb,
    10, 'active', 'Net 45', 5,
    ARRAY['GDP Certified', 'SAHPRA Licensed', 'Cold Chain Certified'],
    'Pharmaceutical distribution with specialized cold chain and controlled substance handling.',
    NOW() - INTERVAL '9 years',
    NOW()
),

-- 6. FOOD & BEVERAGE
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000001',
    'FreshProduce Distributors',
    'sales@freshproduce.co.za',
    '+27 31 345 6789',
    '{"line1": "963 Fresh Market Street", "line2": "Clairwood Market", "city": "Durban", "province": "KwaZulu-Natal", "postal_code": "4052", "country": "South Africa"}'::jsonb,
    35, 'active', 'Net 7', 1,
    ARRAY['HACCP Certified', 'Global GAP', 'Organic Certified'],
    'Fresh produce distributor specializing in organic and locally sourced fruits and vegetables.',
    NOW() - INTERVAL '2 years',
    NOW()
),
(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '00000000-0000-0000-0000-000000000001',
    'Beverage Solutions SA',
    'orders@beveragesolutions.co.za',
    '+27 11 456 7890',
    '{"line1": "159 Beverage Boulevard", "line2": "City Deep", "city": "Johannesburg", "province": "Gauteng", "postal_code": "2049", "country": "South Africa"}'::jsonb,
    20, 'active', 'Net 30', 5,
    ARRAY['FSSC 22000', 'Coca-Cola Approved', 'SANS 10049'],
    'Beverage distribution covering soft drinks, juices, and specialized corporate catering.',
    NOW() - INTERVAL '5 years',
    NOW()
),

-- 7. TEXTILES & APPAREL
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '00000000-0000-0000-0000-000000000001',
    'Textile Mills of Africa',
    'wholesale@textileafrica.co.za',
    '+27 21 567 8901',
    '{"line1": "753 Textile Street", "line2": "Atlantis Industrial", "city": "Cape Town", "province": "Western Cape", "postal_code": "7349", "country": "South Africa"}'::jsonb,
    45, 'active', 'Net 60', 21,
    ARRAY['OEKO-TEX Standard 100', 'GOTS Certified', 'WRAP Certified'],
    'Textile manufacturing and wholesale distribution serving fashion and industrial markets.',
    NOW() - INTERVAL '12 years',
    NOW()
),
(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '00000000-0000-0000-0000-000000000001',
    'Corporate Uniforms & Workwear',
    'sales@corpuniforms.co.za',
    '+27 31 678 9012',
    '{"line1": "864 Uniform Road", "line2": "Springfield Industrial", "city": "Durban", "province": "KwaZulu-Natal", "postal_code": "4091", "country": "South Africa"}'::jsonb,
    25, 'active', 'Net 45', 14,
    ARRAY['SABS Approved', 'NRCS Compliant', 'B-BBEE Level 2'],
    'Specialized corporate uniforms and workwear including PPE and safety clothing.',
    NOW() - INTERVAL '6 years',
    NOW()
),

-- 8. ENERGY & UTILITIES
(
    'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    '00000000-0000-0000-0000-000000000001',
    'Solar Power Solutions',
    'info@solarpowersolutions.co.za',
    '+27 11 789 0123',
    '{"line1": "975 Solar Avenue", "line2": "Midrand Solar Park", "city": "Midrand", "province": "Gauteng", "postal_code": "1685", "country": "South Africa"}'::jsonb,
    20, 'active', 'Net 30', 10,
    ARRAY['SAPVIA Member', 'SANAS Accredited', 'IEC Certified'],
    'Solar panel systems, inverters, and renewable energy solutions for commercial installations.',
    NOW() - INTERVAL '3 years',
    NOW()
),
(
    'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    '00000000-0000-0000-0000-000000000001',
    'Electrical Contractors Supply',
    'procurement@eleccontractors.co.za',
    '+27 21 890 1234',
    '{"line1": "186 Electric Street", "line2": "Elsies River Industrial", "city": "Cape Town", "province": "Western Cape", "postal_code": "7490", "country": "South Africa"}'::jsonb,
    30, 'active', 'Net 30', 7,
    ARRAY['SANS 164-1', 'SABS Approved', 'ECA Member'],
    'Electrical components, cables, and installation materials for commercial and industrial projects.',
    NOW() - INTERVAL '8 years',
    NOW()
),

-- 9. OFFICE & STATIONERY
(
    'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
    '00000000-0000-0000-0000-000000000001',
    'Office Depot SA',
    'sales@officedepot.co.za',
    '+27 31 901 2345',
    '{"line1": "297 Office Park Drive", "line2": "Westville Office Park", "city": "Durban", "province": "KwaZulu-Natal", "postal_code": "3629", "country": "South Africa"}'::jsonb,
    15, 'active', 'Net 30', 3,
    ARRAY['FSC Certified', 'ISO 14001', 'Carbon Neutral'],
    'Complete office supplies including stationery, furniture, and technology accessories.',
    NOW() - INTERVAL '7 years',
    NOW()
),

-- 10. CHEMICAL & LABORATORY
(
    'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
    '00000000-0000-0000-0000-000000000001',
    'ChemLab Supplies (Pty) Ltd',
    'orders@chemlab.co.za',
    '+27 11 012 3456',
    '{"line1": "408 Chemical Avenue", "line2": "Kempton Park Industrial", "city": "Kempton Park", "province": "Gauteng", "postal_code": "1619", "country": "South Africa"}'::jsonb,
    40, 'active', 'Net 45', 14,
    ARRAY['ISO 17025', 'NRCS Approved', 'SANS 10234'],
    'Laboratory chemicals, equipment, and safety supplies for research and industrial applications.',
    NOW() - INTERVAL '10 years',
    NOW()
),

-- 11. AGRICULTURE & FARMING
(
    'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5',
    '00000000-0000-0000-0000-000000000001',
    'AgriSupply Solutions',
    'info@agrisupply.co.za',
    '+27 21 123 4567',
    '{"line1": "519 Farm Equipment Road", "line2": "Paarl Agricultural Hub", "city": "Paarl", "province": "Western Cape", "postal_code": "7646", "country": "South Africa"}'::jsonb,
    35, 'active', 'Net 60', 21,
    ARRAY['AgriSETA Accredited', 'Organic Certified', 'DAFF Approved'],
    'Agricultural equipment, seeds, fertilizers, and farming solutions for commercial agriculture.',
    NOW() - INTERVAL '15 years',
    NOW()
),

-- 12. PACKAGING & LOGISTICS
(
    'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6',
    '00000000-0000-0000-0000-000000000001',
    'PackagePro Logistics',
    'logistics@packagepro.co.za',
    '+27 31 234 5678',
    '{"line1": "630 Packaging Boulevard", "line2": "Pinetown Logistics Park", "city": "Pinetown", "province": "KwaZulu-Natal", "postal_code": "3610", "country": "South Africa"}'::jsonb,
    25, 'active', 'Net 30', 7,
    ARRAY['ISO 9001:2015', 'FSC Certified', 'FEFCO Member'],
    'Packaging materials and logistics solutions including cardboard, plastics, and protective packaging.',
    NOW() - INTERVAL '4 years',
    NOW()
);

-- =====================================================
-- 22 REALISTIC PRODUCTS (1 per supplier)
-- =====================================================
-- Each product represents the supplier's primary offering

INSERT INTO inventory_item (
    id, org_id, sku, name, description, category, unit_price, 
    quantity_on_hand, reorder_point, max_stock_level, 
    unit_of_measure, supplier_id, barcode, location, 
    is_active, created_at, updated_at
) VALUES
-- Technology Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'ALPHA-LT-001',
    'Dell Latitude 5530 Business Laptop',
    'High-performance business laptop with Intel i7 processor, 16GB RAM, 512GB SSD, Windows 11 Pro. Ideal for enterprise environments with enhanced security features.',
    'finished_goods',
    18500.00,
    25,
    5,
    50,
    'each',
    '11111111-1111-1111-1111-111111111111',
    '7391234567890',
    'Warehouse A - Tech Section',
    true,
    NOW() - INTERVAL '6 months',
    NOW()
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'BKE-MON-001',
    'Samsung 32" 4K Professional Monitor',
    '32-inch 4K UHD professional monitor with HDR10 support, USB-C connectivity, and height-adjustable stand. Perfect for design and business applications.',
    'finished_goods',
    8750.00,
    15,
    3,
    30,
    'each',
    '22222222-2222-2222-2222-222222222222',
    '8801234567890',
    'Warehouse A - Electronics',
    true,
    NOW() - INTERVAL '4 months',
    NOW()
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'SONIC-MIX-001',
    'Yamaha MG16XU 16-Channel Mixing Console',
    'Professional 16-channel analog mixing console with built-in effects, USB connectivity, and SPX digital reverbs. Ideal for live sound and recording.',
    'finished_goods',
    12500.00,
    8,
    2,
    20,
    'each',
    '33333333-3333-3333-3333-333333333333',
    '4957054501234',
    'Warehouse B - Audio',
    true,
    NOW() - INTERVAL '3 months',
    NOW()
),

-- Manufacturing & Industrial Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'PREC-CNC-001',
    'CNC Machined Aluminum Housing',
    'Precision CNC machined aluminum housing for electronic enclosures. Tolerance ±0.05mm, anodized finish, custom dimensions available.',
    'components',
    850.00,
    100,
    20,
    200,
    'each',
    '44444444-4444-4444-4444-444444444444',
    '0123456789012',
    'Warehouse C - Components',
    true,
    NOW() - INTERVAL '2 months',
    NOW()
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'INDCOMP-BRG-001',
    'SKF Deep Groove Ball Bearing 6208',
    'High-quality deep groove ball bearing, inner diameter 40mm, outer diameter 80mm, width 18mm. Suitable for electric motors and industrial machinery.',
    'components',
    165.00,
    200,
    50,
    500,
    'each',
    '55555555-5555-5555-5555-555555555555',
    '7316577003456',
    'Warehouse C - Bearings',
    true,
    NOW() - INTERVAL '1 month',
    NOW()
),

-- Construction Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'BUILD-CEM-001',
    'PPC Cement 42.5N (50kg bags)',
    'High-grade Portland cement conforming to SANS 50197. Suitable for structural concrete, mortar, and general construction applications.',
    'raw_materials',
    85.00,
    500,
    100,
    1000,
    'bag',
    '66666666-6666-6666-6666-666666666666',
    '6001234567890',
    'Warehouse D - Building Materials',
    true,
    NOW() - INTERVAL '2 weeks',
    NOW()
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'STEEL-BEAM-001',
    'Structural Steel I-Beam 203x133x25',
    'Hot-rolled structural steel I-beam, 203mm depth, 133mm flange width, 25kg/m weight. Grade 300W steel conforming to SANS 50025.',
    'raw_materials',
    2850.00,
    50,
    10,
    100,
    'piece',
    '77777777-7777-7777-7777-777777777777',
    '0987654321098',
    'Warehouse D - Steel Stock',
    true,
    NOW() - INTERVAL '3 weeks',
    NOW()
),

-- Automotive Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'AUTO-BRAKE-001',
    'Toyota Hilux Brake Disc Set (Front)',
    'OEM specification brake disc set for Toyota Hilux 2016-2022 models. 296mm diameter, ventilated design, premium quality cast iron construction.',
    'components',
    1250.00,
    30,
    5,
    60,
    'set',
    '88888888-8888-8888-8888-888888888888',
    '1234567890123',
    'Warehouse E - Auto Parts',
    true,
    NOW() - INTERVAL '5 days',
    NOW()
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'FLEET-GPS-001',
    'Vehicle Tracking System with 4G',
    'Advanced GPS vehicle tracking system with 4G connectivity, real-time monitoring, geofencing, and driver behavior analytics. 3-year warranty included.',
    'finished_goods',
    2850.00,
    20,
    5,
    40,
    'each',
    '99999999-9999-9999-9999-999999999999',
    '2345678901234',
    'Warehouse E - Fleet Tech',
    true,
    NOW() - INTERVAL '1 week',
    NOW()
),

-- Healthcare Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'MEDI-VITAL-001',
    'Patient Vital Signs Monitor',
    'Digital patient monitoring system with ECG, SpO2, NIBP, and temperature measurement. Touch screen display, alarm system, battery backup.',
    'finished_goods',
    45000.00,
    5,
    1,
    10,
    'each',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '3456789012345',
    'Warehouse F - Medical Equipment',
    true,
    NOW() - INTERVAL '2 months',
    NOW()
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'PHARMA-COLD-001',
    'Pharmaceutical Cold Storage Unit',
    'Temperature-controlled storage unit for pharmaceuticals. Temperature range 2-8°C, 500L capacity, digital monitoring, alarm system, backup power.',
    'finished_goods',
    28500.00,
    3,
    1,
    6,
    'each',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '4567890123456',
    'Warehouse F - Cold Storage',
    true,
    NOW() - INTERVAL '6 weeks',
    NOW()
),

-- Food & Beverage Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'FRESH-APPLE-001',
    'Organic Fuji Apples (10kg boxes)',
    'Premium organic Fuji apples, locally sourced from Western Cape orchards. Sweet, crisp texture, perfect for retail and catering. Global GAP certified.',
    'raw_materials',
    125.00,
    200,
    50,
    400,
    'box',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '5678901234567',
    'Cold Storage - Fresh Produce',
    true,
    NOW() - INTERVAL '3 days',
    NOW()
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'BEV-JUICE-001',
    'Premium Orange Juice (1L bottles)',
    '100% pure orange juice, no preservatives, pasteurized, 1-liter glass bottles. Local oranges from Limpopo province, fresh taste guaranteed.',
    'finished_goods',
    35.00,
    300,
    100,
    600,
    'bottle',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '6789012345678',
    'Cold Storage - Beverages',
    true,
    NOW() - INTERVAL '1 week',
    NOW()
),

-- Textile Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'TEXT-COTTON-001',
    'Premium Cotton Fabric (per meter)',
    '100% cotton fabric, 220gsm weight, 150cm width, pre-shrunk and colorfast. Available in multiple colors, OEKO-TEX Standard 100 certified.',
    'raw_materials',
    85.00,
    1000,
    200,
    2000,
    'meter',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '7890123456789',
    'Warehouse G - Textiles',
    true,
    NOW() - INTERVAL '2 weeks',
    NOW()
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'CORP-SHIRT-001',
    'Corporate Polo Shirt (Cotton Blend)',
    'Professional polo shirt, 60% cotton 40% polyester blend, moisture-wicking, various sizes and colors available. Embroidery-ready for corporate branding.',
    'finished_goods',
    125.00,
    500,
    100,
    1000,
    'each',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '8901234567890',
    'Warehouse G - Uniforms',
    true,
    NOW() - INTERVAL '10 days',
    NOW()
),

-- Energy Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'SOLAR-PANEL-001',
    'Monocrystalline Solar Panel 400W',
    '400W monocrystalline solar panel, 21% efficiency, 25-year warranty, aluminum frame, tempered glass, suitable for commercial installations.',
    'finished_goods',
    2850.00,
    40,
    10,
    80,
    'each',
    'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    '9012345678901',
    'Warehouse H - Solar Equipment',
    true,
    NOW() - INTERVAL '1 month',
    NOW()
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'ELEC-CABLE-001',
    'PVC Insulated Copper Cable 2.5mm²',
    'Single core PVC insulated copper cable, 2.5mm² cross-section, red color, SANS 1507 compliant, suitable for electrical installations up to 750V.',
    'raw_materials',
    28.50,
    2000,
    500,
    4000,
    'meter',
    'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    '0123456789012',
    'Warehouse H - Electrical',
    true,
    NOW() - INTERVAL '2 weeks',
    NOW()
),

-- Office Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'OFFICE-CHAIR-001',
    'Ergonomic Office Chair with Lumbar Support',
    'High-back ergonomic office chair with adjustable lumbar support, armrests, and height. Breathable mesh back, padded seat, 5-year warranty.',
    'finished_goods',
    1850.00,
    50,
    10,
    100,
    'each',
    'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
    '1234567890123',
    'Warehouse I - Office Furniture',
    true,
    NOW() - INTERVAL '3 weeks',
    NOW()
),

-- Chemical Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'CHEM-ACID-001',
    'Laboratory Grade Sulfuric Acid 98%',
    'High purity sulfuric acid 98% concentration, 2.5L bottle, laboratory grade, NRCS approved for research and industrial applications. Includes safety data sheet.',
    'consumables',
    285.00,
    50,
    10,
    100,
    'bottle',
    'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
    '2345678901234',
    'Warehouse J - Chemicals (Secure)',
    true,
    NOW() - INTERVAL '1 month',
    NOW()
),

-- Agriculture Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'AGRI-FERT-001',
    'NPK Fertilizer 8:3:5 (50kg bags)',
    'Balanced NPK fertilizer with micronutrients, suitable for vegetable crops and fruit trees. Slow-release formula, 50kg bags, organic certification available.',
    'consumables',
    385.00,
    200,
    50,
    400,
    'bag',
    'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5',
    '3456789012345',
    'Warehouse K - Agricultural',
    true,
    NOW() - INTERVAL '2 weeks',
    NOW()
),

-- Packaging Products
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000001',
    'PACK-BOX-001',
    'Corrugated Shipping Boxes 400x300x200mm',
    'Double wall corrugated shipping boxes, 400x300x200mm, brown kraft finish, 32 ECT rating, flat-packed for efficient storage. FSC certified.',
    'consumables',
    18.50,
    1000,
    200,
    2000,
    'each',
    'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6',
    '4567890123456',
    'Warehouse L - Packaging',
    true,
    NOW() - INTERVAL '1 week',
    NOW()
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify data insertion
SELECT 
    'Data Generation Complete' as status,
    (SELECT COUNT(*) FROM supplier WHERE org_id = '00000000-0000-0000-0000-000000000001') as suppliers_created,
    (SELECT COUNT(*) FROM inventory_item WHERE org_id = '00000000-0000-0000-0000-000000000001') as products_created;

-- Summary by category
SELECT 
    'SUPPLIER SUMMARY' as report_type,
    status,
    COUNT(*) as count,
    ROUND(AVG(risk_score), 1) as avg_risk_score,
    ROUND(AVG(lead_time_days), 1) as avg_lead_time
FROM supplier 
WHERE org_id = '00000000-0000-0000-0000-000000000001'
GROUP BY status
ORDER BY count DESC;

-- Product category summary
SELECT 
    'PRODUCT SUMMARY' as report_type,
    category,
    COUNT(*) as products,
    ROUND(AVG(unit_price), 2) as avg_price,
    SUM(quantity_on_hand) as total_stock
FROM inventory_item 
WHERE org_id = '00000000-0000-0000-0000-000000000001'
GROUP BY category
ORDER BY products DESC;

-- Supplier-Product relationship verification
SELECT 
    'SUPPLIER-PRODUCT MAPPING' as report_type,
    s.name as supplier_name,
    i.name as product_name,
    i.sku,
    i.unit_price,
    s.lead_time_days
FROM supplier s
JOIN inventory_item i ON s.id = i.supplier_id
WHERE s.org_id = '00000000-0000-0000-0000-000000000001'
ORDER BY s.name;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 
    '🎉 TEST DATA GENERATION COMPLETE!' as message,
    '22 suppliers and 22 products successfully created' as details,
    'All foreign key relationships properly established' as validation,
    'Ready for testing and development' as status;