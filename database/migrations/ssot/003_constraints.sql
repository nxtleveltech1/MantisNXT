-- SSOT: Constraints to enforce integrity
-- Use unique indexes for idempotent constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_core_supplier_code_ci ON core.supplier ((LOWER(code)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_core_supplier_product_unique ON core.supplier_product (supplier_id, supplier_sku);
