-- 0036_ai_tag_proposals.sql
-- Introduce proposal workflow for AI-suggested tags (mirrors category proposals)

BEGIN;

CREATE TYPE core.ai_tag_proposal_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE core.ai_tag_proposal_product_status AS ENUM ('pending', 'applied', 'rejected');

CREATE TABLE core.ai_tag_proposal (
    tag_proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    normalized_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    tag_type TEXT NOT NULL DEFAULT 'custom',
    status core.ai_tag_proposal_status NOT NULL DEFAULT 'pending',
    status_reason TEXT NULL,
    suggestion_count INTEGER NOT NULL DEFAULT 1,
    last_confidence NUMERIC(5,4) NULL,
    last_provider TEXT NULL,
    first_seen_job_id UUID NULL REFERENCES core.ai_tagging_job(job_id) ON DELETE SET NULL,
    last_seen_job_id UUID NULL REFERENCES core.ai_tagging_job(job_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL,
    UNIQUE (org_id, normalized_name)
);

CREATE TABLE core.ai_tag_proposal_product (
    tag_proposal_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_proposal_id UUID NOT NULL REFERENCES core.ai_tag_proposal(tag_proposal_id) ON DELETE CASCADE,
    supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
    job_id UUID NULL REFERENCES core.ai_tagging_job(job_id) ON DELETE SET NULL,
    ai_confidence NUMERIC(5,4) NULL,
    ai_reasoning TEXT NULL,
    ai_provider TEXT NULL,
    status core.ai_tag_proposal_product_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL,
    UNIQUE (supplier_product_id, tag_proposal_id)
);

CREATE INDEX idx_ai_tag_proposal_status ON core.ai_tag_proposal (status);
CREATE INDEX idx_ai_tag_proposal_product_status ON core.ai_tag_proposal_product (status);
CREATE INDEX idx_ai_tag_proposal_product_proposed ON core.ai_tag_proposal_product (tag_proposal_id);

CREATE OR REPLACE FUNCTION core.touch_ai_tag_proposal_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_ai_tag_proposal_updated_at
    BEFORE UPDATE ON core.ai_tag_proposal
    FOR EACH ROW
    EXECUTE FUNCTION core.touch_ai_tag_proposal_updated_at();

CREATE OR REPLACE FUNCTION core.touch_ai_tag_proposal_product_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_ai_tag_proposal_product_updated_at
    BEFORE UPDATE ON core.ai_tag_proposal_product
    FOR EACH ROW
    EXECUTE FUNCTION core.touch_ai_tag_proposal_product_updated_at();

COMMIT;















