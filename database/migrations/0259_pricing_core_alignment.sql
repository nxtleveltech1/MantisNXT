-- =====================================================
-- 0259_pricing_core_alignment.sql
-- Align pricing tables/views with core schema contract
-- Adds org_id + currency columns to optimization tables and price change log
-- Creates core pricing tables and backfills from public when present
-- =====================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS core;

-- =====================================================
-- CORE PRICING RULES (canonical)
-- =====================================================
CREATE TABLE IF NOT EXISTS core.pricing_rule (
  rule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  strategy text NOT NULL DEFAULT 'cost_plus',

  inventory_item_id uuid,
  category_id uuid,
  brand_id uuid,
  supplier_id uuid,

  category_ids uuid[],
  brand_ids uuid[],
  supplier_ids uuid[],
  product_ids uuid[],

  base_cost numeric(12,2),
  markup_percentage numeric(6,2),
  fixed_margin numeric(12,2),
  min_price numeric(12,2),
  max_price numeric(12,2),
  tier text,

  conditions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_global boolean DEFAULT false,
  priority integer DEFAULT 100,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,

  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Extend legacy public.pricing_rule for multi-scope targeting if it exists
DO 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pricing_rule'
  ) THEN
    ALTER TABLE public.pricing_rule
      ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS category_ids uuid[],
      ADD COLUMN IF NOT EXISTS brand_ids uuid[],
      ADD COLUMN IF NOT EXISTS supplier_ids uuid[],
      ADD COLUMN IF NOT EXISTS product_ids uuid[];
  END IF;
END ;

-- Backfill core.pricing_rule from public.pricing_rule
INSERT INTO core.pricing_rule (
  rule_id,
  org_id,
  name,
  description,
  strategy,
  inventory_item_id,
  category_id,
  brand_id,
  supplier_id,
  category_ids,
  brand_ids,
  supplier_ids,
  product_ids,
  base_cost,
  markup_percentage,
  fixed_margin,
  min_price,
  max_price,
  tier,
  conditions,
  is_active,
  is_global,
  priority,
  valid_from,
  valid_until,
  created_by,
  created_at,
  updated_at
)
SELECT
  pr.id,
  pr.org_id,
  pr.name,
  pr.description,
  pr.strategy::text,
  pr.inventory_item_id,
  pr.category_id,
  pr.brand_id,
  pr.supplier_id,
  pr.category_ids,
  pr.brand_ids,
  pr.supplier_ids,
  pr.product_ids,
  pr.base_cost,
  pr.markup_percentage,
  pr.fixed_margin,
  pr.min_price,
  pr.max_price,
  pr.tier::text,
  pr.conditions,
  pr.is_active,
  pr.is_global,
  pr.priority,
  pr.valid_from,
  pr.valid_until,
  pr.created_by,
  pr.created_at,
  pr.updated_at
FROM public.pricing_rule pr
ON CONFLICT (rule_id) DO NOTHING;

-- =====================================================
-- CORE COMPETITOR PRICING (canonical)
-- =====================================================
CREATE TABLE IF NOT EXISTS core.competitor_pricing (
  competitor_price_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  product_id uuid,
  inventory_item_id uuid,
  competitor_name text NOT NULL,
  competitor_sku text,
  price numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ZAR',
  source_url text,
  source_type text DEFAULT 'manual',
  availability text DEFAULT 'unknown',
  last_checked timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Backfill from legacy public.competitor_pricing if present
INSERT INTO core.competitor_pricing (
  competitor_price_id,
  org_id,
  inventory_item_id,
  competitor_name,
  competitor_sku,
  price,
  currency,
  source_url,
  source_type,
  availability,
  last_checked,
  is_active,
  metadata,
  created_at,
  updated_at
)
SELECT
  cp.id,
  cp.org_id,
  cp.inventory_item_id,
  cp.competitor_name,
  cp.competitor_sku,
  cp.competitor_price,
  cp.currency,
  cp.source_url,
  cp.source_type,
  CASE
    WHEN cp.in_stock = false THEN 'out_of_stock'
    ELSE COALESCE(cp.stock_level, 'unknown')
  END,
  COALESCE(cp.scraped_at, cp.created_at, now()),
  cp.is_active,
  cp.metadata,
  cp.created_at,
  cp.updated_at
FROM public.competitor_pricing cp
ON CONFLICT (competitor_price_id) DO NOTHING;

-- =====================================================
-- CORE PRICE ELASTICITY (canonical)
-- =====================================================
CREATE TABLE IF NOT EXISTS core.price_elasticity (
  elasticity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  product_id uuid,
  inventory_item_id uuid,
  elasticity_coefficient numeric(8,4),
  confidence_interval_lower numeric(8,4),
  confidence_interval_upper numeric(8,4),
  analysis_start_date date,
  analysis_end_date date,
  data_points_count integer,
  optimal_price numeric(12,2),
  optimal_price_confidence numeric(5,2),
  currency text DEFAULT 'ZAR',
  price_range_min numeric(12,2),
  price_range_max numeric(12,2),
  demand_range_min numeric(12,2),
  demand_range_max numeric(12,2),
  model_version text DEFAULT '1.0',
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Backfill from legacy public.price_elasticity if present
INSERT INTO core.price_elasticity (
  elasticity_id,
  org_id,
  inventory_item_id,
  elasticity_coefficient,
  analysis_start_date,
  analysis_end_date,
  data_points_count,
  optimal_price,
  currency,
  price_range_min,
  price_range_max,
  demand_range_min,
  demand_range_max,
  model_version,
  is_current,
  created_at
)
SELECT
  pe.id,
  pe.org_id,
  pe.inventory_item_id,
  pe.elasticity_coefficient,
  pe.date_range_start,
  pe.date_range_end,
  pe.sample_size,
  NULL,
  COALESCE(pe.currency, 'ZAR'),
  MIN(pe.price_point) OVER (PARTITION BY pe.inventory_item_id),
  MAX(pe.price_point) OVER (PARTITION BY pe.inventory_item_id),
  MIN(pe.quantity_sold) OVER (PARTITION BY pe.inventory_item_id),
  MAX(pe.quantity_sold) OVER (PARTITION BY pe.inventory_item_id),
  'legacy',
  true,
  pe.created_at
FROM public.price_elasticity pe
ON CONFLICT (elasticity_id) DO NOTHING;

-- =====================================================
-- CORE PRICING AUTOMATION CONFIG (canonical)
-- =====================================================
CREATE TABLE IF NOT EXISTS core.pricing_automation_config (
  org_id uuid PRIMARY KEY,
  enable_auto_activation boolean NOT NULL DEFAULT false,
  auto_activation_confidence_threshold numeric(5,2) NOT NULL DEFAULT 85.0,
  enable_ai_recommendations boolean NOT NULL DEFAULT true,
  default_margin_percent numeric(5,2) NOT NULL DEFAULT 30.0,
  min_margin_percent numeric(5,2) NOT NULL DEFAULT 5.0,
  max_price_increase_percent numeric(5,2) NOT NULL DEFAULT 50.0,
  require_review_for_high_impact boolean NOT NULL DEFAULT true,
  high_impact_threshold_percent numeric(5,2) NOT NULL DEFAULT 20.0,
  enable_batch_processing boolean NOT NULL DEFAULT true,
  batch_size integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO core.pricing_automation_config (
  org_id,
  enable_auto_activation,
  auto_activation_confidence_threshold,
  enable_ai_recommendations,
  default_margin_percent,
  min_margin_percent,
  max_price_increase_percent,
  require_review_for_high_impact,
  high_impact_threshold_percent,
  enable_batch_processing,
  batch_size,
  created_at,
  updated_at
)
SELECT
  pac.org_id,
  pac.enable_auto_activation,
  pac.auto_activation_confidence_threshold,
  pac.enable_ai_recommendations,
  pac.default_margin_percent,
  pac.min_margin_percent,
  pac.max_price_increase_percent,
  pac.require_review_for_high_impact,
  pac.high_impact_threshold_percent,
  pac.enable_batch_processing,
  pac.batch_size,
  pac.created_at,
  pac.updated_at
FROM public.pricing_automation_config pac
ON CONFLICT (org_id) DO NOTHING;

-- =====================================================
-- OPTIMIZATION TABLE TENANCY + CURRENCY
-- =====================================================
ALTER TABLE core.optimization_runs
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'ZAR';

ALTER TABLE core.optimization_recommendations
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'ZAR';

ALTER TABLE core.price_change_log
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'ZAR';

UPDATE core.optimization_recommendations r
SET org_id = o.org_id
FROM core.optimization_runs o
WHERE r.run_id = o.run_id
  AND r.org_id IS NULL
  AND o.org_id IS NOT NULL;

UPDATE core.price_change_log pcl
SET org_id = r.org_id
FROM core.optimization_recommendations r
WHERE pcl.recommendation_id = r.recommendation_id
  AND pcl.org_id IS NULL
  AND r.org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_pricing_rule_org
  ON core.pricing_rule(org_id, is_active, priority DESC);

CREATE INDEX IF NOT EXISTS idx_core_competitor_pricing_org
  ON core.competitor_pricing(org_id, competitor_name);

CREATE INDEX IF NOT EXISTS idx_core_price_elasticity_org
  ON core.price_elasticity(org_id, product_id, is_current) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_optimization_runs_org
  ON core.optimization_runs(org_id, created_at DESC) WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_org
  ON core.optimization_recommendations(org_id, status, created_at DESC) WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_price_change_log_org
  ON core.price_change_log(org_id, changed_at DESC) WHERE org_id IS NOT NULL;

COMMIT;

INSERT INTO schema_migrations (migration_name)
VALUES ('0259_pricing_core_alignment')
ON CONFLICT (migration_name) DO NOTHING;
