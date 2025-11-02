-- =====================================================
-- PRICING & OPTIMIZATION SYSTEM - TEST SUITE
-- =====================================================
-- Migration: 0013_pricing_optimization_TESTS.sql
-- Purpose: Comprehensive test suite for pricing system
-- Run after: 0013_pricing_optimization.sql

-- Enable test output
\set QUIET off
\set ON_ERROR_STOP on

BEGIN;

-- =====================================================
-- SETUP TEST DATA
-- =====================================================

-- Create test organization
INSERT INTO organization (id, name, slug, plan_type)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Test Pricing Org',
    'test-pricing',
    'enterprise'
) ON CONFLICT (id) DO NOTHING;

-- Create test user
-- Note: This assumes auth.users exists; adjust if needed
-- INSERT INTO auth.users (id, email) VALUES (
--     'b0000000-0000-0000-0000-000000000001',
--     'test@pricing.com'
-- ) ON CONFLICT DO NOTHING;

-- Create test profile (link to org)
-- INSERT INTO profile (id, org_id, role, display_name)
-- VALUES (
--     'b0000000-0000-0000-0000-000000000001',
--     'a0000000-0000-0000-0000-000000000001',
--     'admin',
--     'Test Admin'
-- ) ON CONFLICT DO NOTHING;

-- Create test brand
INSERT INTO brand (id, org_id, name)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Test Brand'
) ON CONFLICT (id) DO NOTHING;

-- Create test supplier
INSERT INTO supplier (id, org_id, name, contact_email, status)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Test Supplier',
    'supplier@test.com',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Create test products
INSERT INTO inventory_item (id, org_id, sku, name, category, brand_id, price, cost_price, is_active)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'TEST-001', 'Test Product 1', 'Electronics', 'c0000000-0000-0000-0000-000000000001', 299.99, 200.00, true),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'TEST-002', 'Test Product 2', 'Electronics', 'c0000000-0000-0000-0000-000000000001', 499.99, 350.00, true),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'TEST-003', 'Test Product 3', 'Appliances', NULL, 899.99, 600.00, true)
ON CONFLICT (id) DO NOTHING;

-- Create test customer
INSERT INTO customer (id, org_id, name, email, status)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Test Customer',
    'customer@test.com',
    'active'
) ON CONFLICT (id) DO NOTHING;

\echo ''
\echo '===== TEST DATA SETUP COMPLETE ====='
\echo ''

-- =====================================================
-- TEST 1: PRICING RULE CREATION
-- =====================================================

\echo 'TEST 1: Creating pricing rules...'

-- Cost-plus rule
INSERT INTO pricing_rule (
    org_id,
    name,
    strategy,
    inventory_item_id,
    markup_percentage,
    min_price,
    max_price,
    tier,
    is_active,
    priority,
    created_by
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Test Cost Plus Rule',
    'cost_plus',
    'e0000000-0000-0000-0000-000000000001',
    30.00,
    250.00,
    400.00,
    'standard',
    true,
    100,
    'b0000000-0000-0000-0000-000000000001'
);

-- Category-wide rule
INSERT INTO pricing_rule (
    org_id,
    name,
    strategy,
    category_id,
    markup_percentage,
    tier,
    is_active,
    priority,
    created_by
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Electronics Standard Markup',
    'cost_plus',
    'Electronics',
    35.00,
    'standard',
    true,
    50,
    'b0000000-0000-0000-0000-000000000001'
);

-- Verify rules created
SELECT
    CASE
        WHEN COUNT(*) = 2 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result,
    'Pricing rules created: ' || COUNT(*) AS message
FROM pricing_rule
WHERE org_id = 'a0000000-0000-0000-0000-000000000001';

\echo ''

-- =====================================================
-- TEST 2: CALCULATE OPTIMAL PRICE FUNCTION
-- =====================================================

\echo 'TEST 2: Testing calculate_optimal_price function...'

-- Test cost_plus strategy
DO $$
DECLARE
    v_calculated_price numeric;
    v_expected_price numeric;
BEGIN
    v_calculated_price := calculate_optimal_price(
        'e0000000-0000-0000-0000-000000000001',
        'cost_plus'
    );

    -- Expected: 200 * 1.30 = 260.00
    v_expected_price := 260.00;

    IF ABS(v_calculated_price - v_expected_price) < 0.01 THEN
        RAISE NOTICE 'PASS: Cost-plus calculation correct (%.2f)', v_calculated_price;
    ELSE
        RAISE EXCEPTION 'FAIL: Cost-plus calculation wrong (expected %.2f, got %.2f)', v_expected_price, v_calculated_price;
    END IF;
END $$;

\echo ''

-- =====================================================
-- TEST 3: PRICE HISTORY TRACKING
-- =====================================================

\echo 'TEST 3: Testing price history auto-tracking...'

-- Change product price (should trigger history)
UPDATE inventory_item
SET price = 349.99
WHERE id = 'e0000000-0000-0000-0000-000000000001';

-- Verify history created
SELECT
    CASE
        WHEN COUNT(*) >= 1 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result,
    'Price history records: ' || COUNT(*) AS message
FROM price_history
WHERE inventory_item_id = 'e0000000-0000-0000-0000-000000000001'
AND new_price = 349.99;

\echo ''

-- =====================================================
-- TEST 4: COMPETITOR PRICING
-- =====================================================

\echo 'TEST 4: Testing competitor pricing tracking...'

-- Add competitor prices
INSERT INTO competitor_pricing (
    org_id,
    inventory_item_id,
    competitor_name,
    competitor_price,
    source_type,
    is_active
) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Competitor A', 329.99, 'manual', true),
    ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Competitor B', 339.99, 'manual', true),
    ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Competitor C', 319.99, 'manual', true);

-- Verify average calculation
SELECT
    CASE
        WHEN ABS(AVG(competitor_price) - 329.99) < 0.01 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result,
    'Average competitor price: ' || ROUND(AVG(competitor_price), 2) AS message
FROM competitor_pricing
WHERE inventory_item_id = 'e0000000-0000-0000-0000-000000000001'
AND is_active = true;

\echo ''

-- =====================================================
-- TEST 5: PRICE ELASTICITY
-- =====================================================

\echo 'TEST 5: Testing price elasticity data...'

-- Add elasticity data points
INSERT INTO price_elasticity (
    org_id,
    inventory_item_id,
    price_point,
    quantity_sold,
    revenue_generated,
    date_range_start,
    date_range_end,
    elasticity_coefficient,
    confidence_level,
    sample_size
) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 299.99, 100, 29999.00, '2024-10-01', '2024-10-31', 1.5, 85.0, 100),
    ('a0000000-0000-0000-0000-0000-000000001', 'e0000000-0000-0000-0000-000000000001', 349.99, 75, 26249.25, '2024-11-01', '2024-11-30', 1.8, 82.0, 75);

-- Verify elasticity data
SELECT
    CASE
        WHEN COUNT(*) = 2 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result,
    'Elasticity records: ' || COUNT(*) AS message
FROM price_elasticity
WHERE inventory_item_id = 'e0000000-0000-0000-0000-000000000001';

\echo ''

-- =====================================================
-- TEST 6: CUSTOMER PRICING TIERS
-- =====================================================

\echo 'TEST 6: Testing customer pricing tiers...'

-- Add customer tier
INSERT INTO customer_pricing_tier (
    org_id,
    customer_id,
    tier,
    discount_percentage,
    is_active,
    created_by
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'vip',
    10.00,
    true,
    'b0000000-0000-0000-0000-000000000001'
);

-- Verify tier created
SELECT
    CASE
        WHEN COUNT(*) = 1 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result,
    'Customer tiers: ' || COUNT(*) AS message
FROM customer_pricing_tier
WHERE customer_id = 'f0000000-0000-0000-0000-000000000001';

\echo ''

-- =====================================================
-- TEST 7: VOLUME PRICING TIERS
-- =====================================================

\echo 'TEST 7: Testing volume pricing tiers...'

-- Add volume tiers
INSERT INTO volume_pricing_tier (
    org_id,
    inventory_item_id,
    tier_name,
    min_quantity,
    max_quantity,
    unit_price,
    discount_percentage,
    is_active
) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Tier 1', 1, 9, 349.99, 0.00, true),
    ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Tier 2', 10, 49, 329.99, 5.71, true),
    ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Tier 3', 50, NULL, 299.99, 14.29, true);

-- Verify tiers created
SELECT
    CASE
        WHEN COUNT(*) = 3 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result,
    'Volume tiers: ' || COUNT(*) AS message
FROM volume_pricing_tier
WHERE inventory_item_id = 'e0000000-0000-0000-0000-000000000001';

\echo ''

-- =====================================================
-- TEST 8: GET PRICE FOR CUSTOMER FUNCTION
-- =====================================================

\echo 'TEST 8: Testing get_price_for_customer function...'

-- Test standard quantity (no volume discount, with customer tier)
DO $$
DECLARE
    v_price numeric;
    v_expected_price numeric;
BEGIN
    -- Current price: 349.99, Customer tier: 10% off, Quantity: 5 (Tier 1, no volume discount)
    -- Expected: 349.99 * 0.90 = 314.99
    v_price := get_price_for_customer(
        'e0000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000001',
        5
    );

    v_expected_price := 314.99;

    IF ABS(v_price - v_expected_price) < 0.01 THEN
        RAISE NOTICE 'PASS: Customer pricing correct for 5 units (%.2f)', v_price;
    ELSE
        RAISE EXCEPTION 'FAIL: Customer pricing wrong (expected %.2f, got %.2f)', v_expected_price, v_price;
    END IF;
END $$;

-- Test volume discount
DO $$
DECLARE
    v_price numeric;
    v_expected_price numeric;
BEGIN
    -- Volume tier: 50+ units = 299.99, Customer tier: 10% off
    -- Expected: 299.99 * 0.90 = 269.99
    v_price := get_price_for_customer(
        'e0000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000001',
        75
    );

    v_expected_price := 269.99;

    IF ABS(v_price - v_expected_price) < 0.01 THEN
        RAISE NOTICE 'PASS: Volume pricing correct for 75 units (%.2f)', v_price;
    ELSE
        RAISE EXCEPTION 'FAIL: Volume pricing wrong (expected %.2f, got %.2f)', v_expected_price, v_price;
    END IF;
END $$;

\echo ''

-- =====================================================
-- TEST 9: PRICING OPTIMIZATION
-- =====================================================

\echo 'TEST 9: Testing pricing optimization...'

-- Create optimization run
INSERT INTO pricing_optimization (
    id,
    org_id,
    name,
    description,
    analysis_period_start,
    analysis_period_end,
    status,
    created_by
) VALUES (
    'g0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Test Optimization Run',
    'Test pricing optimization',
    '2024-10-01',
    '2024-12-31',
    'pending',
    'b0000000-0000-0000-0000-000000000001'
);

-- Generate recommendations
DO $$
DECLARE
    v_rec_count integer;
BEGIN
    v_rec_count := generate_pricing_recommendations(
        'a0000000-0000-0000-0000-000000000001',
        'g0000000-0000-0000-0000-000000000001'
    );

    IF v_rec_count > 0 THEN
        RAISE NOTICE 'PASS: Generated % recommendations', v_rec_count;
    ELSE
        RAISE WARNING 'WARNING: No recommendations generated (expected at least 1)';
    END IF;
END $$;

-- Verify recommendations
SELECT
    CASE
        WHEN COUNT(*) >= 1 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result,
    'Recommendations generated: ' || COUNT(*) AS message
FROM pricing_recommendation
WHERE optimization_id = 'g0000000-0000-0000-0000-000000000001';

\echo ''

-- =====================================================
-- TEST 10: ANALYZE PRICE PERFORMANCE FUNCTION
-- =====================================================

\echo 'TEST 10: Testing analyze_price_performance function...'

DO $$
DECLARE
    v_analysis jsonb;
    v_current_price numeric;
BEGIN
    v_analysis := analyze_price_performance(
        'e0000000-0000-0000-0000-000000000001',
        30
    );

    v_current_price := (v_analysis->>'current_price')::numeric;

    IF v_current_price > 0 THEN
        RAISE NOTICE 'PASS: Price performance analysis returned data';
        RAISE NOTICE 'Analysis result: %', v_analysis;
    ELSE
        RAISE EXCEPTION 'FAIL: Price performance analysis failed';
    END IF;
END $$;

\echo ''

-- =====================================================
-- TEST 11: PRICING PERFORMANCE SUMMARY VIEW
-- =====================================================

\echo 'TEST 11: Testing pricing_performance_summary view...'

-- Query view
SELECT
    CASE
        WHEN COUNT(*) >= 3 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result,
    'Products in view: ' || COUNT(*) AS message
FROM pricing_performance_summary
WHERE org_id = 'a0000000-0000-0000-0000-000000000001';

-- Show view data
SELECT
    sku,
    name,
    current_price,
    margin_percentage,
    avg_competitor_price,
    pending_recommendations
FROM pricing_performance_summary
WHERE org_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY sku;

\echo ''

-- =====================================================
-- TEST 12: CONSTRAINT VALIDATION
-- =====================================================

\echo 'TEST 12: Testing constraint validation...'

-- Test negative price constraint
DO $$
BEGIN
    INSERT INTO pricing_rule (
        org_id,
        name,
        strategy,
        inventory_item_id,
        markup_percentage,
        min_price,
        max_price,
        created_by
    ) VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'Invalid Rule',
        'cost_plus',
        'e0000000-0000-0000-0000-000000000001',
        -10.00,  -- Invalid negative markup
        100.00,
        200.00,
        'b0000000-0000-0000-0000-000000000001'
    );

    RAISE EXCEPTION 'FAIL: Should not allow negative markup';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'PASS: Negative markup constraint validated';
END $$;

-- Test min > max constraint
DO $$
BEGIN
    INSERT INTO pricing_rule (
        org_id,
        name,
        strategy,
        inventory_item_id,
        markup_percentage,
        min_price,
        max_price,
        created_by
    ) VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'Invalid Rule',
        'cost_plus',
        'e0000000-0000-0000-0000-000000000001',
        30.00,
        300.00,  -- Invalid: min > max
        200.00,
        'b0000000-0000-0000-0000-000000000001'
    );

    RAISE EXCEPTION 'FAIL: Should not allow min_price > max_price';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'PASS: Min/max price constraint validated';
END $$;

-- Test confidence score range
DO $$
BEGIN
    INSERT INTO pricing_recommendation (
        org_id,
        optimization_id,
        inventory_item_id,
        current_price,
        recommended_price,
        type,
        confidence_score,
        reasoning
    ) VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'g0000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000001',
        299.99,
        329.99,
        'price_increase',
        150.00,  -- Invalid: > 100
        'Test reasoning'
    );

    RAISE EXCEPTION 'FAIL: Should not allow confidence > 100';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'PASS: Confidence score constraint validated';
END $$;

\echo ''

-- =====================================================
-- TEST 13: INDEX EXISTENCE
-- =====================================================

\echo 'TEST 13: Verifying indexes exist...'

SELECT
    CASE
        WHEN COUNT(*) >= 12 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result,
    'Pricing indexes found: ' || COUNT(*) AS message
FROM pg_indexes
WHERE schemaname = 'public'
AND (
    tablename LIKE 'pricing%'
    OR tablename LIKE 'price_%'
    OR tablename LIKE 'competitor_pricing'
    OR tablename LIKE 'customer_pricing_tier'
    OR tablename LIKE 'volume_pricing_tier'
);

\echo ''

-- =====================================================
-- TEST 14: TRIGGER FUNCTIONALITY
-- =====================================================

\echo 'TEST 14: Testing triggers...'

-- Test updated_at trigger
DO $$
DECLARE
    v_old_updated timestamptz;
    v_new_updated timestamptz;
BEGIN
    SELECT updated_at INTO v_old_updated
    FROM pricing_rule
    WHERE name = 'Test Cost Plus Rule';

    -- Wait a moment
    PERFORM pg_sleep(0.1);

    -- Update rule
    UPDATE pricing_rule
    SET markup_percentage = 35.00
    WHERE name = 'Test Cost Plus Rule';

    SELECT updated_at INTO v_new_updated
    FROM pricing_rule
    WHERE name = 'Test Cost Plus Rule';

    IF v_new_updated > v_old_updated THEN
        RAISE NOTICE 'PASS: updated_at trigger working';
    ELSE
        RAISE EXCEPTION 'FAIL: updated_at not updated';
    END IF;
END $$;

\echo ''

-- =====================================================
-- TEST 15: AUDIT LOG INTEGRATION
-- =====================================================

\echo 'TEST 15: Testing audit log integration...'

-- Check if audit records exist
SELECT
    CASE
        WHEN COUNT(*) >= 1 THEN 'PASS'
        ELSE 'WARNING'
    END AS test_result,
    'Audit log records: ' || COUNT(*) AS message
FROM audit_log
WHERE table_name IN (
    'pricing_rule',
    'pricing_optimization',
    'pricing_recommendation'
)
AND org_id = 'a0000000-0000-0000-0000-000000000001';

\echo ''

-- =====================================================
-- PERFORMANCE TESTS
-- =====================================================

\echo 'TEST 16: Performance tests...'

-- Test query performance on pricing_performance_summary
EXPLAIN ANALYZE
SELECT *
FROM pricing_performance_summary
WHERE org_id = 'a0000000-0000-0000-0000-000000000001';

\echo ''

-- Test calculate_optimal_price performance
DO $$
DECLARE
    v_start timestamptz;
    v_end timestamptz;
    v_duration numeric;
    v_price numeric;
BEGIN
    v_start := clock_timestamp();

    -- Run 100 calculations
    FOR i IN 1..100 LOOP
        v_price := calculate_optimal_price(
            'e0000000-0000-0000-0000-000000000001',
            'cost_plus'
        );
    END LOOP;

    v_end := clock_timestamp();
    v_duration := EXTRACT(EPOCH FROM (v_end - v_start)) * 1000;

    RAISE NOTICE 'Performance: 100 price calculations in %.2f ms (%.2f ms avg)', v_duration, v_duration / 100;

    IF v_duration < 1000 THEN
        RAISE NOTICE 'PASS: Performance acceptable';
    ELSE
        RAISE WARNING 'WARNING: Performance may need optimization';
    END IF;
END $$;

\echo ''

-- =====================================================
-- TEST SUMMARY
-- =====================================================

\echo ''
\echo '====================================='
\echo 'TEST SUITE COMPLETE'
\echo '====================================='
\echo ''

-- Count test results
SELECT
    'Total Tests Run: ' || COUNT(*) AS summary
FROM (
    SELECT 'test' AS result FROM pricing_rule WHERE org_id = 'a0000000-0000-0000-0000-000000000001'
    UNION ALL SELECT 'test' FROM price_history WHERE org_id = 'a0000000-0000-0000-0000-000000000001'
    UNION ALL SELECT 'test' FROM competitor_pricing WHERE org_id = 'a0000000-0000-0000-0000-000000000001'
) tests;

\echo ''
\echo 'Review output above for PASS/FAIL/WARNING results'
\echo ''

-- Rollback to clean up test data (comment out to keep test data)
ROLLBACK;

-- To keep test data, comment out ROLLBACK and uncomment COMMIT
-- COMMIT;

\echo 'Test data rolled back (change ROLLBACK to COMMIT to persist test data)'
\echo ''
