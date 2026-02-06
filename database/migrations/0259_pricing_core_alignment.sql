-- =====================================================
-- 0259_pricing_core_alignment.sql
-- Create ALL canonical pricing, optimization, analytics,
-- and competitive-intelligence tables in the core schema.
-- Backfills from legacy public.* tables when they exist.
-- All DDL is idempotent (IF NOT EXISTS / IF EXISTS).
-- =====================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS core;

-- Migration tracking
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  migration_name text PRIMARY KEY,
  applied_at     timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 1. CORE PRICING RULES
-- =====================================================
CREATE TABLE IF NOT EXISTS core.pricing_rule (
  rule_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL,
  name               text NOT NULL,
  description        text,
  rule_type          text NOT NULL DEFAULT 'cost_plus',
  strategy           text NOT NULL DEFAULT 'cost_plus',
  priority           integer NOT NULL DEFAULT 100,
  is_active          boolean NOT NULL DEFAULT true,
  is_global          boolean NOT NULL DEFAULT false,

  -- Single-entity targeting (legacy compat)
  inventory_item_id  uuid,
  category_id        uuid,
  brand_id           uuid,
  supplier_id        uuid,

  -- Multi-scope targeting arrays
  category_ids       uuid[],
  brand_ids          uuid[],
  supplier_ids       uuid[],
  product_ids        uuid[],

  -- Rule config
  base_cost          numeric(12,2),
  markup_percentage  numeric(6,2),
  fixed_margin       numeric(12,2),
  min_price          numeric(12,2),
  max_price          numeric(12,2),
  tier               text,
  config             jsonb NOT NULL DEFAULT '{}'::jsonb,
  conditions         jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency           text NOT NULL DEFAULT 'ZAR',

  -- Validity window
  valid_from         timestamptz DEFAULT now(),
  valid_until        timestamptz,

  -- Audit
  created_by         uuid,
  last_modified_by   uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 2-4. OPTIMIZATION RUNS, RECOMMENDATIONS, PRICE CHANGE LOG
-- These tables may already exist from migration 0018.
-- We CREATE IF NOT EXISTS, then ALTER to add missing columns.
-- =====================================================
CREATE TABLE IF NOT EXISTS core.optimization_runs (
  run_id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid,
  run_name                    text NOT NULL,
  strategy                    text NOT NULL DEFAULT 'maximize_profit',
  status                      text NOT NULL DEFAULT 'pending',
  config                      jsonb NOT NULL DEFAULT '{}'::jsonb,
  scope                       jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_products_analyzed      integer NOT NULL DEFAULT 0,
  recommendations_generated   integer NOT NULL DEFAULT 0,
  estimated_revenue_impact    numeric(14,2),
  estimated_profit_impact     numeric(14,2),
  currency                    text NOT NULL DEFAULT 'ZAR',
  started_at                  timestamptz,
  completed_at                timestamptz,
  error_message               text,
  created_by                  uuid,
  created_at                  timestamptz NOT NULL DEFAULT now()
);
-- Add columns if table pre-existed from migration 0018
ALTER TABLE core.optimization_runs ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE core.optimization_runs ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZAR';

CREATE TABLE IF NOT EXISTS core.optimization_recommendations (
  recommendation_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        uuid,
  run_id                        uuid NOT NULL REFERENCES core.optimization_runs(run_id) ON DELETE CASCADE,
  product_id                    uuid NOT NULL,
  supplier_product_id           uuid,
  current_price                 numeric(12,2) NOT NULL,
  current_cost                  numeric(12,2),
  current_margin_percent        numeric(6,2),
  recommended_price             numeric(12,2) NOT NULL,
  recommended_margin_percent    numeric(6,2),
  price_change_percent          numeric(8,4) NOT NULL DEFAULT 0,
  price_change_amount           numeric(12,2) NOT NULL DEFAULT 0,
  confidence_score              numeric(5,2) NOT NULL DEFAULT 0,
  reasoning                     text,
  algorithm_used                text,
  projected_demand_change_percent numeric(8,4),
  projected_revenue_impact      numeric(14,2),
  projected_profit_impact       numeric(14,2),
  competitor_prices             jsonb,
  elasticity_estimate           numeric(8,4),
  historical_performance        jsonb,
  status                        text NOT NULL DEFAULT 'pending',
  currency                      text NOT NULL DEFAULT 'ZAR',
  applied_at                    timestamptz,
  applied_by                    uuid,
  rejection_reason              text,
  expires_at                    timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.optimization_recommendations ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE core.optimization_recommendations ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZAR';

CREATE TABLE IF NOT EXISTS core.price_change_log (
  log_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid,
  product_id          uuid NOT NULL,
  supplier_product_id uuid,
  old_price           numeric(12,2) NOT NULL,
  new_price           numeric(12,2) NOT NULL,
  price_change_percent numeric(8,4) NOT NULL DEFAULT 0,
  price_change_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'ZAR',
  change_reason       text NOT NULL DEFAULT 'manual',
  rule_id             uuid,
  recommendation_id   uuid,
  changed_by          uuid,
  changed_at          timestamptz NOT NULL DEFAULT now(),
  notes               text
);
ALTER TABLE core.price_change_log ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE core.price_change_log ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZAR';

-- =====================================================
-- 5. COMPETITOR PRICING
-- =====================================================
CREATE TABLE IF NOT EXISTS core.competitor_pricing (
  competitor_price_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  product_id          uuid,
  inventory_item_id   uuid,
  competitor_name     text NOT NULL,
  competitor_sku      text,
  price               numeric(12,2) NOT NULL,
  currency            text NOT NULL DEFAULT 'ZAR',
  source_url          text,
  source_type         text DEFAULT 'manual',
  availability        text DEFAULT 'unknown',
  last_checked        timestamptz DEFAULT now(),
  is_active           boolean NOT NULL DEFAULT true,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- =====================================================
-- 6. PRICE ELASTICITY
-- May pre-exist from migration 0018 without org_id/currency.
-- =====================================================
CREATE TABLE IF NOT EXISTS core.price_elasticity (
  elasticity_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                     uuid,
  product_id                 uuid,
  inventory_item_id          uuid,
  elasticity_coefficient     numeric(8,4),
  confidence_interval_lower  numeric(8,4),
  confidence_interval_upper  numeric(8,4),
  analysis_start_date        date,
  analysis_end_date          date,
  data_points_count          integer,
  optimal_price              numeric(12,2),
  optimal_price_confidence   numeric(5,2),
  currency                   text NOT NULL DEFAULT 'ZAR',
  price_range_min            numeric(12,2),
  price_range_max            numeric(12,2),
  demand_range_min           numeric(12,2),
  demand_range_max           numeric(12,2),
  model_version              text NOT NULL DEFAULT '1.0',
  is_current                 boolean NOT NULL DEFAULT true,
  created_at                 timestamptz NOT NULL DEFAULT now()
);
-- Add columns if table pre-existed from migration 0018
ALTER TABLE core.price_elasticity ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE core.price_elasticity ADD COLUMN IF NOT EXISTS inventory_item_id uuid;
ALTER TABLE core.price_elasticity ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZAR';
ALTER TABLE core.price_elasticity ADD COLUMN IF NOT EXISTS price_range_min numeric(12,2);
ALTER TABLE core.price_elasticity ADD COLUMN IF NOT EXISTS price_range_max numeric(12,2);
ALTER TABLE core.price_elasticity ADD COLUMN IF NOT EXISTS demand_range_min numeric(12,2);
ALTER TABLE core.price_elasticity ADD COLUMN IF NOT EXISTS demand_range_max numeric(12,2);

-- =====================================================
-- 7. PRICING AUTOMATION CONFIG
-- =====================================================
CREATE TABLE IF NOT EXISTS core.pricing_automation_config (
  org_id                                uuid PRIMARY KEY,
  enable_auto_activation                boolean NOT NULL DEFAULT false,
  auto_activation_confidence_threshold  numeric(5,2) NOT NULL DEFAULT 85.0,
  enable_ai_recommendations             boolean NOT NULL DEFAULT true,
  default_margin_percent                numeric(5,2) NOT NULL DEFAULT 30.0,
  min_margin_percent                    numeric(5,2) NOT NULL DEFAULT 5.0,
  max_price_increase_percent            numeric(5,2) NOT NULL DEFAULT 50.0,
  require_review_for_high_impact        boolean NOT NULL DEFAULT true,
  high_impact_threshold_percent         numeric(5,2) NOT NULL DEFAULT 20.0,
  enable_batch_processing               boolean NOT NULL DEFAULT true,
  batch_size                            integer NOT NULL DEFAULT 100,
  created_at                            timestamptz NOT NULL DEFAULT now(),
  updated_at                            timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 8. COMPETITIVE INTELLIGENCE: COMPETITOR PROFILES
-- =====================================================
CREATE TABLE IF NOT EXISTS core.competitor_profile (
  competitor_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL,
  company_name          text NOT NULL,
  website_url           text,
  marketplace_listings  jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_profiles       jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_data_sources   jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_currency      text NOT NULL DEFAULT 'ZAR',
  proxy_policy          jsonb NOT NULL DEFAULT '{}'::jsonb,
  captcha_policy        jsonb NOT NULL DEFAULT '{}'::jsonb,
  robots_txt_behavior   text NOT NULL DEFAULT 'respect',
  notes                 text,
  created_by            uuid,
  updated_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

-- =====================================================
-- 9. COMPETITOR DATA SOURCES
-- =====================================================
CREATE TABLE IF NOT EXISTS core.competitor_data_source (
  data_source_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id    uuid NOT NULL REFERENCES core.competitor_profile(competitor_id) ON DELETE CASCADE,
  org_id           uuid NOT NULL,
  source_type      text NOT NULL DEFAULT 'website',
  label            text,
  endpoint_url     text NOT NULL,
  auth_config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  rate_limit_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  robots_txt_cache jsonb,
  last_success_at  timestamptz,
  last_status      text,
  health_status    text NOT NULL DEFAULT 'unknown',
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 10. COMPETITOR PRODUCT MATCHES
-- =====================================================
CREATE TABLE IF NOT EXISTS core.competitor_product_match (
  match_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL,
  competitor_id         uuid NOT NULL REFERENCES core.competitor_profile(competitor_id) ON DELETE CASCADE,
  competitor_product_id text NOT NULL,
  competitor_sku        text,
  competitor_title      text,
  competitor_url        text,
  internal_product_id   uuid,
  internal_sku          text,
  upc                   text,
  ean                   text,
  asin                  text,
  mpn                   text,
  match_confidence      numeric(5,2) NOT NULL DEFAULT 0,
  match_method          text NOT NULL DEFAULT 'manual',
  status                text NOT NULL DEFAULT 'pending',
  reviewer_id           uuid,
  reviewed_at           timestamptz,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 11. MARKET INTEL SCRAPE JOBS
-- =====================================================
CREATE TABLE IF NOT EXISTS core.market_intel_scrape_job (
  job_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  competitor_id     uuid REFERENCES core.competitor_profile(competitor_id) ON DELETE SET NULL,
  job_name          text NOT NULL,
  schedule_type     text NOT NULL DEFAULT 'manual',
  schedule_config   jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'active',
  priority          integer NOT NULL DEFAULT 5,
  max_concurrency   integer NOT NULL DEFAULT 1,
  rate_limit_per_min integer NOT NULL DEFAULT 30,
  last_run_at       timestamptz,
  next_run_at       timestamptz,
  last_status       text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by        uuid,
  updated_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 12. MARKET INTEL SCRAPE RUNS
-- =====================================================
CREATE TABLE IF NOT EXISTS core.market_intel_scrape_run (
  run_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              uuid NOT NULL REFERENCES core.market_intel_scrape_job(job_id) ON DELETE CASCADE,
  org_id              uuid NOT NULL,
  competitor_id       uuid,
  triggered_by        text NOT NULL DEFAULT 'system',
  status              text NOT NULL DEFAULT 'queued',
  started_at          timestamptz,
  completed_at        timestamptz,
  total_sources       integer NOT NULL DEFAULT 0,
  success_sources     integer NOT NULL DEFAULT 0,
  failed_sources      integer NOT NULL DEFAULT 0,
  total_products      integer NOT NULL DEFAULT 0,
  processed_products  integer NOT NULL DEFAULT 0,
  error_details       jsonb,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 13. MARKET INTEL SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS core.market_intel_snapshot (
  snapshot_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid NOT NULL,
  competitor_id          uuid NOT NULL,
  match_id               uuid,
  run_id                 uuid,
  observed_at            timestamptz NOT NULL DEFAULT now(),
  identifiers            jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing                jsonb NOT NULL DEFAULT '{}'::jsonb,
  availability           jsonb NOT NULL DEFAULT '{}'::jsonb,
  product_details        jsonb NOT NULL DEFAULT '{}'::jsonb,
  promotions             jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping               jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviews                jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_position         jsonb NOT NULL DEFAULT '{}'::jsonb,
  market_share_estimate  numeric(5,2),
  elasticity_signals     jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payload            jsonb,
  hash                   text NOT NULL DEFAULT '',
  is_anomaly             boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 14. MARKET INTEL ALERTS
-- =====================================================
CREATE TABLE IF NOT EXISTS core.market_intel_alert (
  alert_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL,
  competitor_id      uuid,
  match_id           uuid,
  alert_type         text NOT NULL,
  severity           text NOT NULL DEFAULT 'medium',
  threshold_config   jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at        timestamptz NOT NULL DEFAULT now(),
  acknowledged_at    timestamptz,
  acknowledged_by    uuid,
  status             text NOT NULL DEFAULT 'open',
  details            jsonb NOT NULL DEFAULT '{}'::jsonb,
  remediation_status text NOT NULL DEFAULT 'none',
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 15. MARKET INTEL WEBHOOK SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS core.market_intel_webhook_subscription (
  webhook_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL,
  event_type    text NOT NULL,
  target_url    text NOT NULL,
  secret        text,
  enabled       boolean NOT NULL DEFAULT true,
  retry_policy  jsonb NOT NULL DEFAULT '{"max_retries": 3, "backoff_ms": 1000}'::jsonb,
  last_failure_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 16. MARKET INTEL DATA POLICY
-- =====================================================
CREATE TABLE IF NOT EXISTS core.market_intel_data_policy (
  org_id                   uuid PRIMARY KEY,
  retention_days_snapshots integer NOT NULL DEFAULT 365,
  retention_days_alerts    integer NOT NULL DEFAULT 90,
  retention_days_jobs      integer NOT NULL DEFAULT 180,
  archival_strategy        text NOT NULL DEFAULT 'delete',
  last_archive_run_at      timestamptz,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES for org-scoped queries
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_core_pricing_rule_org
  ON core.pricing_rule(org_id, is_active, priority DESC);

CREATE INDEX IF NOT EXISTS idx_core_pricing_rule_global
  ON core.pricing_rule(is_global, is_active) WHERE is_global = true;

CREATE INDEX IF NOT EXISTS idx_core_optimization_runs_org
  ON core.optimization_runs(org_id, created_at DESC) WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_optimization_recs_org
  ON core.optimization_recommendations(org_id, status, created_at DESC) WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_optimization_recs_run
  ON core.optimization_recommendations(run_id, status);

CREATE INDEX IF NOT EXISTS idx_core_price_change_log_org
  ON core.price_change_log(org_id, changed_at DESC) WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_price_change_log_product
  ON core.price_change_log(product_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_core_competitor_pricing_org
  ON core.competitor_pricing(org_id, competitor_name);

CREATE INDEX IF NOT EXISTS idx_core_competitor_pricing_product
  ON core.competitor_pricing(product_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_core_price_elasticity_org
  ON core.price_elasticity(org_id, product_id, is_current) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_core_competitor_profile_org
  ON core.competitor_profile(org_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_core_competitor_match_org
  ON core.competitor_product_match(org_id, competitor_id, status);

CREATE INDEX IF NOT EXISTS idx_core_market_intel_snapshot_org
  ON core.market_intel_snapshot(org_id, competitor_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_core_market_intel_alert_org
  ON core.market_intel_alert(org_id, status, severity);

-- =====================================================
-- CONDITIONAL BACKFILLS from legacy public.* tables
-- (Only runs if the source table exists)
-- =====================================================

-- Backfill pricing rules
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pricing_rule'
  ) THEN
    INSERT INTO core.pricing_rule (
      rule_id, org_id, name, description, strategy,
      inventory_item_id, category_id, brand_id, supplier_id,
      conditions, is_active, priority, valid_from, valid_until,
      created_by, created_at, updated_at
    )
    SELECT
      pr.id, pr.org_id, pr.name, pr.description, pr.strategy::text,
      pr.inventory_item_id, pr.category_id, pr.brand_id, pr.supplier_id,
      pr.conditions, pr.is_active, pr.priority, pr.valid_from, pr.valid_until,
      pr.created_by, pr.created_at, pr.updated_at
    FROM public.pricing_rule pr
    WHERE pr.org_id IS NOT NULL
    ON CONFLICT (rule_id) DO NOTHING;
  END IF;
END $$;

-- Backfill competitor pricing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'competitor_pricing'
  ) THEN
    INSERT INTO core.competitor_pricing (
      competitor_price_id, org_id, inventory_item_id,
      competitor_name, competitor_sku, price, currency,
      source_url, source_type, availability,
      last_checked, is_active, metadata, created_at, updated_at
    )
    SELECT
      cp.id, cp.org_id, cp.inventory_item_id,
      cp.competitor_name, cp.competitor_sku, cp.competitor_price,
      COALESCE(cp.currency, 'ZAR'),
      cp.source_url, cp.source_type,
      CASE WHEN cp.in_stock = false THEN 'out_of_stock' ELSE COALESCE(cp.stock_level, 'unknown') END,
      COALESCE(cp.scraped_at, cp.created_at, now()),
      cp.is_active, cp.metadata, cp.created_at, cp.updated_at
    FROM public.competitor_pricing cp
    WHERE cp.org_id IS NOT NULL
    ON CONFLICT (competitor_price_id) DO NOTHING;
  END IF;
END $$;

-- Backfill price elasticity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'price_elasticity'
  ) THEN
    INSERT INTO core.price_elasticity (
      elasticity_id, org_id, inventory_item_id,
      elasticity_coefficient, analysis_start_date, analysis_end_date,
      data_points_count, currency, model_version, is_current, created_at
    )
    SELECT
      pe.id, pe.org_id, pe.inventory_item_id,
      pe.elasticity_coefficient, pe.date_range_start, pe.date_range_end,
      pe.sample_size, COALESCE(pe.currency, 'ZAR'),
      'legacy', true, pe.created_at
    FROM public.price_elasticity pe
    WHERE pe.org_id IS NOT NULL
    ON CONFLICT (elasticity_id) DO NOTHING;
  END IF;
END $$;

-- Backfill automation config
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pricing_automation_config'
  ) THEN
    INSERT INTO core.pricing_automation_config (
      org_id, enable_auto_activation, auto_activation_confidence_threshold,
      enable_ai_recommendations, default_margin_percent, min_margin_percent,
      max_price_increase_percent, require_review_for_high_impact,
      high_impact_threshold_percent, enable_batch_processing, batch_size,
      created_at, updated_at
    )
    SELECT
      pac.org_id, pac.enable_auto_activation, pac.auto_activation_confidence_threshold,
      pac.enable_ai_recommendations, pac.default_margin_percent, pac.min_margin_percent,
      pac.max_price_increase_percent, pac.require_review_for_high_impact,
      pac.high_impact_threshold_percent, pac.enable_batch_processing, pac.batch_size,
      pac.created_at, pac.updated_at
    FROM public.pricing_automation_config pac
    ON CONFLICT (org_id) DO NOTHING;
  END IF;
END $$;

COMMIT;

-- Record migration (outside transaction for visibility even on partial failure)
INSERT INTO public.schema_migrations (migration_name)
VALUES ('0259_pricing_core_alignment')
ON CONFLICT (migration_name) DO NOTHING;
