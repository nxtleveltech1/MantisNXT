-- ============================================================================
-- SEED DATA FOR LOYALTY & AI ANALYTICS SYSTEMS
-- ============================================================================
-- Comprehensive seed data for testing and demonstration
-- ============================================================================

BEGIN;

-- ============================================================================
-- LOYALTY SYSTEM SEED DATA
-- ============================================================================

-- Create default loyalty program (if no org_id constraint)
INSERT INTO loyalty_program (
  org_id,
  name,
  description,
  is_active,
  is_default,
  earn_rate,
  tier_thresholds,
  tier_benefits,
  points_expiry_days
) VALUES (
  NULL,  -- Application will manage org_id
  'Default Rewards Program',
  'Standard loyalty rewards program with tiered benefits',
  true,
  true,
  1.0,
  '{"bronze": 0, "silver": 1000, "gold": 5000, "platinum": 15000, "diamond": 50000}'::jsonb,
  '{
    "bronze": {"multiplier": 1.0},
    "silver": {"multiplier": 1.2, "discount": 5},
    "gold": {"multiplier": 1.5, "discount": 10, "free_shipping": true},
    "platinum": {"multiplier": 2.0, "discount": 15, "free_shipping": true, "priority_support": true},
    "diamond": {"multiplier": 3.0, "discount": 20, "free_shipping": true, "priority_support": true, "dedicated_rep": true}
  }'::jsonb,
  365
);

-- Get the program ID for subsequent inserts
DO $$
DECLARE
  v_program_id uuid;
BEGIN
  SELECT id INTO v_program_id
  FROM loyalty_program
  WHERE name = 'Default Rewards Program'
  LIMIT 1;

  -- Create loyalty rules
  INSERT INTO loyalty_rule (
    org_id,
    program_id,
    name,
    description,
    trigger_type,
    conditions,
    points_multiplier,
    bonus_points,
    is_active,
    priority
  ) VALUES
  (
    NULL,
    v_program_id,
    'Large Order Bonus',
    'Earn 2x points on orders over $500',
    'order_placed',
    '{"min_order_amount": 500}'::jsonb,
    2.0,
    0,
    true,
    100
  ),
  (
    NULL,
    v_program_id,
    'New Customer Welcome',
    'Bonus 500 points for first order',
    'signup',
    '{}'::jsonb,
    1.0,
    500,
    true,
    200
  ),
  (
    NULL,
    v_program_id,
    'Gold Tier Special',
    'Additional 500 bonus points for Gold+ tier orders over $1000',
    'order_placed',
    '{"min_order_amount": 1000, "required_tier": "gold"}'::jsonb,
    1.0,
    500,
    true,
    150
  )
;

  -- Create reward catalog items
  INSERT INTO reward_catalog (
    org_id,
    program_id,
    name,
    description,
    reward_type,
    points_required,
    monetary_value,
    max_redemptions_per_customer,
    stock_quantity,
    is_active,
    is_featured
  ) VALUES
  (
    NULL,
    v_program_id,
    '$10 Discount Voucher',
    'Get $10 off your next purchase',
    'discount',
    500,
    10.00,
    5,
    NULL,
    true,
    true
  ),
  (
    NULL,
    v_program_id,
    '$25 Discount Voucher',
    'Get $25 off your next purchase',
    'discount',
    1200,
    25.00,
    3,
    NULL,
    true,
    true
  ),
  (
    NULL,
    v_program_id,
    'Free Shipping (1 Month)',
    'Enjoy free shipping for one month',
    'free_shipping',
    800,
    15.00,
    2,
    100,
    true,
    false
  ),
  (
    NULL,
    v_program_id,
    '$100 Cashback',
    'Get $100 credited to your account',
    'cashback',
    5000,
    100.00,
    1,
    50,
    true,
    true
  ),
  (
    NULL,
    v_program_id,
    'Tier Upgrade (Gold)',
    'Instant upgrade to Gold tier for 6 months',
    'upgrade',
    3000,
    50.00,
    1,
    25,
    true,
    true
  )
;
END $$;

-- ============================================================================
-- AI ANALYTICS SYSTEM SEED DATA
-- ============================================================================

-- Create stub user for dashboards (if needed)
-- Insert user only if doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com') THEN
    INSERT INTO users (id, email) VALUES (gen_random_uuid(), 'admin@example.com');
  END IF;
END $$;

-- Get user ID for subsequent inserts
DO $$
DECLARE
  v_user_id uuid;
  v_dashboard_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'admin@example.com'
  LIMIT 1;

  -- Create AI service configurations
  INSERT INTO ai_service_config (
    org_id,
    service_type,
    is_enabled,
    provider,
    model_name,
    config,
    rate_limit_per_hour,
    created_by
  ) VALUES
  (
    NULL,
    'demand_forecasting',
    true,
    'openai',
    'gpt-4',
    '{"temperature": 0.2, "max_tokens": 1000}'::jsonb,
    1000,
    v_user_id
  ),
  (
    NULL,
    'anomaly_detection',
    true,
    'anthropic',
    'claude-3-sonnet',
    '{"temperature": 0.1, "max_tokens": 2000}'::jsonb,
    500,
    v_user_id
  ),
  (
    NULL,
    'supplier_scoring',
    true,
    'openai',
    'gpt-4-turbo',
    '{"temperature": 0.3, "max_tokens": 1500}'::jsonb,
    750,
    v_user_id
  ),
  (
    NULL,
    'chatbot',
    true,
    'anthropic',
    'claude-3-opus',
    '{"temperature": 0.7, "max_tokens": 4000}'::jsonb,
    2000,
    v_user_id
  ),
  (
    NULL,
    'recommendation_engine',
    true,
    'openai',
    'gpt-4',
    '{"temperature": 0.5, "max_tokens": 2000}'::jsonb,
    1000,
    v_user_id
  )
;

  -- Create sample analytics dashboard
  INSERT INTO analytics_dashboard (
    org_id,
    name,
    description,
    layout,
    filters,
    is_default,
    is_shared,
    created_by
  ) VALUES (
    NULL,
    'Executive Overview',
    'High-level business metrics and KPIs',
    '[
      {"widget_id": 1, "x": 0, "y": 0, "w": 4, "h": 3},
      {"widget_id": 2, "x": 4, "y": 0, "w": 4, "h": 3},
      {"widget_id": 3, "x": 0, "y": 3, "w": 6, "h": 4},
      {"widget_id": 4, "x": 6, "y": 3, "w": 2, "h": 4}
    ]'::jsonb,
    '{"date_range": "30d", "refresh": "auto"}'::jsonb,
    true,
    true,
    v_user_id
  )
  RETURNING id INTO v_dashboard_id;

  -- Create sample widgets for the dashboard
  INSERT INTO analytics_widget (
    org_id,
    dashboard_id,
    widget_type,
    metric_type,
    config,
    query,
    refresh_interval_seconds,
    position_x,
    position_y,
    width,
    height
  ) VALUES
  (
    NULL,
    v_dashboard_id,
    'kpi',
    'sales',
    '{"title": "Total Sales", "format": "currency", "trend": true}'::jsonb,
    '{"aggregation": "sum", "field": "total_amount", "timeframe": "30d"}'::jsonb,
    300,
    0,
    0,
    4,
    3
  ),
  (
    NULL,
    v_dashboard_id,
    'kpi',
    'inventory',
    '{"title": "Low Stock Items", "format": "number", "alert_threshold": 10}'::jsonb,
    '{"filter": "stock_quantity < reorder_point", "count": true}'::jsonb,
    300,
    4,
    0,
    4,
    3
  ),
  (
    NULL,
    v_dashboard_id,
    'chart',
    'supplier_performance',
    '{"title": "Top Suppliers", "chart_type": "bar", "limit": 10}'::jsonb,
    '{"aggregation": "avg", "field": "performance_score", "group_by": "supplier_id"}'::jsonb,
    600,
    0,
    3,
    6,
    4
  ),
  (
    NULL,
    v_dashboard_id,
    'kpi',
    'customer_behavior',
    '{"title": "Active Customers", "format": "number", "comparison": "previous_period"}'::jsonb,
    '{"filter": "last_order_date > now() - interval \'30 days\'", "count": true}'::jsonb,
    300,
    6,
    3,
    2,
    4
  );

  -- Create sample AI alert
  INSERT INTO ai_alert (
    org_id,
    service_type,
    severity,
    title,
    message,
    recommendations,
    entity_type,
    is_acknowledged,
    is_resolved
  ) VALUES
  (
    NULL,
    'anomaly_detection',
    'warning',
    'Unusual Order Volume Detected',
    'Order volume has increased by 45% compared to the 7-day average. This may indicate a trend or data anomaly.',
    '[
      {"action": "verify_data_accuracy", "description": "Verify that recent orders are correctly recorded"},
      {"action": "check_promotional_campaigns", "description": "Check if there are any active promotions driving increased orders"},
      {"action": "review_inventory_levels", "description": "Ensure sufficient inventory to meet increased demand"}
    ]'::jsonb,
    'order',
    false,
    false
  ),
  (
    NULL,
    'supplier_scoring',
    'critical',
    'Supplier Performance Declining',
    'Supplier #12345 has shown a 30% increase in late deliveries over the past 30 days.',
    '[
      {"action": "contact_supplier", "description": "Reach out to supplier to discuss delivery issues"},
      {"action": "review_contract", "description": "Review SLA terms and consider penalties"},
      {"action": "identify_alternatives", "description": "Research alternative suppliers for critical items"}
    ]'::jsonb,
    'supplier',
    false,
    false
  );
END $$;

COMMIT;

SELECT 'Seed data inserted successfully' AS status;

-- Verify seed data
SELECT
  (SELECT COUNT(*) FROM loyalty_program) as loyalty_programs,
  (SELECT COUNT(*) FROM loyalty_rule) as loyalty_rules,
  (SELECT COUNT(*) FROM reward_catalog) as reward_catalog_items,
  (SELECT COUNT(*) FROM ai_service_config) as ai_services,
  (SELECT COUNT(*) FROM analytics_dashboard) as dashboards,
  (SELECT COUNT(*) FROM analytics_widget) as widgets,
  (SELECT COUNT(*) FROM ai_alert) as ai_alerts;
