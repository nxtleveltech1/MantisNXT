-- ============================================================================
-- LOYALTY REWARDS MIGRATION - COMPATIBILITY VERSION
-- ============================================================================
-- Adds missing components to existing loyalty system
-- Compatible with current schema (no organization/auth tables)
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADD MISSING ENUM
-- ============================================================================

-- redemption_status enum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'redemption_status') THEN
        CREATE TYPE redemption_status AS ENUM (
            'pending', 'approved', 'fulfilled', 'cancelled', 'expired'
        );
    END IF;
END $$;

-- ============================================================================
-- CREATE MISSING TABLE: loyalty_rule
-- ============================================================================

CREATE TABLE IF NOT EXISTS loyalty_rule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid,  -- Application-managed, no FK constraint
    program_id uuid NOT NULL REFERENCES loyalty_program(id) ON DELETE CASCADE,

    -- Rule details
    name text NOT NULL,
    description text,

    -- Trigger configuration
    trigger_type text NOT NULL,

    -- Conditions (JSONB for flexibility)
    conditions jsonb DEFAULT '{}',

    -- Points award configuration
    points_multiplier numeric(10,4) DEFAULT 1.0,
    bonus_points integer DEFAULT 0,

    -- Status and priority
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,

    -- Validity period
    valid_from timestamptz DEFAULT now(),
    valid_until timestamptz,

    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT loyalty_rule_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT loyalty_rule_trigger_type_valid CHECK (
        trigger_type IN ('order_placed', 'referral', 'review', 'birthday', 'anniversary', 'signup', 'social_share')
    ),
    CONSTRAINT loyalty_rule_multiplier_positive CHECK (points_multiplier > 0),
    CONSTRAINT loyalty_rule_bonus_points_non_negative CHECK (bonus_points >= 0),
    CONSTRAINT loyalty_rule_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- ============================================================================
-- ADD MISSING INDEXES
-- ============================================================================

-- Loyalty rule indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_rule_org ON loyalty_rule(org_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rule_program ON loyalty_rule(program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rule_active ON loyalty_rule(org_id, is_active, priority DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loyalty_rule_trigger ON loyalty_rule(trigger_type);

-- Additional indexes on existing tables (if not exists)
CREATE INDEX IF NOT EXISTS idx_loyalty_program_org_active ON loyalty_program(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_org_customer ON customer_loyalty(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transaction_org ON loyalty_transaction(org_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transaction_expires_at ON loyalty_transaction(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reward_catalog_active ON reward_catalog(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reward_redemption_code ON reward_redemption(redemption_code);

-- ============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Calculate points to award for an order
CREATE OR REPLACE FUNCTION calculate_points_for_order(
    p_customer_id uuid,
    p_order_amount numeric,
    p_order_id uuid,
    p_order_metadata jsonb DEFAULT '{}'
)
RETURNS TABLE (
    points_awarded bigint,
    base_points bigint,
    tier_bonus bigint,
    rule_bonus bigint,
    total_multiplier numeric
) AS $$
DECLARE
    v_loyalty_record RECORD;
    v_tier_multiplier numeric;
    v_base_points bigint;
    v_final_points bigint;
    v_rule_points bigint := 0;
    v_total_multiplier numeric := 1.0;
    v_rule RECORD;
BEGIN
    -- Get customer loyalty record with program details
    SELECT cl.*, lp.earn_rate, lp.tier_benefits
    INTO v_loyalty_record
    FROM customer_loyalty cl
    JOIN loyalty_program lp ON cl.program_id = lp.id
    WHERE cl.customer_id = p_customer_id
    AND lp.is_active = true
    ORDER BY lp.is_default DESC NULLS LAST
    LIMIT 1;

    -- If customer not in loyalty program, return zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::numeric;
        RETURN;
    END IF;

    -- Calculate base points from order amount
    v_base_points := FLOOR(p_order_amount * v_loyalty_record.earn_rate)::bigint;

    -- Get tier multiplier from benefits
    v_tier_multiplier := COALESCE(
        (v_loyalty_record.tier_benefits -> v_loyalty_record.current_tier::text ->> 'multiplier')::numeric,
        1.0
    );

    -- Apply tier multiplier
    v_total_multiplier := v_tier_multiplier;

    -- Apply active loyalty rules
    FOR v_rule IN
        SELECT lr.points_multiplier, lr.bonus_points, lr.conditions
        FROM loyalty_rule lr
        WHERE lr.program_id = v_loyalty_record.program_id
        AND lr.is_active = true
        AND lr.trigger_type = 'order_placed'
        AND (lr.valid_from IS NULL OR lr.valid_from <= now())
        AND (lr.valid_until IS NULL OR lr.valid_until > now())
        ORDER BY lr.priority DESC
    LOOP
        -- Check rule conditions
        DECLARE
            v_conditions_met boolean := true;
            v_min_order_amount numeric;
            v_required_tier text;
        BEGIN
            -- Check minimum order amount
            v_min_order_amount := (v_rule.conditions ->> 'min_order_amount')::numeric;
            IF v_min_order_amount IS NOT NULL AND p_order_amount < v_min_order_amount THEN
                v_conditions_met := false;
            END IF;

            -- Check required tier
            v_required_tier := v_rule.conditions ->> 'required_tier';
            IF v_required_tier IS NOT NULL AND v_loyalty_record.current_tier::text != v_required_tier THEN
                v_conditions_met := false;
            END IF;

            -- If all conditions met, apply rule
            IF v_conditions_met THEN
                v_total_multiplier := v_total_multiplier * v_rule.points_multiplier;
                v_rule_points := v_rule_points + v_rule.bonus_points;
            END IF;
        END;
    END LOOP;

    -- Calculate final points
    v_final_points := FLOOR(v_base_points * v_total_multiplier)::bigint + v_rule_points;

    -- Return breakdown
    RETURN QUERY SELECT
        v_final_points,
        v_base_points,
        FLOOR(v_base_points * (v_tier_multiplier - 1))::bigint,
        v_rule_points,
        v_total_multiplier;
END;
$$ LANGUAGE plpgsql STABLE;

-- Redeem a reward (without auth.uid() dependency)
CREATE OR REPLACE FUNCTION redeem_reward(
    p_customer_id uuid,
    p_reward_id uuid,
    p_redemption_expiry_days integer DEFAULT 30,
    p_created_by uuid DEFAULT NULL
)
RETURNS TABLE (
    success boolean,
    redemption_id uuid,
    redemption_code text,
    error_message text
) AS $$
DECLARE
    v_loyalty_record RECORD;
    v_reward_record RECORD;
    v_redemption_count integer;
    v_new_redemption_id uuid;
    v_new_redemption_code text;
    v_expires_at timestamptz;
BEGIN
    -- Get customer loyalty record
    SELECT cl.*, lp.id as program_id
    INTO v_loyalty_record
    FROM customer_loyalty cl
    JOIN loyalty_program lp ON cl.program_id = lp.id
    WHERE cl.customer_id = p_customer_id
    AND lp.is_active = true
    ORDER BY lp.is_default DESC NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::uuid, NULL::text, 'Customer not enrolled in loyalty program';
        RETURN;
    END IF;

    -- Get reward details
    SELECT rc.*
    INTO v_reward_record
    FROM reward_catalog rc
    WHERE rc.id = p_reward_id
    AND rc.is_active = true
    AND (rc.valid_from IS NULL OR rc.valid_from <= now())
    AND (rc.valid_until IS NULL OR rc.valid_until > now())
    AND (rc.program_id IS NULL OR rc.program_id = v_loyalty_record.program_id);

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::uuid, NULL::text, 'Reward not found or not available';
        RETURN;
    END IF;

    -- Check if customer has enough points
    IF v_loyalty_record.points_balance < v_reward_record.points_required THEN
        RETURN QUERY SELECT false, NULL::uuid, NULL::text,
            format('Insufficient points. Required: %s, Available: %s',
                v_reward_record.points_required, v_loyalty_record.points_balance);
        RETURN;
    END IF;

    -- Check stock availability
    IF v_reward_record.stock_quantity IS NOT NULL AND v_reward_record.stock_quantity <= 0 THEN
        RETURN QUERY SELECT false, NULL::uuid, NULL::text, 'Reward out of stock';
        RETURN;
    END IF;

    -- Check per-customer redemption limit
    IF v_reward_record.max_redemptions_per_customer IS NOT NULL THEN
        SELECT COUNT(*)
        INTO v_redemption_count
        FROM reward_redemption
        WHERE customer_id = p_customer_id
        AND reward_id = p_reward_id
        AND status NOT IN ('cancelled', 'expired');

        IF v_redemption_count >= v_reward_record.max_redemptions_per_customer THEN
            RETURN QUERY SELECT false, NULL::uuid, NULL::text,
                format('Maximum redemptions reached (%s)', v_reward_record.max_redemptions_per_customer);
            RETURN;
        END IF;
    END IF;

    -- Calculate expiry date
    v_expires_at := now() + (p_redemption_expiry_days || ' days')::interval;

    -- Create redemption record
    INSERT INTO reward_redemption (
        org_id,
        customer_id,
        reward_id,
        points_spent,
        monetary_value_used,
        status,
        expires_at
    ) VALUES (
        v_loyalty_record.org_id,
        p_customer_id,
        p_reward_id,
        v_reward_record.points_required,
        v_reward_record.monetary_value,
        'pending',
        v_expires_at
    )
    RETURNING id, redemption_code INTO v_new_redemption_id, v_new_redemption_code;

    -- Deduct points via transaction (without created_by reference)
    INSERT INTO loyalty_transaction (
        org_id,
        customer_id,
        program_id,
        transaction_type,
        points_amount,
        reference_type,
        reference_id,
        description
    ) VALUES (
        v_loyalty_record.org_id,
        p_customer_id,
        v_loyalty_record.program_id,
        'redeem',
        -v_reward_record.points_required,
        'redemption',
        v_new_redemption_id,
        format('Redeemed: %s', v_reward_record.name)
    );

    -- Update customer loyalty balance
    UPDATE customer_loyalty
    SET
        total_points_redeemed = total_points_redeemed + v_reward_record.points_required,
        points_balance = points_balance - v_reward_record.points_required,
        updated_at = now()
    WHERE id = v_loyalty_record.id;

    -- Update reward stock and redemption count
    UPDATE reward_catalog
    SET
        stock_quantity = CASE
            WHEN stock_quantity IS NOT NULL THEN stock_quantity - 1
            ELSE NULL
        END,
        redemption_count = redemption_count + 1,
        updated_at = now()
    WHERE id = p_reward_id;

    -- Return success
    RETURN QUERY SELECT true, v_new_redemption_id, v_new_redemption_code, NULL::text;
END;
$$ LANGUAGE plpgsql;

-- Update customer tier based on points
CREATE OR REPLACE FUNCTION update_customer_tier(p_customer_id uuid)
RETURNS TABLE (
    old_tier loyalty_tier,
    new_tier loyalty_tier,
    tier_changed boolean
) AS $$
DECLARE
    v_loyalty_record RECORD;
    v_tier_thresholds jsonb;
    v_new_tier loyalty_tier;
    v_old_tier loyalty_tier;
    v_total_points bigint;
BEGIN
    -- Get customer loyalty record with program details
    SELECT cl.*, lp.tier_thresholds
    INTO v_loyalty_record
    FROM customer_loyalty cl
    JOIN loyalty_program lp ON cl.program_id = lp.id
    WHERE cl.customer_id = p_customer_id
    AND lp.is_active = true
    ORDER BY lp.is_default DESC NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_old_tier := v_loyalty_record.current_tier;
    v_total_points := v_loyalty_record.total_points_earned;
    v_tier_thresholds := v_loyalty_record.tier_thresholds;

    -- Determine new tier based on total points earned (lifetime)
    IF v_total_points >= (v_tier_thresholds ->> 'diamond')::bigint THEN
        v_new_tier := 'diamond';
    ELSIF v_total_points >= (v_tier_thresholds ->> 'platinum')::bigint THEN
        v_new_tier := 'platinum';
    ELSIF v_total_points >= (v_tier_thresholds ->> 'gold')::bigint THEN
        v_new_tier := 'gold';
    ELSIF v_total_points >= (v_tier_thresholds ->> 'silver')::bigint THEN
        v_new_tier := 'silver';
    ELSE
        v_new_tier := 'bronze';
    END IF;

    -- Update tier if changed
    IF v_new_tier != v_old_tier THEN
        UPDATE customer_loyalty
        SET
            current_tier = v_new_tier,
            tier_qualified_date = CURRENT_DATE,
            updated_at = now()
        WHERE id = v_loyalty_record.id;

        -- Log tier change in transaction history
        INSERT INTO loyalty_transaction (
            org_id,
            customer_id,
            program_id,
            transaction_type,
            points_amount,
            reference_type,
            description,
            metadata
        ) VALUES (
            v_loyalty_record.org_id,
            p_customer_id,
            v_loyalty_record.program_id,
            'bonus',
            0,
            'tier_change',
            format('Tier upgraded from %s to %s', v_old_tier, v_new_tier),
            jsonb_build_object('old_tier', v_old_tier, 'new_tier', v_new_tier)
        );
    END IF;

    RETURN QUERY SELECT v_old_tier, v_new_tier, (v_new_tier != v_old_tier);
END;
$$ LANGUAGE plpgsql;

-- Expire old points
CREATE OR REPLACE FUNCTION expire_points()
RETURNS TABLE (
    expired_count integer,
    total_points_expired bigint
) AS $$
DECLARE
    v_expired_count integer := 0;
    v_total_points bigint := 0;
    v_transaction RECORD;
BEGIN
    -- Find and expire old points
    FOR v_transaction IN
        SELECT
            lt.id,
            lt.org_id,
            lt.customer_id,
            lt.program_id,
            lt.points_amount,
            lt.description
        FROM loyalty_transaction lt
        WHERE lt.transaction_type = 'earn'
        AND lt.expires_at IS NOT NULL
        AND lt.expires_at <= now()
        AND NOT EXISTS (
            SELECT 1
            FROM loyalty_transaction lt2
            WHERE lt2.reference_type = 'expiry'
            AND lt2.reference_id = lt.id
        )
    LOOP
        -- Create expiry transaction
        INSERT INTO loyalty_transaction (
            org_id,
            customer_id,
            program_id,
            transaction_type,
            points_amount,
            reference_type,
            reference_id,
            description
        ) VALUES (
            v_transaction.org_id,
            v_transaction.customer_id,
            v_transaction.program_id,
            'expire',
            -v_transaction.points_amount,
            'expiry',
            v_transaction.id,
            format('Expired points from: %s', v_transaction.description)
        );

        -- Update customer loyalty balance
        UPDATE customer_loyalty
        SET
            points_balance = points_balance - v_transaction.points_amount,
            updated_at = now()
        WHERE customer_id = v_transaction.customer_id
        AND program_id = v_transaction.program_id;

        v_expired_count := v_expired_count + 1;
        v_total_points := v_total_points + v_transaction.points_amount;
    END LOOP;

    RETURN QUERY SELECT v_expired_count, v_total_points;
END;
$$ LANGUAGE plpgsql;

-- Get customer rewards summary
CREATE OR REPLACE FUNCTION get_customer_rewards_summary(p_customer_id uuid)
RETURNS TABLE (
    customer_id uuid,
    current_tier loyalty_tier,
    points_balance bigint,
    points_pending bigint,
    lifetime_value numeric,
    tier_benefits jsonb,
    next_tier loyalty_tier,
    points_to_next_tier bigint,
    available_rewards_count integer,
    recent_transactions jsonb,
    recent_redemptions jsonb
) AS $$
DECLARE
    v_loyalty_record RECORD;
    v_tier_thresholds jsonb;
    v_next_tier loyalty_tier;
    v_points_to_next bigint;
    v_available_rewards integer;
    v_recent_transactions jsonb;
    v_recent_redemptions jsonb;
BEGIN
    -- Get customer loyalty record
    SELECT cl.*, lp.tier_thresholds, lp.tier_benefits
    INTO v_loyalty_record
    FROM customer_loyalty cl
    JOIN loyalty_program lp ON cl.program_id = lp.id
    WHERE cl.customer_id = p_customer_id
    AND lp.is_active = true
    ORDER BY lp.is_default DESC NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_tier_thresholds := v_loyalty_record.tier_thresholds;

    -- Calculate next tier and points needed
    CASE v_loyalty_record.current_tier
        WHEN 'bronze' THEN
            v_next_tier := 'silver';
            v_points_to_next := (v_tier_thresholds ->> 'silver')::bigint - v_loyalty_record.total_points_earned;
        WHEN 'silver' THEN
            v_next_tier := 'gold';
            v_points_to_next := (v_tier_thresholds ->> 'gold')::bigint - v_loyalty_record.total_points_earned;
        WHEN 'gold' THEN
            v_next_tier := 'platinum';
            v_points_to_next := (v_tier_thresholds ->> 'platinum')::bigint - v_loyalty_record.total_points_earned;
        WHEN 'platinum' THEN
            v_next_tier := 'diamond';
            v_points_to_next := (v_tier_thresholds ->> 'diamond')::bigint - v_loyalty_record.total_points_earned;
        ELSE
            v_next_tier := NULL;
            v_points_to_next := 0;
    END CASE;

    -- Count available rewards
    SELECT COUNT(*)
    INTO v_available_rewards
    FROM reward_catalog rc
    WHERE rc.org_id = v_loyalty_record.org_id
    AND (rc.program_id IS NULL OR rc.program_id = v_loyalty_record.program_id)
    AND rc.is_active = true
    AND rc.points_required <= v_loyalty_record.points_balance
    AND (rc.valid_from IS NULL OR rc.valid_from <= now())
    AND (rc.valid_until IS NULL OR rc.valid_until > now())
    AND (rc.stock_quantity IS NULL OR rc.stock_quantity > 0);

    -- Get recent transactions
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', lt.id,
            'type', lt.transaction_type,
            'points', lt.points_amount,
            'description', lt.description,
            'created_at', lt.created_at
        ) ORDER BY lt.created_at DESC
    )
    INTO v_recent_transactions
    FROM (
        SELECT * FROM loyalty_transaction
        WHERE customer_id = p_customer_id
        ORDER BY created_at DESC
        LIMIT 10
    ) lt;

    -- Get recent redemptions
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', rr.id,
            'reward_name', rc.name,
            'points_spent', rr.points_spent,
            'status', rr.status,
            'redemption_code', rr.redemption_code,
            'redeemed_at', rr.redeemed_at,
            'expires_at', rr.expires_at
        ) ORDER BY rr.redeemed_at DESC
    )
    INTO v_recent_redemptions
    FROM (
        SELECT * FROM reward_redemption
        WHERE customer_id = p_customer_id
        ORDER BY redeemed_at DESC
        LIMIT 5
    ) rr
    JOIN reward_catalog rc ON rr.reward_id = rc.id;

    RETURN QUERY SELECT
        p_customer_id,
        v_loyalty_record.current_tier,
        v_loyalty_record.points_balance,
        v_loyalty_record.points_pending,
        v_loyalty_record.lifetime_value,
        v_loyalty_record.tier_benefits -> v_loyalty_record.current_tier::text,
        v_next_tier,
        GREATEST(0, v_points_to_next),
        v_available_rewards,
        COALESCE(v_recent_transactions, '[]'::jsonb),
        COALESCE(v_recent_redemptions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

DROP VIEW IF EXISTS loyalty_leaderboard CASCADE;
CREATE VIEW loyalty_leaderboard AS
SELECT
    cl.org_id,
    cl.customer_id,
    c.name as customer_name,
    c.company,
    cl.current_tier,
    cl.total_points_earned,
    cl.points_balance,
    cl.lifetime_value,
    cl.referral_count,
    cl.tier_qualified_date,
    RANK() OVER (
        PARTITION BY cl.org_id, cl.current_tier
        ORDER BY cl.total_points_earned DESC
    ) as tier_rank,
    RANK() OVER (
        PARTITION BY cl.org_id
        ORDER BY cl.total_points_earned DESC
    ) as overall_rank,
    COALESCE((
        SELECT SUM(lt.points_amount)
        FROM loyalty_transaction lt
        WHERE lt.customer_id = cl.customer_id
        AND lt.transaction_type IN ('earn', 'bonus')
        AND lt.created_at >= date_trunc('month', CURRENT_DATE)
    ), 0) as points_this_month,
    COALESCE((
        SELECT SUM(lt.points_amount)
        FROM loyalty_transaction lt
        WHERE lt.customer_id = cl.customer_id
        AND lt.transaction_type IN ('earn', 'bonus')
        AND lt.created_at >= date_trunc('quarter', CURRENT_DATE)
    ), 0) as points_this_quarter
FROM customer_loyalty cl
JOIN customer c ON cl.customer_id = c.id
WHERE c.status = 'active';

DROP VIEW IF EXISTS reward_analytics CASCADE;
CREATE VIEW reward_analytics AS
SELECT
    rc.org_id,
    rc.id as reward_id,
    rc.name as reward_name,
    rc.reward_type,
    rc.points_required,
    rc.monetary_value,
    rc.is_active,
    rc.is_featured,
    rc.stock_quantity,
    rc.redemption_count,
    COUNT(rr.id) as total_redemptions,
    COUNT(DISTINCT rr.customer_id) as unique_customers,
    COUNT(*) FILTER (WHERE rr.status = 'fulfilled') as fulfilled_redemptions,
    COUNT(*) FILTER (WHERE rr.status = 'pending') as pending_redemptions,
    COUNT(*) FILTER (WHERE rr.status = 'cancelled') as cancelled_redemptions,
    SUM(rr.points_spent) as total_points_spent,
    SUM(rr.monetary_value_used) as total_monetary_value,
    COUNT(*) FILTER (WHERE rr.redeemed_at >= CURRENT_DATE - INTERVAL '30 days') as redemptions_last_30_days,
    COUNT(*) FILTER (WHERE rr.redeemed_at >= CURRENT_DATE - INTERVAL '90 days') as redemptions_last_90_days,
    AVG(EXTRACT(EPOCH FROM (rr.fulfilled_at - rr.redeemed_at)) / 3600) FILTER (WHERE rr.fulfilled_at IS NOT NULL) as avg_fulfillment_hours,
    CASE
        WHEN rc.created_at::date >= CURRENT_DATE THEN 0
        ELSE rc.redemption_count::numeric / GREATEST(1, (CURRENT_DATE - rc.created_at::date))
    END as daily_redemption_rate
FROM reward_catalog rc
LEFT JOIN reward_redemption rr ON rc.id = rr.reward_id
GROUP BY rc.id, rc.org_id, rc.name, rc.reward_type, rc.points_required,
         rc.monetary_value, rc.is_active, rc.is_featured, rc.stock_quantity,
         rc.redemption_count, rc.created_at;

-- ============================================================================
-- TRIGGERS (using existing update_updated_at_column function)
-- ============================================================================

DROP TRIGGER IF EXISTS update_loyalty_rule_updated_at ON loyalty_rule;
CREATE TRIGGER update_loyalty_rule_updated_at
    BEFORE UPDATE ON loyalty_rule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE loyalty_rule IS 'Automated rules for awarding bonus points';
COMMENT ON FUNCTION calculate_points_for_order IS 'Calculates points to award for an order based on amount, tier, and active rules';
COMMENT ON FUNCTION redeem_reward IS 'Processes a reward redemption with validation and stock management';
COMMENT ON FUNCTION update_customer_tier IS 'Updates customer tier based on lifetime points earned';
COMMENT ON FUNCTION expire_points IS 'Batch process to expire old points based on program expiry settings';
COMMENT ON FUNCTION get_customer_rewards_summary IS 'Comprehensive customer rewards summary with benefits and progress';
COMMENT ON VIEW loyalty_leaderboard IS 'Customer rankings for gamification and engagement';
COMMENT ON VIEW reward_analytics IS 'Business intelligence on reward performance and popularity';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Loyalty migration completed successfully' AS status;

-- Verify loyalty_rule table exists
SELECT COUNT(*) as loyalty_rule_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'loyalty_rule';

-- Verify functions created
SELECT COUNT(*) as loyalty_functions_count
FROM pg_proc
WHERE proname IN (
  'calculate_points_for_order',
  'redeem_reward',
  'update_customer_tier',
  'expire_points',
  'get_customer_rewards_summary'
);

-- Verify views created
SELECT COUNT(*) as loyalty_views_count
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('loyalty_leaderboard', 'reward_analytics');
