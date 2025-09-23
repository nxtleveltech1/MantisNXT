-- Create sample data for testing
-- Ensure organization exists
INSERT INTO organizations (name, slug) VALUES ('Default Organization', 'default-org') ON CONFLICT (slug) DO NOTHING;

-- Create sample suppliers with correct constraint values
INSERT INTO supplier (org_id, name, contact_email, contact_phone, status, performance_tier, performance_score, on_time_delivery_rate, quality_rating)
SELECT
    org.id,
    'Alpha Technologies',
    'contact@alphatech.co.za',
    '+27 11 123 4567',
    'active',
    'gold',
    85.5,
    92.0,
    4.5  -- Quality rating between 1-5
FROM organizations org WHERE org.slug = 'default-org'
ON CONFLICT DO NOTHING;

INSERT INTO supplier (org_id, name, contact_email, contact_phone, status, performance_tier, performance_score, on_time_delivery_rate, quality_rating)
SELECT
    org.id,
    'TechPro Suppliers',
    'info@techpro.co.za',
    '+27 21 987 6543',
    'active',
    'silver',
    78.2,
    87.5,
    3.8
FROM organizations org WHERE org.slug = 'default-org'
ON CONFLICT DO NOTHING;

INSERT INTO supplier (org_id, name, contact_email, contact_phone, status, performance_tier, performance_score, on_time_delivery_rate, quality_rating)
SELECT
    org.id,
    'Quality Electronics',
    'sales@qualityelec.co.za',
    '+27 31 555 0123',
    'active',
    'platinum',
    94.8,
    98.5,
    4.9
FROM organizations org WHERE org.slug = 'default-org'
ON CONFLICT DO NOTHING;

-- Create performance records for these suppliers
INSERT INTO supplier_performance (supplier_id, period_start, period_end, orders_placed, orders_delivered, orders_on_time, total_order_value, delivery_rate, on_time_rate, quality_score, response_time_hours, performance_tier)
SELECT
    s.id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    25,
    23,
    20,
    150000.00,
    92.0,
    87.0,
    4.5,
    4.2,
    'gold'
FROM supplier s WHERE s.name = 'Alpha Technologies'
ON CONFLICT (supplier_id, period_start, period_end) DO NOTHING;

INSERT INTO supplier_performance (supplier_id, period_start, period_end, orders_placed, orders_delivered, orders_on_time, total_order_value, delivery_rate, on_time_rate, quality_score, response_time_hours, performance_tier)
SELECT
    s.id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    18,
    16,
    14,
    98000.00,
    88.9,
    77.8,
    3.8,
    6.1,
    'silver'
FROM supplier s WHERE s.name = 'TechPro Suppliers'
ON CONFLICT (supplier_id, period_start, period_end) DO NOTHING;

INSERT INTO supplier_performance (supplier_id, period_start, period_end, orders_placed, orders_delivered, orders_on_time, total_order_value, delivery_rate, on_time_rate, quality_score, response_time_hours, performance_tier)
SELECT
    s.id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    35,
    35,
    34,
    275000.00,
    100.0,
    97.1,
    4.9,
    2.5,
    'platinum'
FROM supplier s WHERE s.name = 'Quality Electronics'
ON CONFLICT (supplier_id, period_start, period_end) DO NOTHING;

SELECT 'Sample data created successfully!' as status,
       (SELECT count(*) FROM supplier) as supplier_count,
       (SELECT count(*) FROM supplier_performance) as performance_count;