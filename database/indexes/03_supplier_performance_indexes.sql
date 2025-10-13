-- Supplier performance indexes
-- Use CONCURRENTLY to avoid heavy locks in production

-- 1) Full-text search on name and code
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_search_tsv
ON core.supplier USING GIN (
  to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(code,''))
);

-- 2) Composite index for filtered listings by activity and name ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_active_name
ON core.supplier (active, name);

-- 3) GIN index on contact_info JSONB for email/phone lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_contact_info_gin
ON core.supplier USING GIN (contact_info);

-- 4) Composite index on active and created_at for recent active suppliers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_active_created_at
ON core.supplier (active, created_at DESC);

