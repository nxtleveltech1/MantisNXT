-- 0218_competitive_market_intel.sql
-- Competitive Market Intelligence schema + helpers

BEGIN;

-- Competitor profiles
CREATE TABLE IF NOT EXISTS core.competitor_profile (
  competitor_id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid            NOT NULL,
  company_name             text            NOT NULL,
  website_url              text,
  marketplace_listings     jsonb           DEFAULT '[]'::jsonb, -- [{channel:'amazon', url:'...'}]
  social_profiles          jsonb           DEFAULT '[]'::jsonb, -- [{network:'linkedin', url:'...'}]
  custom_data_sources      jsonb           DEFAULT '[]'::jsonb, -- arbitrary endpoints
  default_currency         text            DEFAULT 'USD',
  proxy_policy             jsonb           DEFAULT '{}'::jsonb, -- rotates, geo targets, vendor
  captcha_policy           jsonb           DEFAULT '{}'::jsonb, -- provider, solve strategy
  robots_txt_behavior      text            DEFAULT 'respect',
  notes                    text,
  created_by               uuid,
  updated_by               uuid,
  created_at               timestamptz     NOT NULL DEFAULT now(),
  updated_at               timestamptz     NOT NULL DEFAULT now(),
  deleted_at               timestamptz,
  CONSTRAINT uq_competitor_org_name UNIQUE (org_id, company_name)
);

CREATE INDEX IF NOT EXISTS idx_competitor_profile_org ON core.competitor_profile (org_id) WHERE deleted_at IS NULL;

-- Competitor data sources (websites, APIs, feeds)
CREATE TABLE IF NOT EXISTS core.competitor_data_source (
  data_source_id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id            uuid        NOT NULL REFERENCES core.competitor_profile(competitor_id) ON DELETE CASCADE,
  org_id                   uuid        NOT NULL,
  source_type              text        NOT NULL, -- website|api|marketplace|custom
  label                    text,
  endpoint_url             text        NOT NULL,
  auth_config              jsonb       DEFAULT '{}'::jsonb,
  rate_limit_config        jsonb       DEFAULT '{}'::jsonb,
  robots_txt_cache         jsonb,
  last_success_at          timestamptz,
  last_status              text,
  health_status            text        DEFAULT 'unknown',
  metadata                 jsonb       DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_data_source_comp ON core.competitor_data_source (competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_data_source_org ON core.competitor_data_source (org_id);

-- Product matching engine
CREATE TABLE IF NOT EXISTS core.competitor_product_match (
  match_id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid        NOT NULL,
  competitor_id            uuid        NOT NULL REFERENCES core.competitor_profile(competitor_id) ON DELETE CASCADE,
  competitor_product_id    text        NOT NULL,
  competitor_sku           text,
  competitor_title         text,
  competitor_url           text,
  internal_product_id      uuid,
  internal_sku             text,
  upc                      text,
  ean                      text,
  asin                     text,
  mpn                      text,
  match_confidence         numeric(5,2) DEFAULT 0,
  match_method             text        DEFAULT 'manual', -- manual|upc|fuzzy|ai
  status                   text        DEFAULT 'pending', -- pending|matched|rejected
  reviewer_id              uuid,
  reviewed_at              timestamptz,
  metadata                 jsonb       DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_competitor_product UNIQUE (org_id, competitor_id, competitor_product_id)
);

CREATE INDEX IF NOT EXISTS idx_competitor_product_match_org ON core.competitor_product_match (org_id);
CREATE INDEX IF NOT EXISTS idx_competitor_product_match_internal ON core.competitor_product_match (internal_product_id);

-- Scraping jobs (scheduled or on-demand)
CREATE TABLE IF NOT EXISTS core.market_intel_scrape_job (
  job_id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid        NOT NULL,
  competitor_id            uuid        REFERENCES core.competitor_profile(competitor_id) ON DELETE CASCADE,
  job_name                 text        NOT NULL,
  schedule_type            text        NOT NULL DEFAULT 'manual', -- manual|cron|interval
  schedule_config          jsonb       DEFAULT '{}'::jsonb,
  status                   text        NOT NULL DEFAULT 'active', -- active|paused|archived
  priority                 integer     DEFAULT 3,
  max_concurrency          integer     DEFAULT 5,
  rate_limit_per_min       integer     DEFAULT 60,
  last_run_at              timestamptz,
  next_run_at              timestamptz,
  last_status              text,
  metadata                 jsonb       DEFAULT '{}'::jsonb,
  created_by               uuid,
  updated_by               uuid,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_intel_scrape_job_org ON core.market_intel_scrape_job (org_id);
CREATE INDEX IF NOT EXISTS idx_market_intel_scrape_job_next_run ON core.market_intel_scrape_job (next_run_at) WHERE status = 'active';

-- Scrape runs (execution history)
CREATE TABLE IF NOT EXISTS core.market_intel_scrape_run (
  run_id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                   uuid        NOT NULL REFERENCES core.market_intel_scrape_job(job_id) ON DELETE CASCADE,
  org_id                   uuid        NOT NULL,
  competitor_id            uuid        REFERENCES core.competitor_profile(competitor_id) ON DELETE SET NULL,
  triggered_by             text        NOT NULL, -- system|user|api
  status                   text        NOT NULL DEFAULT 'queued',
  started_at               timestamptz,
  completed_at             timestamptz,
  total_sources            integer     DEFAULT 0,
  success_sources          integer     DEFAULT 0,
  failed_sources           integer     DEFAULT 0,
  total_products           integer     DEFAULT 0,
  processed_products       integer     DEFAULT 0,
  error_details            jsonb,
  metadata                 jsonb       DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_intel_scrape_run_job ON core.market_intel_scrape_run (job_id);
CREATE INDEX IF NOT EXISTS idx_market_intel_scrape_run_org ON core.market_intel_scrape_run (org_id);

-- Market intelligence snapshots (normalized data)
CREATE TABLE IF NOT EXISTS core.market_intel_snapshot (
  snapshot_id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid        NOT NULL,
  competitor_id            uuid        REFERENCES core.competitor_profile(competitor_id) ON DELETE CASCADE,
  match_id                 uuid        REFERENCES core.competitor_product_match(match_id) ON DELETE SET NULL,
  run_id                   uuid        REFERENCES core.market_intel_scrape_run(run_id) ON DELETE SET NULL,
  observed_at              timestamptz NOT NULL DEFAULT now(),
  identifiers              jsonb       NOT NULL, -- {sku, upc, ean, asin, mpn}
  pricing                  jsonb       NOT NULL, -- {regular, sale, map, currency, bulk:[]}
  availability             jsonb       NOT NULL, -- {status, quantity, restock_eta, fulfillment}
  product_details          jsonb       NOT NULL, -- {title, description, specs, images, brand, category}
  promotions               jsonb       DEFAULT '[]'::jsonb,
  shipping                 jsonb       DEFAULT '{}'::jsonb,
  reviews                  jsonb       DEFAULT '{}'::jsonb,
  price_position           jsonb       DEFAULT '{}'::jsonb, -- {rank, percentile, spread}
  market_share_estimate    numeric(6,2),
  elasticity_signals       jsonb       DEFAULT '{}'::jsonb,
  raw_payload              jsonb,
  hash                     text        NOT NULL,
  is_anomaly               boolean     DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_intel_snapshot_org ON core.market_intel_snapshot (org_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_intel_snapshot_competitor ON core.market_intel_snapshot (competitor_id, observed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_market_intel_snapshot_hash ON core.market_intel_snapshot (org_id, hash);

-- Alerts (price breach, MAP violation, assortment gaps, new products)
CREATE TABLE IF NOT EXISTS core.market_intel_alert (
  alert_id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid        NOT NULL,
  competitor_id            uuid        REFERENCES core.competitor_profile(competitor_id) ON DELETE CASCADE,
  match_id                 uuid        REFERENCES core.competitor_product_match(match_id) ON DELETE SET NULL,
  alert_type               text        NOT NULL,
  severity                 text        DEFAULT 'medium',
  threshold_config         jsonb       DEFAULT '{}'::jsonb,
  detected_at              timestamptz NOT NULL DEFAULT now(),
  acknowledged_at          timestamptz,
  acknowledged_by          uuid,
  status                   text        DEFAULT 'open', -- open|acknowledged|resolved
  details                  jsonb       DEFAULT '{}'::jsonb,
  remediation_status       text        DEFAULT 'pending',
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_intel_alert_org ON core.market_intel_alert (org_id, status);
CREATE INDEX IF NOT EXISTS idx_market_intel_alert_type ON core.market_intel_alert (alert_type);

-- Webhook subscriptions for realtime automation
CREATE TABLE IF NOT EXISTS core.market_intel_webhook_subscription (
  webhook_id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid        NOT NULL,
  event_type               text        NOT NULL, -- snapshot.created, alert.triggered, job.completed, etc.
  target_url               text        NOT NULL,
  secret                   text,
  enabled                  boolean     NOT NULL DEFAULT true,
  retry_policy             jsonb       DEFAULT '{"max_attempts":3,"backoff_seconds":30}'::jsonb,
  last_failure_at          timestamptz,
  failure_count            integer     DEFAULT 0,
  metadata                 jsonb       DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_intel_webhook_org ON core.market_intel_webhook_subscription (org_id, enabled)
  WHERE enabled = true;

-- Data retention tracking table
CREATE TABLE IF NOT EXISTS core.market_intel_data_policy (
  org_id                   uuid        PRIMARY KEY,
  retention_days_snapshots integer     DEFAULT 365,
  retention_days_alerts    integer     DEFAULT 730,
  retention_days_jobs      integer     DEFAULT 180,
  archival_strategy        text        DEFAULT 'soft_delete',
  last_archive_run_at      timestamptz,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMIT;

