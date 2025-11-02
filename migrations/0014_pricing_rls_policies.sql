-- =====================================================
-- PRICING & OPTIMIZATION - RLS POLICIES
-- =====================================================
-- Migration: 0014_pricing_rls_policies.sql
-- Description: Row Level Security policies for pricing system tables
-- Dependencies: 0013_pricing_optimization.sql, 0007_rls_policies.sql
-- up

-- =====================================================
-- ENABLE RLS ON PRICING TABLES
-- =====================================================

ALTER TABLE pricing_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_optimization ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_recommendation ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_elasticity ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_pricing_tier ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_pricing_tier ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PRICING RULE POLICIES
-- =====================================================

-- Organization isolation
CREATE POLICY "pricing_rule_org_isolation" ON pricing_rule
    FOR ALL USING (org_id = auth.user_org_id());

-- Read access for all authenticated users in org
CREATE POLICY "pricing_rule_read" ON pricing_rule
    FOR SELECT USING (org_id = auth.user_org_id());

-- Insert/Update/Delete for admin and ops_manager only
CREATE POLICY "pricing_rule_write" ON pricing_rule
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

CREATE POLICY "pricing_rule_update" ON pricing_rule
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

CREATE POLICY "pricing_rule_delete" ON pricing_rule
    FOR DELETE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin'])
    );

-- =====================================================
-- PRICE HISTORY POLICIES
-- =====================================================

-- Organization isolation (read-only for all)
CREATE POLICY "price_history_org_isolation" ON price_history
    FOR ALL USING (org_id = auth.user_org_id());

-- Read access for all authenticated users
CREATE POLICY "price_history_read" ON price_history
    FOR SELECT USING (org_id = auth.user_org_id());

-- System can insert (via triggers)
CREATE POLICY "price_history_system_insert" ON price_history
    FOR INSERT WITH CHECK (org_id = auth.user_org_id());

-- No manual updates or deletes (audit trail integrity)
-- Only admins can delete in exceptional cases
CREATE POLICY "price_history_admin_delete" ON price_history
    FOR DELETE USING (
        org_id = auth.user_org_id() AND
        auth.is_admin()
    );

-- =====================================================
-- PRICING OPTIMIZATION POLICIES
-- =====================================================

-- Organization isolation
CREATE POLICY "pricing_optimization_org_isolation" ON pricing_optimization
    FOR ALL USING (org_id = auth.user_org_id());

-- Read access for all
CREATE POLICY "pricing_optimization_read" ON pricing_optimization
    FOR SELECT USING (org_id = auth.user_org_id());

-- Create optimizations: admin, ops_manager
CREATE POLICY "pricing_optimization_write" ON pricing_optimization
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

-- Update optimizations: creator or admin
CREATE POLICY "pricing_optimization_update" ON pricing_optimization
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        (created_by = auth.uid() OR auth.is_admin())
    );

-- Delete: admin only
CREATE POLICY "pricing_optimization_delete" ON pricing_optimization
    FOR DELETE USING (
        org_id = auth.user_org_id() AND
        auth.is_admin()
    );

-- =====================================================
-- PRICING RECOMMENDATION POLICIES
-- =====================================================

-- Organization isolation
CREATE POLICY "pricing_recommendation_org_isolation" ON pricing_recommendation
    FOR ALL USING (org_id = auth.user_org_id());

-- Read access for all
CREATE POLICY "pricing_recommendation_read" ON pricing_recommendation
    FOR SELECT USING (org_id = auth.user_org_id());

-- System can insert (via generate_pricing_recommendations)
CREATE POLICY "pricing_recommendation_insert" ON pricing_recommendation
    FOR INSERT WITH CHECK (org_id = auth.user_org_id());

-- Update (review/approval): admin, ops_manager
CREATE POLICY "pricing_recommendation_update" ON pricing_recommendation
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

-- Delete: admin only
CREATE POLICY "pricing_recommendation_delete" ON pricing_recommendation
    FOR DELETE USING (
        org_id = auth.user_org_id() AND
        auth.is_admin()
    );

-- =====================================================
-- COMPETITOR PRICING POLICIES
-- =====================================================

-- Organization isolation
CREATE POLICY "competitor_pricing_org_isolation" ON competitor_pricing
    FOR ALL USING (org_id = auth.user_org_id());

-- Read access for all
CREATE POLICY "competitor_pricing_read" ON competitor_pricing
    FOR SELECT USING (org_id = auth.user_org_id());

-- Insert/Update: admin, ops_manager, ai_team
CREATE POLICY "competitor_pricing_write" ON competitor_pricing
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager', 'ai_team'])
    );

CREATE POLICY "competitor_pricing_update" ON competitor_pricing
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager', 'ai_team'])
    );

-- Delete: admin only
CREATE POLICY "competitor_pricing_delete" ON competitor_pricing
    FOR DELETE USING (
        org_id = auth.user_org_id() AND
        auth.is_admin()
    );

-- =====================================================
-- PRICE ELASTICITY POLICIES
-- =====================================================

-- Organization isolation
CREATE POLICY "price_elasticity_org_isolation" ON price_elasticity
    FOR ALL USING (org_id = auth.user_org_id());

-- Read access for all
CREATE POLICY "price_elasticity_read" ON price_elasticity
    FOR SELECT USING (org_id = auth.user_org_id());

-- Insert: system/admin only
CREATE POLICY "price_elasticity_write" ON price_elasticity
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ai_team'])
    );

-- Update: admin only
CREATE POLICY "price_elasticity_update" ON price_elasticity
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.is_admin()
    );

-- Delete: admin only
CREATE POLICY "price_elasticity_delete" ON price_elasticity
    FOR DELETE USING (
        org_id = auth.user_org_id() AND
        auth.is_admin()
    );

-- =====================================================
-- CUSTOMER PRICING TIER POLICIES
-- =====================================================

-- Organization isolation
CREATE POLICY "customer_pricing_tier_org_isolation" ON customer_pricing_tier
    FOR ALL USING (org_id = auth.user_org_id());

-- Read access for all
CREATE POLICY "customer_pricing_tier_read" ON customer_pricing_tier
    FOR SELECT USING (org_id = auth.user_org_id());

-- Insert/Update: admin, ops_manager
CREATE POLICY "customer_pricing_tier_write" ON customer_pricing_tier
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

CREATE POLICY "customer_pricing_tier_update" ON customer_pricing_tier
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

-- Delete: admin only
CREATE POLICY "customer_pricing_tier_delete" ON customer_pricing_tier
    FOR DELETE USING (
        org_id = auth.user_org_id() AND
        auth.is_admin()
    );

-- =====================================================
-- VOLUME PRICING TIER POLICIES
-- =====================================================

-- Organization isolation
CREATE POLICY "volume_pricing_tier_org_isolation" ON volume_pricing_tier
    FOR ALL USING (org_id = auth.user_org_id());

-- Read access for all
CREATE POLICY "volume_pricing_tier_read" ON volume_pricing_tier
    FOR SELECT USING (org_id = auth.user_org_id());

-- Insert/Update: admin, ops_manager
CREATE POLICY "volume_pricing_tier_write" ON volume_pricing_tier
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

CREATE POLICY "volume_pricing_tier_update" ON volume_pricing_tier
    FOR UPDATE USING (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );

-- Delete: admin only
CREATE POLICY "volume_pricing_tier_delete" ON volume_pricing_tier
    FOR DELETE USING (
        org_id = auth.user_org_id() AND
        auth.is_admin()
    );

-- =====================================================
-- VERIFY RLS POLICIES
-- =====================================================

-- Query to verify all policies are created
DO $$
DECLARE
    v_policy_count integer;
    v_expected_count integer := 32;  -- Total expected policies
BEGIN
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND (
        tablename = 'pricing_rule'
        OR tablename = 'price_history'
        OR tablename = 'pricing_optimization'
        OR tablename = 'pricing_recommendation'
        OR tablename = 'competitor_pricing'
        OR tablename = 'price_elasticity'
        OR tablename = 'customer_pricing_tier'
        OR tablename = 'volume_pricing_tier'
    );

    IF v_policy_count >= v_expected_count THEN
        RAISE NOTICE 'SUCCESS: % RLS policies created for pricing system', v_policy_count;
    ELSE
        RAISE WARNING 'WARNING: Only % of % expected RLS policies created', v_policy_count, v_expected_count;
    END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "pricing_rule_org_isolation" ON pricing_rule IS 'Ensures users can only access pricing rules in their organization';
COMMENT ON POLICY "price_history_read" ON price_history IS 'All authenticated users can view price history for audit transparency';
COMMENT ON POLICY "pricing_recommendation_update" ON pricing_recommendation IS 'Only admin and ops_manager can approve/reject pricing recommendations';
COMMENT ON POLICY "competitor_pricing_write" ON competitor_pricing IS 'AI team can add competitor pricing data via scrapers';
COMMENT ON POLICY "customer_pricing_tier_write" ON customer_pricing_tier IS 'Only managers can assign customer pricing tiers';

-- down

-- Drop all pricing RLS policies
DROP POLICY IF EXISTS "volume_pricing_tier_delete" ON volume_pricing_tier;
DROP POLICY IF EXISTS "volume_pricing_tier_update" ON volume_pricing_tier;
DROP POLICY IF EXISTS "volume_pricing_tier_write" ON volume_pricing_tier;
DROP POLICY IF EXISTS "volume_pricing_tier_read" ON volume_pricing_tier;
DROP POLICY IF EXISTS "volume_pricing_tier_org_isolation" ON volume_pricing_tier;

DROP POLICY IF EXISTS "customer_pricing_tier_delete" ON customer_pricing_tier;
DROP POLICY IF EXISTS "customer_pricing_tier_update" ON customer_pricing_tier;
DROP POLICY IF EXISTS "customer_pricing_tier_write" ON customer_pricing_tier;
DROP POLICY IF EXISTS "customer_pricing_tier_read" ON customer_pricing_tier;
DROP POLICY IF EXISTS "customer_pricing_tier_org_isolation" ON customer_pricing_tier;

DROP POLICY IF EXISTS "price_elasticity_delete" ON price_elasticity;
DROP POLICY IF EXISTS "price_elasticity_update" ON price_elasticity;
DROP POLICY IF EXISTS "price_elasticity_write" ON price_elasticity;
DROP POLICY IF EXISTS "price_elasticity_read" ON price_elasticity;
DROP POLICY IF EXISTS "price_elasticity_org_isolation" ON price_elasticity;

DROP POLICY IF EXISTS "competitor_pricing_delete" ON competitor_pricing;
DROP POLICY IF EXISTS "competitor_pricing_update" ON competitor_pricing;
DROP POLICY IF EXISTS "competitor_pricing_write" ON competitor_pricing;
DROP POLICY IF EXISTS "competitor_pricing_read" ON competitor_pricing;
DROP POLICY IF EXISTS "competitor_pricing_org_isolation" ON competitor_pricing;

DROP POLICY IF EXISTS "pricing_recommendation_delete" ON pricing_recommendation;
DROP POLICY IF EXISTS "pricing_recommendation_update" ON pricing_recommendation;
DROP POLICY IF EXISTS "pricing_recommendation_insert" ON pricing_recommendation;
DROP POLICY IF EXISTS "pricing_recommendation_read" ON pricing_recommendation;
DROP POLICY IF EXISTS "pricing_recommendation_org_isolation" ON pricing_recommendation;

DROP POLICY IF EXISTS "pricing_optimization_delete" ON pricing_optimization;
DROP POLICY IF EXISTS "pricing_optimization_update" ON pricing_optimization;
DROP POLICY IF EXISTS "pricing_optimization_write" ON pricing_optimization;
DROP POLICY IF EXISTS "pricing_optimization_read" ON pricing_optimization;
DROP POLICY IF EXISTS "pricing_optimization_org_isolation" ON pricing_optimization;

DROP POLICY IF EXISTS "price_history_admin_delete" ON price_history;
DROP POLICY IF EXISTS "price_history_system_insert" ON price_history;
DROP POLICY IF EXISTS "price_history_read" ON price_history;
DROP POLICY IF EXISTS "price_history_org_isolation" ON price_history;

DROP POLICY IF EXISTS "pricing_rule_delete" ON pricing_rule;
DROP POLICY IF EXISTS "pricing_rule_update" ON pricing_rule;
DROP POLICY IF EXISTS "pricing_rule_write" ON pricing_rule;
DROP POLICY IF EXISTS "pricing_rule_read" ON pricing_rule;
DROP POLICY IF EXISTS "pricing_rule_org_isolation" ON pricing_rule;

-- Disable RLS
ALTER TABLE volume_pricing_tier DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_pricing_tier DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_elasticity DISABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_recommendation DISABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_optimization DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rule DISABLE ROW LEVEL SECURITY;
