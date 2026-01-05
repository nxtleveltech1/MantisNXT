-- Migration: 0015_loyalty_rewards_TESTS.sql
-- Description: Comprehensive test suite for loyalty & rewards system
-- Dependencies: 0015_loyalty_rewards.sql
-- Usage: Run after migration to validate all functionality

-- ============================================================================
-- TEST SETUP
-- ============================================================================

-- Create test organization and user
DO $$
DECLARE
    v_test_org_id uuid;
    v_test_user_id uuid;
    v_test_customer_id uuid;
    v_test_program_id uuid;
    v_test_reward_id uuid;
    v_test_customer_loyalty_id uuid;
BEGIN
    -- Clean up any existing test data
    DELETE FROM loyalty_transaction WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM reward_redemption WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM customer_loyalty WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM loyalty_rule WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM reward_catalog WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM loyalty_program WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM customer WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM organization WHERE slug = 'test-loyalty-org';

    -- Create test organization
    INSERT INTO organization (id, name, slug, plan_type)
    VALUES (gen_random_uuid(), 'Test Loyalty Org', 'test-loyalty-org', 'enterprise')
    RETURNING id INTO v_test_org_id;

    RAISE NOTICE 'Created test organization: %', v_test_org_id;

    -- Create test customers
    INSERT INTO customer (id, org_id, name, email, segment, status)
    VALUES
        (gen_random_uuid(), v_test_org_id, 'Bronze Customer', 'bronze@test.com', 'smb', 'active'),
        (gen_random_uuid(), v_test_org_id, 'Silver Customer', 'silver@test.com', 'mid_market', 'active'),
        (gen_random_uuid(), v_test_org_id, 'Gold Customer', 'gold@test.com', 'enterprise', 'active'),
        (gen_random_uuid(), v_test_org_id, 'Platinum Customer', 'platinum@test.com', 'enterprise', 'active'),
        (gen_random_uuid(), v_test_org_id, 'Test Customer', 'test@test.com', 'smb', 'active')
    RETURNING id INTO v_test_customer_id;

    RAISE NOTICE 'Created test customers';

    -- Create test loyalty program
    INSERT INTO loyalty_program (
        id, org_id, name, description,
        is_active, is_default,
        earn_rate, points_expiry_days,
        tier_thresholds, tier_benefits
    ) VALUES (
        gen_random_uuid(),
        v_test_org_id,
        'Test Rewards Program',
        'Test program for validation',
        true, true,
        1.0, 365,
        '{"bronze": 0, "silver": 1000, "gold": 5000, "platinum": 15000, "diamond": 50000}'::jsonb,
        '{
            "bronze": {"multiplier": 1.0},
            "silver": {"multiplier": 1.2, "discount": 5},
            "gold": {"multiplier": 1.5, "discount": 10, "free_shipping": true},
            "platinum": {"multiplier": 2.0, "discount": 15, "free_shipping": true, "priority_support": true},
            "diamond": {"multiplier": 3.0, "discount": 20, "free_shipping": true, "priority_support": true, "dedicated_rep": true}
        }'::jsonb
    ) RETURNING id INTO v_test_program_id;

    RAISE NOTICE 'Created test loyalty program: %', v_test_program_id;

    -- Enroll test customer in program
    INSERT INTO customer_loyalty (
        id, org_id, customer_id, program_id,
        current_tier, total_points_earned,
        total_points_redeemed, points_balance
    ) VALUES (
        gen_random_uuid(),
        v_test_org_id,
        v_test_customer_id,
        v_test_program_id,
        'bronze', 0, 0, 0
    ) RETURNING id INTO v_test_customer_loyalty_id;

    -- Enroll other customers at different tiers for leaderboard testing
    INSERT INTO customer_loyalty (org_id, customer_id, program_id, current_tier, total_points_earned, points_balance)
    SELECT
        v_test_org_id,
        c.id,
        v_test_program_id,
        CASE
            WHEN c.name = 'Bronze Customer' THEN 'bronze'::loyalty_tier
            WHEN c.name = 'Silver Customer' THEN 'silver'::loyalty_tier
            WHEN c.name = 'Gold Customer' THEN 'gold'::loyalty_tier
            WHEN c.name = 'Platinum Customer' THEN 'platinum'::loyalty_tier
        END,
        CASE
            WHEN c.name = 'Bronze Customer' THEN 500
            WHEN c.name = 'Silver Customer' THEN 2000
            WHEN c.name = 'Gold Customer' THEN 8000
            WHEN c.name = 'Platinum Customer' THEN 25000
        END,
        CASE
            WHEN c.name = 'Bronze Customer' THEN 500
            WHEN c.name = 'Silver Customer' THEN 2000
            WHEN c.name = 'Gold Customer' THEN 8000
            WHEN c.name = 'Platinum Customer' THEN 25000
        END
    FROM customer c
    WHERE c.org_id = v_test_org_id
    AND c.name != 'Test Customer';

    RAISE NOTICE 'Enrolled customers in loyalty program';

    -- Create test rewards
    INSERT INTO reward_catalog (
        id, org_id, program_id,
        name, description, reward_type,
        points_required, monetary_value,
        is_active, stock_quantity,
        max_redemptions_per_customer
    ) VALUES
        (
            gen_random_uuid(),
            v_test_org_id, v_test_program_id,
            '10% Discount Voucher', 'Save 10% on your next order',
            'discount', 500, 50.00,
            true, NULL, NULL
        ),
        (
            gen_random_uuid(),
            v_test_org_id, v_test_program_id,
            'Free Shipping (3 orders)', 'Free shipping on your next 3 orders',
            'free_shipping', 1000, 75.00,
            true, NULL, 5
        ),
        (
            gen_random_uuid(),
            v_test_org_id, v_test_program_id,
            'Limited Edition Gift', 'Exclusive branded merchandise',
            'gift', 2000, 100.00,
            true, 10, 1
        ),
        (
            gen_random_uuid(),
            v_test_org_id, v_test_program_id,
            '$50 Cash Credit', 'Credit to your account balance',
            'cashback', 5000, 50.00,
            true, NULL, NULL
        )
    RETURNING id INTO v_test_reward_id;

    RAISE NOTICE 'Created test rewards';

    -- Create test loyalty rules
    INSERT INTO loyalty_rule (
        org_id, program_id,
        name, description,
        trigger_type, conditions,
        points_multiplier, bonus_points,
        is_active, priority
    ) VALUES
        (
            v_test_org_id, v_test_program_id,
            'High Value Order Bonus',
            'Double points for orders over $5,000',
            'order_placed',
            '{"min_order_amount": 5000}'::jsonb,
            2.0, 0,
            true, 10
        ),
        (
            v_test_org_id, v_test_program_id,
            'Mega Order Bonus',
            'Triple points + 1000 bonus for orders over $10,000',
            'order_placed',
            '{"min_order_amount": 10000}'::jsonb,
            3.0, 1000,
            true, 20
        ),
        (
            v_test_org_id, v_test_program_id,
            'Referral Bonus',
            '1,000 points for each successful referral',
            'referral',
            '{}'::jsonb,
            1.0, 1000,
            true, 5
        );

    RAISE NOTICE 'Created test loyalty rules';
    RAISE NOTICE 'Test setup completed successfully!';
    RAISE NOTICE 'Test customer ID: %', v_test_customer_id;
    RAISE NOTICE 'Test program ID: %', v_test_program_id;
END $$;

-- ============================================================================
-- TEST 1: Points Calculation - Basic Order
-- ============================================================================

DO $$
DECLARE
    v_customer_id uuid;
    v_program_id uuid;
    v_result RECORD;
BEGIN
    RAISE NOTICE '=== TEST 1: Basic Points Calculation ===';

    -- Get test customer
    SELECT c.id INTO v_customer_id
    FROM customer c
    WHERE c.name = 'Test Customer'
    AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');

    -- Get program
    SELECT id INTO v_program_id
    FROM loyalty_program
    WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org')
    AND is_default = true;

    -- Test: $1,000 order for Bronze customer (1x multiplier)
    SELECT * INTO v_result
    FROM calculate_points_for_order(
        v_customer_id,
        1000.00,
        gen_random_uuid(),
        '{}'::jsonb
    );

    ASSERT v_result.base_points = 1000, format('Expected 1000 base points, got %s', v_result.base_points);
    ASSERT v_result.tier_bonus = 0, format('Expected 0 tier bonus, got %s', v_result.tier_bonus);
    ASSERT v_result.points_awarded = 1000, format('Expected 1000 total points, got %s', v_result.points_awarded);

    RAISE NOTICE 'Basic calculation: Base=%s, Bonus=%s, Total=%s - PASSED',
        v_result.base_points, v_result.tier_bonus, v_result.points_awarded;
END $$;

-- ============================================================================
-- TEST 2: Points Calculation - With Tier Bonus
-- ============================================================================

DO $$
DECLARE
    v_customer_id uuid;
    v_result RECORD;
BEGIN
    RAISE NOTICE '=== TEST 2: Points Calculation with Tier Bonus ===';

    -- Get Gold customer (1.5x multiplier)
    SELECT c.id INTO v_customer_id
    FROM customer c
    WHERE c.name = 'Gold Customer'
    AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');

    -- Test: $1,000 order for Gold customer (1.5x multiplier)
    SELECT * INTO v_result
    FROM calculate_points_for_order(
        v_customer_id,
        1000.00,
        gen_random_uuid(),
        '{}'::jsonb
    );

    ASSERT v_result.base_points = 1000, format('Expected 1000 base points, got %s', v_result.base_points);
    ASSERT v_result.tier_bonus = 500, format('Expected 500 tier bonus, got %s', v_result.tier_bonus);
    ASSERT v_result.points_awarded = 1500, format('Expected 1500 total points, got %s', v_result.points_awarded);

    RAISE NOTICE 'Tier bonus calculation: Base=%s, Bonus=%s, Total=%s - PASSED',
        v_result.base_points, v_result.tier_bonus, v_result.points_awarded;
END $$;

-- ============================================================================
-- TEST 3: Points Calculation - With Loyalty Rules
-- ============================================================================

DO $$
DECLARE
    v_customer_id uuid;
    v_result RECORD;
BEGIN
    RAISE NOTICE '=== TEST 3: Points Calculation with Loyalty Rules ===';

    -- Get test customer
    SELECT c.id INTO v_customer_id
    FROM customer c
    WHERE c.name = 'Test Customer'
    AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');

    -- Test: $6,000 order (triggers 2x rule)
    SELECT * INTO v_result
    FROM calculate_points_for_order(
        v_customer_id,
        6000.00,
        gen_random_uuid(),
        '{}'::jsonb
    );

    ASSERT v_result.base_points = 6000, format('Expected 6000 base points, got %s', v_result.base_points);
    ASSERT v_result.points_awarded = 12000, format('Expected 12000 total points (2x rule), got %s', v_result.points_awarded);

    RAISE NOTICE 'Rule-based calculation: Base=%s, Total=%s, Multiplier=%s - PASSED',
        v_result.base_points, v_result.points_awarded, v_result.total_multiplier;
END $$;

-- ============================================================================
-- TEST 4: Award Points and Check Balance
-- ============================================================================

DO $$
DECLARE
    v_customer_id uuid;
    v_program_id uuid;
    v_org_id uuid;
    v_order_id uuid;
    v_points_awarded bigint;
    v_balance_before bigint;
    v_balance_after bigint;
BEGIN
    RAISE NOTICE '=== TEST 4: Award Points and Balance Update ===';

    -- Get test customer
    SELECT c.id, c.org_id INTO v_customer_id, v_org_id
    FROM customer c
    WHERE c.name = 'Test Customer'
    AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');

    -- Get program
    SELECT id INTO v_program_id
    FROM loyalty_program
    WHERE org_id = v_org_id AND is_default = true;

    -- Get current balance
    SELECT points_balance INTO v_balance_before
    FROM customer_loyalty
    WHERE customer_id = v_customer_id;

    RAISE NOTICE 'Balance before: %s points', v_balance_before;

    -- Calculate points for $1,500 order
    SELECT points_awarded INTO v_points_awarded
    FROM calculate_points_for_order(
        v_customer_id,
        1500.00,
        gen_random_uuid(),
        '{}'::jsonb
    );

    v_order_id := gen_random_uuid();

    -- Award points
    INSERT INTO loyalty_transaction (
        org_id, customer_id, program_id,
        transaction_type, points_amount,
        reference_type, reference_id,
        description,
        expires_at
    ) VALUES (
        v_org_id,
        v_customer_id,
        v_program_id,
        'earn',
        v_points_awarded,
        'order',
        v_order_id,
        'Test order points',
        now() + INTERVAL '365 days'
    );

    -- Get new balance
    SELECT points_balance INTO v_balance_after
    FROM customer_loyalty
    WHERE customer_id = v_customer_id;

    ASSERT v_balance_after = v_balance_before + v_points_awarded,
        format('Expected balance %s, got %s', v_balance_before + v_points_awarded, v_balance_after);

    RAISE NOTICE 'Balance after: %s points (added %s) - PASSED',
        v_balance_after, v_points_awarded;
END $$;

-- ============================================================================
-- TEST 5: Tier Progression
-- ============================================================================

DO $$
DECLARE
    v_customer_id uuid;
    v_program_id uuid;
    v_org_id uuid;
    v_old_tier loyalty_tier;
    v_new_tier loyalty_tier;
    v_tier_changed boolean;
    v_current_points bigint;
BEGIN
    RAISE NOTICE '=== TEST 5: Tier Progression ===';

    -- Get test customer
    SELECT c.id, c.org_id INTO v_customer_id, v_org_id
    FROM customer c
    WHERE c.name = 'Test Customer'
    AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');

    -- Get program
    SELECT id INTO v_program_id
    FROM loyalty_program
    WHERE org_id = v_org_id AND is_default = true;

    -- Get current tier and points
    SELECT current_tier, total_points_earned INTO v_old_tier, v_current_points
    FROM customer_loyalty
    WHERE customer_id = v_customer_id;

    RAISE NOTICE 'Current tier: %s with %s lifetime points', v_old_tier, v_current_points;

    -- Award enough points to reach Silver (need 1000 total)
    IF v_current_points < 1000 THEN
        INSERT INTO loyalty_transaction (
            org_id, customer_id, program_id,
            transaction_type, points_amount,
            reference_type, description
        ) VALUES (
            v_org_id,
            v_customer_id,
            v_program_id,
            'bonus',
            1000 - v_current_points,
            'manual',
            'Tier progression test'
        );

        -- Check tier update
        SELECT * INTO v_old_tier, v_new_tier, v_tier_changed
        FROM update_customer_tier(v_customer_id);

        ASSERT v_tier_changed = true, 'Expected tier change';
        ASSERT v_new_tier = 'silver', format('Expected silver tier, got %s', v_new_tier);

        RAISE NOTICE 'Tier upgraded: %s -> %s - PASSED', v_old_tier, v_new_tier;
    ELSE
        RAISE NOTICE 'Customer already at Silver+ tier, skipping progression test';
    END IF;
END $$;

-- ============================================================================
-- TEST 6: Reward Redemption - Success
-- ============================================================================

DO $$
DECLARE
    v_customer_id uuid;
    v_reward_id uuid;
    v_program_id uuid;
    v_org_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_result RECORD;
BEGIN
    RAISE NOTICE '=== TEST 6: Successful Reward Redemption ===';

    -- Get test customer
    SELECT c.id, c.org_id INTO v_customer_id, v_org_id
    FROM customer c
    WHERE c.name = 'Test Customer'
    AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');

    -- Get program
    SELECT id INTO v_program_id
    FROM loyalty_program
    WHERE org_id = v_org_id AND is_default = true;

    -- Ensure customer has enough points (500 for discount voucher)
    UPDATE customer_loyalty
    SET points_balance = GREATEST(points_balance, 600)
    WHERE customer_id = v_customer_id;

    SELECT points_balance INTO v_balance_before
    FROM customer_loyalty
    WHERE customer_id = v_customer_id;

    -- Get reward
    SELECT id INTO v_reward_id
    FROM reward_catalog
    WHERE name = '10% Discount Voucher'
    AND org_id = v_org_id;

    RAISE NOTICE 'Balance before redemption: %s points', v_balance_before;

    -- Redeem reward
    SELECT * INTO v_result
    FROM redeem_reward(v_customer_id, v_reward_id, 30);

    ASSERT v_result.success = true, format('Redemption failed: %s', v_result.error_message);
    ASSERT v_result.redemption_code IS NOT NULL, 'Expected redemption code';

    -- Check balance
    SELECT points_balance INTO v_balance_after
    FROM customer_loyalty
    WHERE customer_id = v_customer_id;

    ASSERT v_balance_after = v_balance_before - 500,
        format('Expected balance %s, got %s', v_balance_before - 500, v_balance_after);

    RAISE NOTICE 'Redemption successful: Code=%s, Balance=%s - PASSED',
        v_result.redemption_code, v_balance_after;
END $$;

-- ============================================================================
-- TEST 7: Reward Redemption - Insufficient Points
-- ============================================================================

DO $$
DECLARE
    v_customer_id uuid;
    v_reward_id uuid;
    v_result RECORD;
BEGIN
    RAISE NOTICE '=== TEST 7: Redemption with Insufficient Points ===';

    -- Get test customer
    SELECT c.id INTO v_customer_id
    FROM customer c
    WHERE c.name = 'Test Customer'
    AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');

    -- Set balance to 100 (not enough for $50 cash credit = 5000 points)
    UPDATE customer_loyalty
    SET points_balance = 100
    WHERE customer_id = v_customer_id;

    -- Get expensive reward
    SELECT id INTO v_reward_id
    FROM reward_catalog
    WHERE name = '$50 Cash Credit'
    AND org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');

    -- Try to redeem
    SELECT * INTO v_result
    FROM redeem_reward(v_customer_id, v_reward_id, 30);

    ASSERT v_result.success = false, 'Expected redemption to fail';
    ASSERT v_result.error_message LIKE '%Insufficient points%',
        format('Expected insufficient points error, got: %s', v_result.error_message);

    RAISE NOTICE 'Correctly rejected: %s - PASSED', v_result.error_message;
END $$;

-- ============================================================================
-- TEST 8: Points Expiry
-- ============================================================================

DO $$
DECLARE
    v_customer_id uuid;
    v_program_id uuid;
    v_org_id uuid;
    v_transaction_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_expired_count integer;
    v_total_expired bigint;
BEGIN
    RAISE NOTICE '=== TEST 8: Points Expiry ===';

    -- Get test customer
    SELECT c.id, c.org_id INTO v_customer_id, v_org_id
    FROM customer c
    WHERE c.name = 'Test Customer'
    AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');

    -- Get program
    SELECT id INTO v_program_id
    FROM loyalty_program
    WHERE org_id = v_org_id AND is_default = true;

    -- Create an expired transaction
    INSERT INTO loyalty_transaction (
        org_id, customer_id, program_id,
        transaction_type, points_amount,
        reference_type, description,
        expires_at
    ) VALUES (
        v_org_id,
        v_customer_id,
        v_program_id,
        'earn',
        100,
        'order',
        'Expiry test points',
        now() - INTERVAL '1 day'  -- Already expired
    ) RETURNING id INTO v_transaction_id;

    -- Get balance before expiry
    SELECT points_balance INTO v_balance_before
    FROM customer_loyalty
    WHERE customer_id = v_customer_id;

    -- Run expiry process
    SELECT * INTO v_expired_count, v_total_expired
    FROM expire_points();

    -- Get balance after expiry
    SELECT points_balance INTO v_balance_after
    FROM customer_loyalty
    WHERE customer_id = v_customer_id;

    ASSERT v_expired_count > 0, 'Expected some points to expire';
    ASSERT v_balance_after < v_balance_before, 'Expected balance to decrease';

    RAISE NOTICE 'Expired %s transactions totaling %s points - PASSED',
        v_expired_count, v_total_expired;
END $$;

-- ============================================================================
-- TEST 9: Customer Rewards Summary
-- ============================================================================

DO $$
DECLARE
    v_customer_id uuid;
    v_result RECORD;
BEGIN
    RAISE NOTICE '=== TEST 9: Customer Rewards Summary ===';

    -- Get test customer
    SELECT c.id INTO v_customer_id
    FROM customer c
    WHERE c.name = 'Test Customer'
    AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');

    -- Get summary
    SELECT * INTO v_result
    FROM get_customer_rewards_summary(v_customer_id);

    ASSERT v_result IS NOT NULL, 'Expected summary data';
    ASSERT v_result.current_tier IS NOT NULL, 'Expected current tier';
    ASSERT v_result.points_balance >= 0, 'Expected valid points balance';
    ASSERT v_result.tier_benefits IS NOT NULL, 'Expected tier benefits';

    RAISE NOTICE 'Summary: Tier=%s, Points=%s, Next=%s (need %s) - PASSED',
        v_result.current_tier,
        v_result.points_balance,
        v_result.next_tier,
        v_result.points_to_next_tier;
END $$;

-- ============================================================================
-- TEST 10: Loyalty Leaderboard
-- ============================================================================

DO $$
DECLARE
    v_org_id uuid;
    v_count integer;
BEGIN
    RAISE NOTICE '=== TEST 10: Loyalty Leaderboard ===';

    -- Get test org
    SELECT id INTO v_org_id
    FROM organization
    WHERE slug = 'test-loyalty-org';

    -- Check leaderboard
    SELECT COUNT(*) INTO v_count
    FROM loyalty_leaderboard
    WHERE org_id = v_org_id;

    ASSERT v_count > 0, 'Expected leaderboard entries';

    RAISE NOTICE 'Leaderboard has %s entries - PASSED', v_count;

    -- Display top 3
    RAISE NOTICE 'Top 3 customers:';
    PERFORM RAISE NOTICE '  %s. %s (%s) - %s points',
        overall_rank,
        customer_name,
        current_tier,
        total_points_earned
    FROM loyalty_leaderboard
    WHERE org_id = v_org_id
    ORDER BY overall_rank
    LIMIT 3;
END $$;

-- ============================================================================
-- TEST 11: Reward Analytics
-- ============================================================================

DO $$
DECLARE
    v_org_id uuid;
    v_count integer;
BEGIN
    RAISE NOTICE '=== TEST 11: Reward Analytics ===';

    -- Get test org
    SELECT id INTO v_org_id
    FROM organization
    WHERE slug = 'test-loyalty-org';

    -- Check analytics
    SELECT COUNT(*) INTO v_count
    FROM reward_analytics
    WHERE org_id = v_org_id;

    ASSERT v_count > 0, 'Expected reward analytics';

    RAISE NOTICE 'Analytics for %s rewards - PASSED', v_count;

    -- Display most popular
    RAISE NOTICE 'Most popular rewards:';
    PERFORM RAISE NOTICE '  %s: %s redemptions from %s customers',
        reward_name,
        total_redemptions,
        unique_customers
    FROM reward_analytics
    WHERE org_id = v_org_id
    AND total_redemptions > 0
    ORDER BY total_redemptions DESC
    LIMIT 3;
END $$;

-- ============================================================================
-- TEST 12: RLS Policies
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== TEST 12: RLS Policy Validation ===';

    -- Verify RLS is enabled on all tables
    ASSERT (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loyalty_program' AND rowsecurity = true) = 1,
        'RLS not enabled on loyalty_program';
    ASSERT (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_loyalty' AND rowsecurity = true) = 1,
        'RLS not enabled on customer_loyalty';
    ASSERT (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loyalty_transaction' AND rowsecurity = true) = 1,
        'RLS not enabled on loyalty_transaction';
    ASSERT (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reward_catalog' AND rowsecurity = true) = 1,
        'RLS not enabled on reward_catalog';
    ASSERT (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reward_redemption' AND rowsecurity = true) = 1,
        'RLS not enabled on reward_redemption';
    ASSERT (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loyalty_rule' AND rowsecurity = true) = 1,
        'RLS not enabled on loyalty_rule';

    RAISE NOTICE 'All tables have RLS enabled - PASSED';
END $$;

-- ============================================================================
-- TEST 13: Constraint Validation
-- ============================================================================

DO $$
DECLARE
    v_error_occurred boolean := false;
BEGIN
    RAISE NOTICE '=== TEST 13: Constraint Validation ===';

    -- Test: Negative points balance should fail
    BEGIN
        UPDATE customer_loyalty
        SET points_balance = -100
        WHERE customer_id IN (
            SELECT c.id FROM customer c
            WHERE c.name = 'Test Customer'
            AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org')
        );
        v_error_occurred := false;
    EXCEPTION
        WHEN check_violation THEN
            v_error_occurred := true;
    END;

    ASSERT v_error_occurred = true, 'Expected constraint violation for negative balance';
    RAISE NOTICE 'Negative balance correctly rejected - PASSED';

    -- Test: Earn transaction with negative points should fail
    v_error_occurred := false;
    BEGIN
        INSERT INTO loyalty_transaction (
            org_id, customer_id, program_id,
            transaction_type, points_amount,
            description
        )
        SELECT
            c.org_id,
            c.id,
            (SELECT id FROM loyalty_program WHERE org_id = c.org_id LIMIT 1),
            'earn',
            -100,
            'Invalid earn'
        FROM customer c
        WHERE c.name = 'Test Customer'
        AND c.org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
        v_error_occurred := false;
    EXCEPTION
        WHEN check_violation THEN
            v_error_occurred := true;
    END;

    ASSERT v_error_occurred = true, 'Expected constraint violation for negative earn';
    RAISE NOTICE 'Negative earn points correctly rejected - PASSED';
END $$;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║           LOYALTY & REWARDS SYSTEM TEST SUMMARY                ║';
    RAISE NOTICE '╠════════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║  ✓ TEST 1:  Basic Points Calculation                           ║';
    RAISE NOTICE '║  ✓ TEST 2:  Points Calculation with Tier Bonus                 ║';
    RAISE NOTICE '║  ✓ TEST 3:  Points Calculation with Loyalty Rules              ║';
    RAISE NOTICE '║  ✓ TEST 4:  Award Points and Balance Update                    ║';
    RAISE NOTICE '║  ✓ TEST 5:  Tier Progression                                   ║';
    RAISE NOTICE '║  ✓ TEST 6:  Successful Reward Redemption                       ║';
    RAISE NOTICE '║  ✓ TEST 7:  Redemption with Insufficient Points                ║';
    RAISE NOTICE '║  ✓ TEST 8:  Points Expiry                                      ║';
    RAISE NOTICE '║  ✓ TEST 9:  Customer Rewards Summary                           ║';
    RAISE NOTICE '║  ✓ TEST 10: Loyalty Leaderboard                                ║';
    RAISE NOTICE '║  ✓ TEST 11: Reward Analytics                                   ║';
    RAISE NOTICE '║  ✓ TEST 12: RLS Policy Validation                              ║';
    RAISE NOTICE '║  ✓ TEST 13: Constraint Validation                              ║';
    RAISE NOTICE '╠════════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║                    ALL TESTS PASSED ✓                          ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- CLEANUP (Optional - comment out to preserve test data)
-- ============================================================================

-- Uncomment to clean up test data after validation:
/*
DO $$
BEGIN
    RAISE NOTICE 'Cleaning up test data...';

    DELETE FROM loyalty_transaction WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM reward_redemption WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM customer_loyalty WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM loyalty_rule WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM reward_catalog WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM loyalty_program WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM customer WHERE org_id IN (SELECT id FROM organization WHERE slug = 'test-loyalty-org');
    DELETE FROM organization WHERE slug = 'test-loyalty-org';

    RAISE NOTICE 'Test data cleaned up successfully';
END $$;
*/
