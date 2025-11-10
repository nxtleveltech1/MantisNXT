-- Category Assignment Audit Table
-- Tracks all category changes for audit and rollback purposes

CREATE TABLE IF NOT EXISTS core.category_assignment_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL REFERENCES core.supplier_product(supplier_product_id) ON DELETE CASCADE,
  old_category_id UUID REFERENCES core.category(category_id),
  new_category_id UUID NOT NULL REFERENCES core.category(category_id),
  assignment_method VARCHAR(20) NOT NULL CHECK (assignment_method IN ('ai_auto', 'ai_manual_accept', 'manual')),
  ai_confidence DECIMAL(5,4),  -- 0.0000 to 1.0000
  ai_reasoning TEXT,
  assigned_by VARCHAR(255),  -- User ID or email
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT valid_confidence CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_audit_product ON core.category_assignment_audit(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_category_audit_category ON core.category_assignment_audit(new_category_id);
CREATE INDEX IF NOT EXISTS idx_category_audit_method ON core.category_assignment_audit(assignment_method);
CREATE INDEX IF NOT EXISTS idx_category_audit_assigned_at ON core.category_assignment_audit(assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_category_audit_assigned_by ON core.category_assignment_audit(assigned_by);

-- Index on supplier_product.category_id for faster queries
CREATE INDEX IF NOT EXISTS idx_supplier_product_category ON core.supplier_product(category_id) WHERE category_id IS NOT NULL;

-- GIN index on attrs_json for attribute queries (if needed)
CREATE INDEX IF NOT EXISTS idx_supplier_product_attrs_json ON core.supplier_product USING GIN(attrs_json) WHERE attrs_json IS NOT NULL;

COMMENT ON TABLE core.category_assignment_audit IS 'Audit log for all category assignment changes';
COMMENT ON COLUMN core.category_assignment_audit.assignment_method IS 'Method used: ai_auto (AI auto-assigned), ai_manual_accept (AI suggested, user accepted), manual (user manually assigned)';
COMMENT ON COLUMN core.category_assignment_audit.ai_confidence IS 'AI confidence score (0-1) if assignment was AI-driven';
COMMENT ON COLUMN core.category_assignment_audit.ai_reasoning IS 'AI reasoning/explanation for the category suggestion';






