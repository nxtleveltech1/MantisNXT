-- 0026_import_and_rollback.sql
-- Support for batch imports and rollback capabilities

CREATE TABLE IF NOT EXISTS spp.import_batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES spp.extraction_jobs(job_id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'rolled_back')),
  products_created INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_failed INTEGER DEFAULT 0,
  rollback_data JSONB,
  error_log JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_job ON spp.import_batches(job_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_org ON spp.import_batches(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON spp.import_batches(status) WHERE status = 'processing';

CREATE TABLE IF NOT EXISTS spp.extracted_products (
  extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES spp.extraction_jobs(job_id) ON DELETE CASCADE,
  batch_id UUID REFERENCES spp.import_batches(batch_id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  supplier_sku TEXT,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  unit TEXT,
  pack_size TEXT,
  quantity DECIMAL(12, 3),
  unit_cost DECIMAL(12, 2),
  sale_price DECIMAL(12, 2),
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'imported', 'failed', 'skipped')),
  validation_errors JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extracted_products_job ON spp.extracted_products(job_id);
CREATE INDEX IF NOT EXISTS idx_extracted_products_batch ON spp.extracted_products(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_extracted_products_sku ON spp.extracted_products(sku, job_id);
CREATE INDEX IF NOT EXISTS idx_extracted_products_status ON spp.extracted_products(status) WHERE status = 'pending';