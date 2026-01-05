-- Migration: 0015_loyalty_rewards.sql
-- Description: Production-ready B2B loyalty & rewards system with points, tiers, redemptions, and gamification
-- Dependencies: 0004_customer_ops.sql (customer table)
-- up

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Loyalty tier levels for customer segmentation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_tier') THEN
        CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
    END IF;
END
$$;

-- Types of rewards that can be offered
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_type') THEN
        CREATE TYPE reward_type AS ENUM (
            'points',           -- Additional loyalty points
            'discount',         -- Percentage or fixed discount on next order
            'cashback',         -- Cash credit to customer account
            'free_shipping',    -- Free shipping on next N orders
            'upgrade',          -- Tier upgrade or expedited service
            'gift'              -- Physical or digital gift
        );
    END IF;
END
$$;

-- Transaction types for points movement
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM (
            'earn',      -- Points earned from purchases or activities
            'redeem',    -- Points redeemed for rewards
            'expire',    -- Points expired due to time limit
            'adjust',    -- Manual adjustment (positive or negative)
            'bonus'      -- Bonus points from promotions or special events
        );
    END IF;
END
$$;

-- Status of reward redemptions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'redemption_status') THEN
        CREATE TYPE redemption_status AS ENUM (
            'pending',    -- Redemption created, awaiting approval
            'approved',   -- Approved, awaiting fulfillment
            'fulfilled',  -- Reward delivered to customer
            'cancelled',  -- Redemption cancelled
            'expired'     -- Redemption expired before fulfillment
        );
    END IF;
END
$$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Loyalty program configuration
-- Each organization can have multiple loyalty programs (e.g., by customer segment)
CREATE TABLE loyalty_program (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,

    -- Points earning configuration
    earn_rate numeric(10,4) NOT NULL DEFAULT 1.0,  -- Points per currency unit spent

    -- Tier configuration (JSONB for flexibility)
    -- Format: {"bronze": 0, "silver": 1000, "gold": 5000, "platinum": 15000, "diamond": 50000}
    tier_thresholds jsonb NOT NULL DEFAULT '{
        "bronze": 0,
        "silver": 1000,
        "gold": 5000,
        "platinum": 15000,
        "diamond": 50000
    }'::jsonb,

    -- Benefits per tier (JSONB for flexibility)
    -- Format: {"bronze": {"multiplier": 1.0}, "silver": {"multiplier": 1.2, "free_shipping": true}, ...}
    tier_benefits jsonb NOT NULL DEFAULT '{
        "bronze": {"multiplier": 1.0},
        "silver": {"multiplier": 1.2, "discount": 5},
        "gold": {"multiplier": 1.5, "discount": 10, "free_shipping": true},
        "platinum": {"multiplier": 2.0, "discount": 15, "free_shipping": true, "priority_support": true},
        "diamond": {"multiplier": 3.0, "discount": 20, "free_shipping": true, "priority_support": true, "dedicated_rep": true}
    }'::jsonb,

    -- Points expiry (NULL = no expiry)
    points_expiry_days integer,

    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT loyalty_program_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT loyalty_program_earn_rate_positive CHECK (earn_rate > 0),
    CONSTRAINT loyalty_program_expiry_positive CHECK (points_expiry_days IS NULL OR points_expiry_days > 0),
    CONSTRAINT loyalty_program_org_name_unique UNIQUE(org_id, name)
);

-- Ensure only one default loyalty program per organization
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_program_single_default_idx
    ON loyalty_program(org_id)
    WHERE is_default = true;

-- Customer loyalty status and points balance
CREATE TABLE customer_loyalty (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    program_id uuid NOT NULL REFERENCES loyalty_program(id) ON DELETE RESTRICT,

    -- Current tier status
    current_tier loyalty_tier NOT NULL DEFAULT 'bronze',
    tier_qualified_date date DEFAULT CURRENT_DATE,

    -- Points tracking
    total_points_earned bigint DEFAULT 0,
    total_points_redeemed bigint DEFAULT 0,
    points_balance bigint DEFAULT 0,
    points_pending bigint DEFAULT 0,  -- Points from orders not yet confirmed

    -- Customer value metrics
    lifetime_value numeric(12,2) DEFAULT 0,  -- Auto-calculated from orders
    referral_count integer DEFAULT 0,

    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT customer_loyalty_customer_program_unique UNIQUE(customer_id, program_id),
    CONSTRAINT customer_loyalty_points_earned_non_negative CHECK (total_points_earned >= 0),
    CONSTRAINT customer_loyalty_points_redeemed_non_negative CHECK (total_points_redeemed >= 0),
    CONSTRAINT customer_loyalty_points_balance_non_negative CHECK (points_balance >= 0),
    CONSTRAINT customer_loyalty_points_pending_non_negative CHECK (points_pending >= 0),
    CONSTRAINT customer_loyalty_lifetime_value_non_negative CHECK (lifetime_value >= 0),
    CONSTRAINT customer_loyalty_referral_count_non_negative CHECK (referral_count >= 0),
    CONSTRAINT customer_loyalty_points_balance_match CHECK (points_balance = total_points_earned - total_points_redeemed)
);

-- Loyalty points transaction history
CREATE TABLE loyalty_transaction (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    program_id uuid NOT NULL REFERENCES loyalty_program(id) ON DELETE RESTRICT,

    -- Transaction details
    transaction_type transaction_type NOT NULL,
    points_amount bigint NOT NULL,  -- Can be negative for redemptions/adjustments

    -- Reference to source (order, referral, etc.)
    reference_type text,  -- 'order', 'referral', 'review', 'manual', 'birthday', 'anniversary'
    reference_id uuid,    -- ID of the referenced entity

    -- Description and metadata
    description text NOT NULL,
    metadata jsonb DEFAULT '{}',

    -- Expiry tracking (for earned points)
    expires_at timestamptz,

    -- Audit
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT loyalty_transaction_description_not_empty CHECK (char_length(description) > 0),
    CONSTRAINT loyalty_transaction_reference_type_valid CHECK (
        reference_type IS NULL OR
        reference_type IN ('order', 'referral', 'review', 'manual', 'birthday', 'anniversary', 'bonus', 'signup')
    ),
    CONSTRAINT loyalty_transaction_earn_positive CHECK (
        transaction_type != 'earn' OR points_amount > 0
    ),
    CONSTRAINT loyalty_transaction_redeem_negative CHECK (
        transaction_type != 'redeem' OR points_amount < 0
    ),
    CONSTRAINT loyalty_transaction_expire_negative CHECK (
        transaction_type != 'expire' OR points_amount < 0
    )
);

-- Reward catalog - available rewards for redemption
CREATE TABLE reward_catalog (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    program_id uuid REFERENCES loyalty_program(id) ON DELETE RESTRICT,  -- NULL = available to all programs

    -- Reward details
    name text NOT NULL,
    description text,
    reward_type reward_type NOT NULL,

    -- Cost and value
    points_required integer NOT NULL,
    monetary_value numeric(10,2),  -- Actual cash value of the reward

    -- Redemption limits
    max_redemptions_per_customer integer,
    stock_quantity integer,  -- NULL = unlimited
    redemption_count integer DEFAULT 0,

    -- Status and visibility
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,

    -- Validity period
    valid_from timestamptz DEFAULT now(),
    valid_until timestamptz,

    -- Terms and conditions
    terms_conditions jsonb DEFAULT '{}',

    -- Media
    image_url text,

    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT reward_catalog_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT reward_catalog_points_positive CHECK (points_required > 0),
    CONSTRAINT reward_catalog_monetary_value_positive CHECK (monetary_value IS NULL OR monetary_value > 0),
    CONSTRAINT reward_catalog_max_redemptions_positive CHECK (max_redemptions_per_customer IS NULL OR max_redemptions_per_customer > 0),
    CONSTRAINT reward_catalog_stock_non_negative CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
    CONSTRAINT reward_catalog_redemption_count_non_negative CHECK (redemption_count >= 0),
    CONSTRAINT reward_catalog_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from),
    CONSTRAINT reward_catalog_image_url_format CHECK (image_url IS NULL OR image_url ~ '^https?://')
);

-- Reward redemption history
CREATE TABLE reward_redemption (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    reward_id uuid NOT NULL REFERENCES reward_catalog(id) ON DELETE RESTRICT,

    -- Redemption details
    points_spent integer NOT NULL,
    monetary_value_used numeric(10,2),
    status redemption_status DEFAULT 'pending',

    -- Unique redemption code for tracking
    redemption_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),

    -- Lifecycle timestamps
    redeemed_at timestamptz DEFAULT now(),
    expires_at timestamptz,  -- Redemption must be used by this date
    fulfilled_at timestamptz,
    fulfilled_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    fulfillment_notes text,

    -- Metadata
    created_at timestamptz DEFAULT now(),

    CONSTRAINT reward_redemption_points_positive CHECK (points_spent > 0),
    CONSTRAINT reward_redemption_monetary_value_positive CHECK (monetary_value_used IS NULL OR monetary_value_used > 0),
    CONSTRAINT reward_redemption_code_format CHECK (char_length(redemption_code) = 16),
    CONSTRAINT reward_redemption_fulfilled_after_redeemed CHECK (fulfilled_at IS NULL OR fulfilled_at >= redeemed_at),
    CONSTRAINT reward_redemption_expires_after_redeemed CHECK (expires_at IS NULL OR expires_at > redeemed_at)
);

-- Loyalty rules engine for automated point awards
CREATE TABLE loyalty_rule (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    program_id uuid NOT NULL REFERENCES loyalty_program(id) ON DELETE CASCADE,

    -- Rule details
    name text NOT NULL,
    description text,

    -- Trigger configuration
    trigger_type text NOT NULL,  -- 'order_placed', 'referral', 'review', 'birthday', 'anniversary', 'signup'

    -- Conditions (JSONB for flexibility)
    -- Format: {"min_order_amount": 100, "product_categories": ["electronics"], "customer_tier": ["gold", "platinum"]}
    conditions jsonb DEFAULT '{}',

    -- Points award configuration
    points_multiplier numeric(10,4) DEFAULT 1.0,  -- Multiply base points by this
    bonus_points integer DEFAULT 0,               -- Add fixed bonus points

    -- Status and priority
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,  -- Higher priority rules evaluated first

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
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Loyalty program indexes
CREATE INDEX idx_loyalty_program_org_active ON loyalty_program(org_id, is_active);
CREATE INDEX idx_loyalty_program_default ON loyalty_program(org_id, is_default) WHERE is_default = true;

-- Customer loyalty indexes
CREATE INDEX idx_customer_loyalty_org_customer ON customer_loyalty(org_id, customer_id);
CREATE INDEX idx_customer_loyalty_program ON customer_loyalty(program_id);
CREATE INDEX idx_customer_loyalty_tier ON customer_loyalty(current_tier);
CREATE INDEX idx_customer_loyalty_points_balance ON customer_loyalty(points_balance);
CREATE INDEX idx_customer_loyalty_lifetime_value ON customer_loyalty(lifetime_value DESC);

-- Loyalty transaction indexes
CREATE INDEX idx_loyalty_transaction_org ON loyalty_transaction(org_id);
CREATE INDEX idx_loyalty_transaction_customer ON loyalty_transaction(customer_id);
CREATE INDEX idx_loyalty_transaction_program ON loyalty_transaction(program_id);
CREATE INDEX idx_loyalty_transaction_type ON loyalty_transaction(transaction_type);
CREATE INDEX idx_loyalty_transaction_reference ON loyalty_transaction(reference_type, reference_id);
CREATE INDEX idx_loyalty_transaction_created_at ON loyalty_transaction(created_at DESC);
CREATE INDEX idx_loyalty_transaction_expires_at ON loyalty_transaction(expires_at) WHERE expires_at IS NOT NULL;

-- Reward catalog indexes
CREATE INDEX idx_reward_catalog_org ON reward_catalog(org_id);
CREATE INDEX idx_reward_catalog_program ON reward_catalog(program_id);
CREATE INDEX idx_reward_catalog_active ON reward_catalog(org_id, is_active) WHERE is_active = true;
CREATE INDEX idx_reward_catalog_featured ON reward_catalog(is_featured) WHERE is_featured = true;
CREATE INDEX idx_reward_catalog_points ON reward_catalog(points_required);
CREATE INDEX idx_reward_catalog_validity ON reward_catalog(valid_from, valid_until);

-- Reward redemption indexes
CREATE INDEX idx_reward_redemption_org ON reward_redemption(org_id);
CREATE INDEX idx_reward_redemption_customer ON reward_redemption(customer_id);
CREATE INDEX idx_reward_redemption_reward ON reward_redemption(reward_id);
CREATE INDEX idx_reward_redemption_status ON reward_redemption(status);
CREATE INDEX idx_reward_redemption_code ON reward_redemption(redemption_code);
CREATE INDEX idx_reward_redemption_redeemed_at ON reward_redemption(redeemed_at DESC);

-- Loyalty rule indexes
CREATE INDEX idx_loyalty_rule_org ON loyalty_rule(org_id);
CREATE INDEX idx_loyalty_rule_program ON loyalty_rule(program_id);
CREATE INDEX idx_loyalty_rule_active ON loyalty_rule(org_id, is_active, priority DESC) WHERE is_active = true;
CREATE INDEX idx_loyalty_rule_trigger ON loyalty_rule(trigger_type);

-- ============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS calculate_points_for_order(uuid, numeric, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS redeem_reward(uuid, uuid, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS redeem_reward(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS update_customer_tier(uuid) CASCADE;
DROP FUNCTION IF EXISTS expire_points() CASCADE;
DROP FUNCTION IF EXISTS get_customer_rewards_summary(uuid) CASCADE;

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
    v_program_record RECORD;
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

-- Redeem a reward
CREATE OR REPLACE FUNCTION redeem_reward(
    p_customer_id uuid,
    p_reward_id uuid,
    p_redemption_expiry_days integer DEFAULT 30
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

    -- Deduct points via transaction
    INSERT INTO loyalty_transaction (
        org_id,
        customer_id,
        program_id,
        transaction_type,
        points_amount,
        reference_type,
        reference_id,
        description,
        created_by
    ) VALUES (
        v_loyalty_record.org_id,
        p_customer_id,
        v_loyalty_record.program_id,
        'redeem',
        -v_reward_record.points_required,
        'redemption',
        v_new_redemption_id,
        format('Redeemed: %s', v_reward_record.name),
        auth.uid()
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

-- Loyalty leaderboard for gamification
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
    -- Rank within tier
    RANK() OVER (
        PARTITION BY cl.org_id, cl.current_tier
        ORDER BY cl.total_points_earned DESC
    ) as tier_rank,
    -- Overall rank
    RANK() OVER (
        PARTITION BY cl.org_id
        ORDER BY cl.total_points_earned DESC
    ) as overall_rank,
    -- Points earned this month
    COALESCE((
        SELECT SUM(lt.points_amount)
        FROM loyalty_transaction lt
        WHERE lt.customer_id = cl.customer_id
        AND lt.transaction_type IN ('earn', 'bonus')
        AND lt.created_at >= date_trunc('month', CURRENT_DATE)
    ), 0) as points_this_month,
    -- Points earned this quarter
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

-- Reward analytics for business intelligence
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
    -- Redemption statistics
    COUNT(rr.id) as total_redemptions,
    COUNT(DISTINCT rr.customer_id) as unique_customers,
    COUNT(*) FILTER (WHERE rr.status = 'fulfilled') as fulfilled_redemptions,
    COUNT(*) FILTER (WHERE rr.status = 'pending') as pending_redemptions,
    COUNT(*) FILTER (WHERE rr.status = 'cancelled') as cancelled_redemptions,
    SUM(rr.points_spent) as total_points_spent,
    SUM(rr.monetary_value_used) as total_monetary_value,
    -- Time-based statistics
    COUNT(*) FILTER (WHERE rr.redeemed_at >= CURRENT_DATE - INTERVAL '30 days') as redemptions_last_30_days,
    COUNT(*) FILTER (WHERE rr.redeemed_at >= CURRENT_DATE - INTERVAL '90 days') as redemptions_last_90_days,
    -- Average fulfillment time
    AVG(EXTRACT(EPOCH FROM (rr.fulfilled_at - rr.redeemed_at)) / 3600) FILTER (WHERE rr.fulfilled_at IS NOT NULL) as avg_fulfillment_hours,
    -- Popularity score (redemptions per active day)
    CASE
        WHEN rc.created_at >= CURRENT_DATE THEN 0
        ELSE rc.redemption_count::numeric /
             GREATEST(1::numeric, (CURRENT_DATE - rc.created_at::date)::numeric)
    END as daily_redemption_rate
FROM reward_catalog rc
LEFT JOIN reward_redemption rr ON rc.id = rr.reward_id
GROUP BY rc.id, rc.org_id, rc.name, rc.reward_type, rc.points_required,
         rc.monetary_value, rc.is_active, rc.is_featured, rc.stock_quantity,
         rc.redemption_count, rc.created_at;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Ensure trigger helper functions are dropped before recreation
DROP FUNCTION IF EXISTS update_customer_loyalty_on_transaction() CASCADE;
DROP FUNCTION IF EXISTS validate_reward_redemption() CASCADE;
DROP FUNCTION IF EXISTS auto_expire_redemptions() CASCADE;

-- Auto-update customer loyalty points on transaction insert
CREATE OR REPLACE FUNCTION update_customer_loyalty_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update customer loyalty record
    UPDATE customer_loyalty
    SET
        total_points_earned = CASE
            WHEN NEW.transaction_type IN ('earn', 'bonus') THEN total_points_earned + NEW.points_amount
            ELSE total_points_earned
        END,
        total_points_redeemed = CASE
            WHEN NEW.transaction_type IN ('redeem', 'expire') THEN total_points_redeemed + ABS(NEW.points_amount)
            ELSE total_points_redeemed
        END,
        points_balance = points_balance + NEW.points_amount,
        updated_at = now()
    WHERE customer_id = NEW.customer_id
    AND program_id = NEW.program_id;

    -- Check for tier progression on earn/bonus transactions
    IF NEW.transaction_type IN ('earn', 'bonus') THEN
        PERFORM update_customer_tier(NEW.customer_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate reward redemption business rules
CREATE OR REPLACE FUNCTION validate_reward_redemption()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_points bigint;
    v_reward_points integer;
    v_reward_stock integer;
BEGIN
    -- Get customer points balance
    SELECT points_balance INTO v_customer_points
    FROM customer_loyalty
    WHERE customer_id = NEW.customer_id;

    -- Get reward details
    SELECT points_required, stock_quantity INTO v_reward_points, v_reward_stock
    FROM reward_catalog
    WHERE id = NEW.reward_id;

    -- Validate sufficient points
    IF v_customer_points < v_reward_points THEN
        RAISE EXCEPTION 'Insufficient points for redemption. Required: %, Available: %',
            v_reward_points, v_customer_points;
    END IF;

    -- Validate stock availability
    IF v_reward_stock IS NOT NULL AND v_reward_stock <= 0 THEN
        RAISE EXCEPTION 'Reward out of stock';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_reward_redemption_trigger
    BEFORE INSERT ON reward_redemption
    FOR EACH ROW
    EXECUTE FUNCTION validate_reward_redemption();

-- Auto-expire redemptions
CREATE OR REPLACE FUNCTION auto_expire_redemptions()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark as expired if past expiry date and not fulfilled
    IF NEW.expires_at IS NOT NULL
       AND NEW.expires_at <= now()
       AND NEW.status NOT IN ('fulfilled', 'cancelled', 'expired') THEN
        NEW.status := 'expired';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_expire_redemptions_trigger
    BEFORE UPDATE ON reward_redemption
    FOR EACH ROW
    WHEN (NEW.expires_at IS NOT NULL AND OLD.status != 'expired')
    EXECUTE FUNCTION auto_expire_redemptions();

-- Updated timestamp triggers
CREATE TRIGGER update_loyalty_program_updated_at
    BEFORE UPDATE ON loyalty_program
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_loyalty_updated_at
    BEFORE UPDATE ON customer_loyalty
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_catalog_updated_at
    BEFORE UPDATE ON reward_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_rule_updated_at
    BEFORE UPDATE ON loyalty_rule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers
CREATE TRIGGER audit_loyalty_program
    AFTER INSERT OR UPDATE OR DELETE ON loyalty_program
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_customer_loyalty
    AFTER INSERT OR UPDATE OR DELETE ON customer_loyalty
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_loyalty_transaction
    AFTER INSERT OR UPDATE OR DELETE ON loyalty_transaction
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_reward_catalog
    AFTER INSERT OR UPDATE OR DELETE ON reward_catalog
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_reward_redemption
    AFTER INSERT OR UPDATE OR DELETE ON reward_redemption
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_loyalty_rule
    AFTER INSERT OR UPDATE OR DELETE ON loyalty_rule
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE loyalty_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemption ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rule ENABLE ROW LEVEL SECURITY;

-- Loyalty program policies
CREATE POLICY loyalty_program_org_isolation ON loyalty_program
    FOR ALL
    USING (org_id = (SELECT org_id FROM profile WHERE id = auth.uid()));

CREATE POLICY loyalty_program_select_public ON loyalty_program
    FOR SELECT
    USING (is_active = true);

CREATE POLICY loyalty_program_admin_only ON loyalty_program
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM profile WHERE id = auth.uid()) IN ('admin', 'manager')
    );

-- Customer loyalty policies
CREATE POLICY customer_loyalty_org_isolation ON customer_loyalty
    FOR ALL
    USING (org_id = (SELECT org_id FROM profile WHERE id = auth.uid()));

CREATE POLICY customer_loyalty_customer_view ON customer_loyalty
    FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customer WHERE org_id = (SELECT org_id FROM profile WHERE id = auth.uid())
        )
    );

-- Loyalty transaction policies
CREATE POLICY loyalty_transaction_org_isolation ON loyalty_transaction
    FOR ALL
    USING (org_id = (SELECT org_id FROM profile WHERE id = auth.uid()));

CREATE POLICY loyalty_transaction_customer_view ON loyalty_transaction
    FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customer WHERE org_id = (SELECT org_id FROM profile WHERE id = auth.uid())
        )
    );

-- Reward catalog policies
CREATE POLICY reward_catalog_org_isolation ON reward_catalog
    FOR ALL
    USING (org_id = (SELECT org_id FROM profile WHERE id = auth.uid()));

CREATE POLICY reward_catalog_active_public ON reward_catalog
    FOR SELECT
    USING (is_active = true);

CREATE POLICY reward_catalog_admin_only ON reward_catalog
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM profile WHERE id = auth.uid()) IN ('admin', 'manager')
    );

-- Reward redemption policies
CREATE POLICY reward_redemption_org_isolation ON reward_redemption
    FOR ALL
    USING (org_id = (SELECT org_id FROM profile WHERE id = auth.uid()));

CREATE POLICY reward_redemption_customer_view ON reward_redemption
    FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customer WHERE org_id = (SELECT org_id FROM profile WHERE id = auth.uid())
        )
    );

-- Loyalty rule policies
CREATE POLICY loyalty_rule_org_isolation ON loyalty_rule
    FOR ALL
    USING (org_id = (SELECT org_id FROM profile WHERE id = auth.uid()));

CREATE POLICY loyalty_rule_admin_only ON loyalty_rule
    FOR ALL
    USING (
        (SELECT role FROM profile WHERE id = auth.uid()) IN ('admin', 'manager')
    );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE loyalty_program IS 'Loyalty program configuration with tier thresholds and benefits';
COMMENT ON TABLE customer_loyalty IS 'Customer loyalty status, points balance, and tier tracking';
COMMENT ON TABLE loyalty_transaction IS 'Complete history of all loyalty points movements';
COMMENT ON TABLE reward_catalog IS 'Available rewards that customers can redeem';
COMMENT ON TABLE reward_redemption IS 'History of reward redemptions by customers';
COMMENT ON TABLE loyalty_rule IS 'Automated rules for awarding bonus points';

COMMENT ON FUNCTION calculate_points_for_order IS 'Calculates points to award for an order based on amount, tier, and active rules';
COMMENT ON FUNCTION redeem_reward IS 'Processes a reward redemption with validation and stock management';
COMMENT ON FUNCTION update_customer_tier IS 'Updates customer tier based on lifetime points earned';
COMMENT ON FUNCTION expire_points IS 'Batch process to expire old points based on program expiry settings';
COMMENT ON FUNCTION get_customer_rewards_summary IS 'Comprehensive customer rewards summary with benefits and progress';

INSERT INTO schema_migrations (migration_name)
VALUES ('0015_loyalty_rewards')
ON CONFLICT (migration_name) DO NOTHING;

COMMENT ON VIEW loyalty_leaderboard IS 'Customer rankings for gamification and engagement';
COMMENT ON VIEW reward_analytics IS 'Business intelligence on reward performance and popularity';

-- down

DROP POLICY IF EXISTS loyalty_rule_admin_only ON loyalty_rule;
DROP POLICY IF EXISTS loyalty_rule_org_isolation ON loyalty_rule;
DROP POLICY IF EXISTS reward_redemption_customer_view ON reward_redemption;
DROP POLICY IF EXISTS reward_redemption_org_isolation ON reward_redemption;
DROP POLICY IF EXISTS reward_catalog_admin_only ON reward_catalog;
DROP POLICY IF EXISTS reward_catalog_active_public ON reward_catalog;
DROP POLICY IF EXISTS reward_catalog_org_isolation ON reward_catalog;
DROP POLICY IF EXISTS loyalty_transaction_customer_view ON loyalty_transaction;
DROP POLICY IF EXISTS loyalty_transaction_org_isolation ON loyalty_transaction;
DROP POLICY IF EXISTS customer_loyalty_customer_view ON customer_loyalty;
DROP POLICY IF EXISTS customer_loyalty_org_isolation ON customer_loyalty;
DROP POLICY IF EXISTS loyalty_program_admin_only ON loyalty_program;
DROP POLICY IF EXISTS loyalty_program_select_public ON loyalty_program;
DROP POLICY IF EXISTS loyalty_program_org_isolation ON loyalty_program;

DROP TRIGGER IF EXISTS audit_loyalty_rule ON loyalty_rule;
DROP TRIGGER IF EXISTS audit_reward_redemption ON reward_redemption;
DROP TRIGGER IF EXISTS audit_reward_catalog ON reward_catalog;
DROP TRIGGER IF EXISTS audit_loyalty_transaction ON loyalty_transaction;
DROP TRIGGER IF EXISTS audit_customer_loyalty ON customer_loyalty;
DROP TRIGGER IF EXISTS audit_loyalty_program ON loyalty_program;
DROP TRIGGER IF EXISTS update_loyalty_rule_updated_at ON loyalty_rule;
DROP TRIGGER IF EXISTS update_reward_catalog_updated_at ON reward_catalog;
DROP TRIGGER IF EXISTS update_customer_loyalty_updated_at ON customer_loyalty;
DROP TRIGGER IF EXISTS update_loyalty_program_updated_at ON loyalty_program;
DROP TRIGGER IF EXISTS auto_expire_redemptions_trigger ON reward_redemption;
DROP TRIGGER IF EXISTS validate_reward_redemption_trigger ON reward_redemption;
DROP TRIGGER IF EXISTS update_customer_loyalty_on_transaction_trigger ON loyalty_transaction;

DROP FUNCTION IF EXISTS auto_expire_redemptions() CASCADE;
DROP FUNCTION IF EXISTS validate_reward_redemption() CASCADE;
DROP FUNCTION IF EXISTS update_customer_loyalty_on_transaction() CASCADE;

DROP VIEW IF EXISTS reward_analytics;
DROP VIEW IF EXISTS loyalty_leaderboard;

DROP FUNCTION IF EXISTS get_customer_rewards_summary(uuid) CASCADE;
DROP FUNCTION IF EXISTS expire_points() CASCADE;
DROP FUNCTION IF EXISTS update_customer_tier(uuid) CASCADE;
DROP FUNCTION IF EXISTS redeem_reward(uuid, uuid, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS redeem_reward(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS calculate_points_for_order(uuid, numeric, uuid, jsonb) CASCADE;

DROP INDEX IF EXISTS idx_loyalty_rule_trigger;
DROP INDEX IF EXISTS idx_loyalty_rule_active;
DROP INDEX IF EXISTS idx_loyalty_rule_program;
DROP INDEX IF EXISTS idx_loyalty_rule_org;
DROP INDEX IF EXISTS idx_reward_redemption_redeemed_at;
DROP INDEX IF EXISTS idx_reward_redemption_code;
DROP INDEX IF EXISTS idx_reward_redemption_status;
DROP INDEX IF EXISTS idx_reward_redemption_reward;
DROP INDEX IF EXISTS idx_reward_redemption_customer;
DROP INDEX IF EXISTS idx_reward_redemption_org;
DROP INDEX IF EXISTS idx_reward_catalog_validity;
DROP INDEX IF EXISTS idx_reward_catalog_points;
DROP INDEX IF EXISTS idx_reward_catalog_featured;
DROP INDEX IF EXISTS idx_reward_catalog_active;
DROP INDEX IF EXISTS idx_reward_catalog_program;
DROP INDEX IF EXISTS idx_reward_catalog_org;
DROP INDEX IF EXISTS idx_loyalty_transaction_expires_at;
DROP INDEX IF EXISTS idx_loyalty_transaction_created_at;
DROP INDEX IF EXISTS idx_loyalty_transaction_reference;
DROP INDEX IF EXISTS idx_loyalty_transaction_type;
DROP INDEX IF EXISTS idx_loyalty_transaction_program;
DROP INDEX IF EXISTS idx_loyalty_transaction_customer;
DROP INDEX IF EXISTS idx_loyalty_transaction_org;
DROP INDEX IF EXISTS idx_customer_loyalty_lifetime_value;
DROP INDEX IF EXISTS idx_customer_loyalty_points_balance;
DROP INDEX IF EXISTS idx_customer_loyalty_tier;
DROP INDEX IF EXISTS idx_customer_loyalty_program;
DROP INDEX IF EXISTS idx_customer_loyalty_org_customer;
DROP INDEX IF EXISTS idx_loyalty_program_default;
DROP INDEX IF EXISTS idx_loyalty_program_org_active;

DROP TABLE IF EXISTS loyalty_rule;
DROP TABLE IF EXISTS reward_redemption;
DROP TABLE IF EXISTS reward_catalog;
DROP TABLE IF EXISTS loyalty_transaction;
DROP TABLE IF EXISTS customer_loyalty;
DROP TABLE IF EXISTS loyalty_program;

DROP TYPE IF EXISTS redemption_status;
DROP TYPE IF EXISTS transaction_type;
DROP TYPE IF EXISTS reward_type;
DROP TYPE IF EXISTS loyalty_tier;
