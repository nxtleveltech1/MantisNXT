-- 0032_proposed_categories.sql
-- Introduce proposal workflow for AI-suggested categories
-- Tracks proposed category labels and links them to supplier products until approval/rejection.

BEGIN;

CREATE TYPE core.ai_proposed_category_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE core.ai_proposed_category_product_status AS ENUM ('pending', 'applied', 'rejected');

CREATE TABLE core.ai_proposed_category (
    proposed_category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    normalized_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    suggested_parent_id UUID NULL REFERENCES core.category(category_id),
    status core.ai_proposed_category_status NOT NULL DEFAULT 'pending',
    status_reason TEXT NULL,
    suggestion_count INTEGER NOT NULL DEFAULT 1,
    last_confidence NUMERIC(5,4) NULL,
    last_provider TEXT NULL,
    first_seen_job_id UUID NULL REFERENCES core.ai_categorization_job(job_id) ON DELETE SET NULL,
    last_seen_job_id UUID NULL REFERENCES core.ai_categorization_job(job_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL,
    UNIQUE (org_id, normalized_name)
);

CREATE TABLE core.ai_proposed_category_product (
    proposed_category_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposed_category_id UUID NOT NULL REFERENCES core.ai_proposed_category(proposed_category_id) ON DELETE CASCADE,
    supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
    job_id UUID NULL REFERENCES core.ai_categorization_job(job_id) ON DELETE SET NULL,
    ai_confidence NUMERIC(5,4) NULL,
    ai_reasoning TEXT NULL,
    ai_provider TEXT NULL,
    status core.ai_proposed_category_product_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL,
    UNIQUE (supplier_product_id, proposed_category_id)
);

CREATE INDEX idx_ai_proposed_category_status ON core.ai_proposed_category (status);
CREATE INDEX idx_ai_proposed_category_product_status ON core.ai_proposed_category_product (status);
CREATE INDEX idx_ai_proposed_category_product_proposed ON core.ai_proposed_category_product (proposed_category_id);

CREATE OR REPLACE FUNCTION core.touch_ai_proposed_category_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_ai_proposed_category_updated_at
    BEFORE UPDATE ON core.ai_proposed_category
    FOR EACH ROW
    EXECUTE FUNCTION core.touch_ai_proposed_category_updated_at();

CREATE OR REPLACE FUNCTION core.touch_ai_proposed_category_product_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_ai_proposed_category_product_updated_at
    BEFORE UPDATE ON core.ai_proposed_category_product
    FOR EACH ROW
    EXECUTE FUNCTION core.touch_ai_proposed_category_product_updated_at();

-- Expand supplier product status constraint to include pending_review
ALTER TABLE core.supplier_product
DROP CONSTRAINT IF EXISTS valid_ai_categorization_status;

ALTER TABLE core.supplier_product
ADD CONSTRAINT valid_ai_categorization_status
CHECK (ai_categorization_status IN ('pending', 'processing', 'completed', 'failed', 'skipped', 'pending_review'));

COMMIT;

