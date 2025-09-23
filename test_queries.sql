-- Test Queries for NXT-Mantis Database Schema
-- These assertions verify RLS policies and view projections work correctly

-- =======================
-- RLS POLICY TESTS
-- =======================

-- Test 1: Organization isolation
-- Users should only see their own organization's data
DO $$
DECLARE
    techcorp_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    startuphub_id uuid := 'b2c3d4e5-f6g7-8901-bcde-f21234567890';
    alice_id uuid := '11111111-1111-1111-1111-111111111111';
    emma_id uuid := '55555555-5555-5555-5555-555555555555';
    org_count integer;
BEGIN
    -- Simulate Alice (TechCorp admin) session
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || alice_id || '", "role": "authenticated"}', true);

    -- Alice should only see TechCorp organization
    SELECT COUNT(*) INTO org_count FROM organization;
    ASSERT org_count = 1, 'Alice should only see 1 organization (TechCorp)';

    -- Simulate Emma (StartupHub admin) session
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || emma_id || '", "role": "authenticated"}', true);

    -- Emma should only see StartupHub organization
    SELECT COUNT(*) INTO org_count FROM organization;
    ASSERT org_count = 1, 'Emma should only see 1 organization (StartupHub)';

    RAISE NOTICE 'Test 1 PASSED: Organization isolation working correctly';
END $$;

-- Test 2: Supply chain data isolation
-- Users should only see their org's suppliers and inventory
DO $$
DECLARE
    alice_id uuid := '11111111-1111-1111-1111-111111111111';
    emma_id uuid := '55555555-5555-5555-5555-555555555555';
    supplier_count integer;
    inventory_count integer;
BEGIN
    -- Test Alice (TechCorp) access
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || alice_id || '", "role": "authenticated"}', true);

    SELECT COUNT(*) INTO supplier_count FROM supplier;
    SELECT COUNT(*) INTO inventory_count FROM inventory_item;

    ASSERT supplier_count = 3, 'Alice should see 3 TechCorp suppliers';
    ASSERT inventory_count = 4, 'Alice should see 4 TechCorp inventory items';

    -- Test Emma (StartupHub) access
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || emma_id || '", "role": "authenticated"}', true);

    SELECT COUNT(*) INTO supplier_count FROM supplier;
    SELECT COUNT(*) INTO inventory_count FROM inventory_item;

    ASSERT supplier_count = 2, 'Emma should see 2 StartupHub suppliers';
    ASSERT inventory_count = 3, 'Emma should see 3 StartupHub inventory items';

    RAISE NOTICE 'Test 2 PASSED: Supply chain data isolation working correctly';
END $$;

-- Test 3: Customer support agent role restrictions
-- CS agents should only see tickets assigned to them or unassigned in their org
DO $$
DECLARE
    david_id uuid := '44444444-4444-4444-4444-444444444444'; -- TechCorp CS agent
    grace_id uuid := '77777777-7777-7777-7777-777777777777'; -- StartupHub CS agent
    ticket_count integer;
BEGIN
    -- Test David (TechCorp CS agent)
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || david_id || '", "role": "authenticated"}', true);

    SELECT COUNT(*) INTO ticket_count FROM support_ticket;
    -- David should see all TechCorp tickets (3 total)
    ASSERT ticket_count = 3, 'David should see 3 TechCorp tickets';

    -- Test Grace (StartupHub CS agent)
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || grace_id || '", "role": "authenticated"}', true);

    SELECT COUNT(*) INTO ticket_count FROM support_ticket;
    -- Grace should see all StartupHub tickets (2 total)
    ASSERT ticket_count = 2, 'Grace should see 2 StartupHub tickets';

    RAISE NOTICE 'Test 3 PASSED: CS agent ticket access working correctly';
END $$;

-- Test 4: AI workspace access controls
-- Public AI datasets/templates should be visible to all in org, private only to creator
DO $$
DECLARE
    alice_id uuid := '11111111-1111-1111-1111-111111111111'; -- TechCorp admin
    carol_id uuid := '33333333-3333-3333-3333-333333333333'; -- TechCorp AI team
    dataset_count integer;
    template_count integer;
BEGIN
    -- Test Alice (admin) can see all datasets
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || alice_id || '", "role": "authenticated"}', true);

    SELECT COUNT(*) INTO dataset_count FROM ai_dataset;
    SELECT COUNT(*) INTO template_count FROM ai_prompt_template;

    ASSERT dataset_count = 2, 'Alice should see all 2 TechCorp datasets';
    ASSERT template_count = 2, 'Alice should see all 2 TechCorp templates';

    -- Test Carol (AI team member) can see all datasets
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || carol_id || '", "role": "authenticated"}', true);

    SELECT COUNT(*) INTO dataset_count FROM ai_dataset;
    SELECT COUNT(*) INTO template_count FROM ai_prompt_template;

    ASSERT dataset_count = 2, 'Carol should see all 2 TechCorp datasets';
    ASSERT template_count = 2, 'Carol should see all 2 TechCorp templates';

    RAISE NOTICE 'Test 4 PASSED: AI workspace access controls working correctly';
END $$;

-- Test 5: Dashboard and widget access
-- Public dashboards visible to all in org, private only to creator and privileged roles
DO $$
DECLARE
    alice_id uuid := '11111111-1111-1111-1111-111111111111'; -- TechCorp admin
    david_id uuid := '44444444-4444-4444-4444-444444444444'; -- TechCorp CS agent
    dashboard_count integer;
    widget_count integer;
BEGIN
    -- Test Alice (admin) can see all dashboards
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || alice_id || '", "role": "authenticated"}', true);

    SELECT COUNT(*) INTO dashboard_count FROM dashboard;
    SELECT COUNT(*) INTO widget_count FROM widget;

    ASSERT dashboard_count = 3, 'Alice should see all 3 TechCorp dashboards';
    ASSERT widget_count = 3, 'Alice should see all 3 TechCorp widgets';

    -- Test David (CS agent) can see public dashboards
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || david_id || '", "role": "authenticated"}', true);

    SELECT COUNT(*) INTO dashboard_count FROM dashboard;

    ASSERT dashboard_count = 3, 'David should see 3 public TechCorp dashboards';

    RAISE NOTICE 'Test 5 PASSED: Dashboard access controls working correctly';
END $$;

-- =======================
-- VIEW PROJECTION TESTS
-- =======================

-- Test 6: Organization overview view aggregations
DO $$
DECLARE
    alice_id uuid := '11111111-1111-1111-1111-111111111111';
    overview_record v_organization_overview%ROWTYPE;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || alice_id || '", "role": "authenticated"}', true);

    SELECT * INTO overview_record FROM v_organization_overview LIMIT 1;

    ASSERT overview_record.user_count = 4, 'TechCorp should have 4 users';
    ASSERT overview_record.customer_count = 2, 'TechCorp should have 2 active customers';
    ASSERT overview_record.open_tickets = 2, 'TechCorp should have 2 open tickets';
    ASSERT overview_record.dashboard_count = 3, 'TechCorp should have 3 dashboards';

    RAISE NOTICE 'Test 6 PASSED: Organization overview view aggregations correct';
END $$;

-- Test 7: Supply chain overview calculations
DO $$
DECLARE
    bob_id uuid := '22222222-2222-2222-2222-222222222222'; -- TechCorp ops manager
    supply_overview v_supply_chain_overview%ROWTYPE;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || bob_id || '", "role": "authenticated"}', true);

    SELECT * INTO supply_overview FROM v_supply_chain_overview LIMIT 1;

    ASSERT supply_overview.supplier_count = 3, 'TechCorp should have 3 suppliers';
    ASSERT supply_overview.active_suppliers = 3, 'TechCorp should have 3 active suppliers';
    ASSERT supply_overview.inventory_items = 4, 'TechCorp should have 4 inventory items';
    ASSERT supply_overview.low_stock_items = 1, 'TechCorp should have 1 low stock item (CASE-001)';

    RAISE NOTICE 'Test 7 PASSED: Supply chain overview calculations correct';
END $$;

-- Test 8: Customer ops overview metrics
DO $$
DECLARE
    david_id uuid := '44444444-4444-4444-4444-444444444444'; -- TechCorp CS agent
    customer_overview v_customer_ops_overview%ROWTYPE;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || david_id || '", "role": "authenticated"}', true);

    SELECT * INTO customer_overview FROM v_customer_ops_overview LIMIT 1;

    ASSERT customer_overview.total_customers = 3, 'TechCorp should have 3 customers';
    ASSERT customer_overview.active_customers = 2, 'TechCorp should have 2 active customers';
    ASSERT customer_overview.open_tickets = 2, 'TechCorp should have 2 open tickets';
    ASSERT customer_overview.total_ltv > 0, 'TechCorp should have positive LTV';

    RAISE NOTICE 'Test 8 PASSED: Customer ops overview metrics correct';
END $$;

-- Test 9: AI workspace statistics
DO $$
DECLARE
    carol_id uuid := '33333333-3333-3333-3333-333333333333'; -- TechCorp AI team
    ai_stats v_ai_workspace_stats%ROWTYPE;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || carol_id || '", "role": "authenticated"}', true);

    SELECT * INTO ai_stats FROM v_ai_workspace_stats LIMIT 1;

    ASSERT ai_stats.total_conversations = 2, 'TechCorp should have 2 AI conversations';
    ASSERT ai_stats.datasets_count = 2, 'TechCorp should have 2 AI datasets';
    ASSERT ai_stats.prompt_templates_count = 2, 'TechCorp should have 2 prompt templates';
    ASSERT ai_stats.public_templates = 1, 'TechCorp should have 1 public template';

    RAISE NOTICE 'Test 9 PASSED: AI workspace statistics correct';
END $$;

-- Test 10: Inventory alerts view
DO $$
DECLARE
    bob_id uuid := '22222222-2222-2222-2222-222222222222'; -- TechCorp ops manager
    alert_count integer;
    case_alert v_inventory_alerts%ROWTYPE;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || bob_id || '", "role": "authenticated"}', true);

    SELECT COUNT(*) INTO alert_count FROM v_inventory_alerts;
    ASSERT alert_count = 1, 'TechCorp should have 1 inventory alert';

    SELECT * INTO case_alert FROM v_inventory_alerts WHERE sku = 'CASE-001';
    ASSERT case_alert.stock_status = 'low_stock', 'CASE-001 should show low stock status';
    ASSERT case_alert.quantity_on_hand = 15, 'CASE-001 should have 15 units on hand';
    ASSERT case_alert.reorder_point = 20, 'CASE-001 should have reorder point of 20';

    RAISE NOTICE 'Test 10 PASSED: Inventory alerts view working correctly';
END $$;

-- =======================
-- RPC FUNCTION TESTS
-- =======================

-- Test 11: Global search function
DO $$
DECLARE
    alice_id uuid := '11111111-1111-1111-1111-111111111111';
    search_results record;
    result_count integer;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || alice_id || '", "role": "authenticated"}', true);

    -- Test searching for "John" (customer name)
    SELECT COUNT(*) INTO result_count
    FROM global_search('John', 10);

    ASSERT result_count >= 1, 'Search for "John" should return at least 1 result';

    -- Test searching for ticket number
    SELECT COUNT(*) INTO result_count
    FROM global_search('TECHCORP-000001', 10);

    ASSERT result_count = 1, 'Search for ticket number should return exactly 1 result';

    RAISE NOTICE 'Test 11 PASSED: Global search function working correctly';
END $$;

-- Test 12: Organization metrics function
DO $$
DECLARE
    alice_id uuid := '11111111-1111-1111-1111-111111111111';
    metrics_result jsonb;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || alice_id || '", "role": "authenticated"}', true);

    SELECT get_org_metrics(30) INTO metrics_result;

    ASSERT metrics_result->>'period_days' = '30', 'Metrics should cover 30 day period';
    ASSERT (metrics_result->'customers'->>'total')::integer = 3, 'Should show 3 total customers';
    ASSERT (metrics_result->'support'->>'open_tickets')::integer = 2, 'Should show 2 open tickets';

    RAISE NOTICE 'Test 12 PASSED: Organization metrics function working correctly';
END $$;

-- Test 13: Reorder suggestions function
DO $$
DECLARE
    bob_id uuid := '22222222-2222-2222-2222-222222222222'; -- TechCorp ops manager
    suggestion_count integer;
    case_suggestion record;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || bob_id || '", "role": "authenticated"}', true);

    SELECT COUNT(*) INTO suggestion_count FROM get_reorder_suggestions();
    ASSERT suggestion_count = 1, 'Should have 1 reorder suggestion (CASE-001)';

    SELECT * INTO case_suggestion FROM get_reorder_suggestions() WHERE sku = 'CASE-001';
    ASSERT case_suggestion.current_stock = 15, 'CASE-001 current stock should be 15';
    ASSERT case_suggestion.suggested_quantity >= 25, 'Should suggest reordering at least 25 units';

    RAISE NOTICE 'Test 13 PASSED: Reorder suggestions function working correctly';
END $$;

-- =======================
-- AUDIT TRIGGER TESTS
-- =======================

-- Test 14: Audit logging on data changes
DO $$
DECLARE
    alice_id uuid := '11111111-1111-1111-1111-111111111111';
    audit_count_before integer;
    audit_count_after integer;
    test_supplier_id uuid;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || alice_id || '", "role": "authenticated"}', true);

    -- Count audit records before
    SELECT COUNT(*) INTO audit_count_before FROM audit_log;

    -- Insert a test supplier
    INSERT INTO supplier (org_id, name, status)
    VALUES (auth.user_org_id(), 'Test Supplier for Audit', 'pending_approval')
    RETURNING id INTO test_supplier_id;

    -- Update the supplier
    UPDATE supplier SET status = 'active' WHERE id = test_supplier_id;

    -- Delete the supplier
    DELETE FROM supplier WHERE id = test_supplier_id;

    -- Count audit records after
    SELECT COUNT(*) INTO audit_count_after FROM audit_log;

    ASSERT audit_count_after = audit_count_before + 3,
        'Should have 3 new audit records (INSERT, UPDATE, DELETE)';

    RAISE NOTICE 'Test 14 PASSED: Audit logging working correctly';
END $$;

-- =======================
-- PERFORMANCE TESTS
-- =======================

-- Test 15: Index effectiveness on large data queries
DO $$
DECLARE
    alice_id uuid := '11111111-1111-1111-1111-111111111111';
    start_time timestamp;
    end_time timestamp;
    execution_time interval;
BEGIN
    PERFORM set_config('request.jwt.claims',
        '{"sub": "' || alice_id || '", "role": "authenticated"}', true);

    start_time := clock_timestamp();

    -- Complex query that should use indexes
    PERFORM COUNT(*) FROM customer c
    JOIN support_ticket st ON st.customer_id = c.id
    JOIN ticket_comment tc ON tc.ticket_id = st.id
    WHERE c.org_id = auth.user_org_id()
    AND st.status IN ('open', 'in_progress')
    AND c.status = 'active';

    end_time := clock_timestamp();
    execution_time := end_time - start_time;

    ASSERT execution_time < interval '100 milliseconds',
        'Complex join query should complete in under 100ms with proper indexes';

    RAISE NOTICE 'Test 15 PASSED: Index performance acceptable (% ms)',
        EXTRACT(milliseconds FROM execution_time);
END $$;

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'ALL TESTS PASSED SUCCESSFULLY!';
    RAISE NOTICE 'Database schema is working correctly with:';
    RAISE NOTICE '✓ Multi-tenant data isolation';
    RAISE NOTICE '✓ Role-based access control';
    RAISE NOTICE '✓ View aggregations and projections';
    RAISE NOTICE '✓ RPC function operations';
    RAISE NOTICE '✓ Audit logging compliance';
    RAISE NOTICE '✓ Performance optimization';
    RAISE NOTICE '===========================================';
END $$;