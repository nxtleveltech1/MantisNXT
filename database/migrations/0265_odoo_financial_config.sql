-- =====================================================
-- ODOO FINANCIAL CONFIG — Platform storage for Odoo extraction
-- =====================================================
-- Migration: 0265_odoo_financial_config.sql
-- Description: Tables for Odoo config ingest, COA sync, fiscal positions,
--              and dual-state awareness for Xero entity mappings
-- =====================================================

-- =====================================================
-- 1. ODOO CONFIG IMPORTS (metadata per import)
-- =====================================================
CREATE TABLE IF NOT EXISTS odoo_config_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  source_file TEXT,
  import_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cutover_date DATE,
  records_imported JSONB DEFAULT '{}',
  validation_errors JSONB,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odoo_config_imports_org ON odoo_config_imports(org_id);
CREATE INDEX IF NOT EXISTS idx_odoo_config_imports_import_date ON odoo_config_imports(import_date DESC);

COMMENT ON TABLE odoo_config_imports IS 'Metadata per Odoo extraction import run';

-- =====================================================
-- 2. ODOO ACCOUNT TYPE MAPPING (reference)
-- =====================================================
CREATE TABLE IF NOT EXISTS odoo_account_type_mapping (
  odoo_account_type TEXT PRIMARY KEY,
  xero_type TEXT NOT NULL,
  description TEXT
);

INSERT INTO odoo_account_type_mapping (odoo_account_type, xero_type, description) VALUES
  ('asset_receivable', 'CURRENT', 'Receivables'),
  ('asset_cash', 'BANK', 'Cash/Bank'),
  ('asset_current', 'CURRENT', 'Current assets'),
  ('asset_non_current', 'NONCURRENT', 'Non-current assets'),
  ('asset_prepayments', 'PREPAYMENT', 'Prepayments'),
  ('asset_fixed', 'FIXED', 'Fixed assets'),
  ('liability_payable', 'CURRLIAB', 'Payables'),
  ('liability_credit_card', 'LIABILITY', 'Credit card'),
  ('liability_current', 'CURRLIAB', 'Current liabilities'),
  ('liability_non_current', 'TERMLIAB', 'Non-current liabilities'),
  ('equity', 'EQUITY', 'Equity'),
  ('equity_unaffected', 'EQUITY', 'Unaffected earnings'),
  ('income', 'REVENUE', 'Revenue'),
  ('income_other', 'OTHERINCOME', 'Other income'),
  ('expense', 'EXPENSE', 'Expense'),
  ('expense_depreciation', 'DEPRECIATN', 'Depreciation'),
  ('expense_direct_cost', 'DIRECTCOSTS', 'Direct costs'),
  ('off_balance', 'CURRENT', 'Off-balance (map per use)')
ON CONFLICT (odoo_account_type) DO NOTHING;

COMMENT ON TABLE odoo_account_type_mapping IS 'Odoo account_type to Xero Account Type (from XERO_MAPPING_GUIDE)';

-- =====================================================
-- 3. ODOO ACCOUNTS (staging/canonical COA from Odoo)
-- =====================================================
CREATE TABLE IF NOT EXISTS odoo_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  import_id UUID REFERENCES odoo_config_imports(id) ON DELETE SET NULL,
  odoo_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  xero_type TEXT,
  reconcile BOOLEAN DEFAULT false,
  deprecated BOOLEAN DEFAULT false,
  currency_id TEXT,
  company_id INTEGER,
  group_id INTEGER,
  xero_account_id TEXT,
  xero_account_code TEXT,
  source TEXT NOT NULL DEFAULT 'odoo' CHECK (source IN ('odoo', 'platform')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT odoo_accounts_org_code_unique UNIQUE(org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_odoo_accounts_org ON odoo_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_odoo_accounts_odoo_id ON odoo_accounts(org_id, odoo_id);
CREATE INDEX IF NOT EXISTS idx_odoo_accounts_xero_id ON odoo_accounts(xero_account_id) WHERE xero_account_id IS NOT NULL;

COMMENT ON TABLE odoo_accounts IS 'Chart of accounts from Odoo extraction; xero_account_id set after push to Xero';

-- =====================================================
-- 4. ODOO TAXES
-- =====================================================
CREATE TABLE IF NOT EXISTS odoo_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  import_id UUID REFERENCES odoo_config_imports(id) ON DELETE SET NULL,
  odoo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(10,4) NOT NULL,
  type_tax_use TEXT CHECK (type_tax_use IN ('sale', 'purchase', 'none')),
  amount_type TEXT DEFAULT 'percent',
  xero_tax_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT odoo_taxes_org_odoo_id_unique UNIQUE(org_id, odoo_id)
);

CREATE INDEX IF NOT EXISTS idx_odoo_taxes_org ON odoo_taxes(org_id);

COMMENT ON TABLE odoo_taxes IS 'Tax rates from Odoo; xero_tax_type set after Xero tax setup';

-- =====================================================
-- 5. ODOO PAYMENT TERMS
-- =====================================================
CREATE TABLE IF NOT EXISTS odoo_payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  import_id UUID REFERENCES odoo_config_imports(id) ON DELETE SET NULL,
  odoo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  note TEXT,
  xero_payment_term_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT odoo_payment_terms_org_odoo_id_unique UNIQUE(org_id, odoo_id)
);

CREATE TABLE IF NOT EXISTS odoo_payment_term_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_term_id UUID NOT NULL REFERENCES odoo_payment_terms(id) ON DELETE CASCADE,
  value TEXT,
  value_amount NUMERIC(15,4),
  days INTEGER,
  option TEXT,
  line_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odoo_payment_terms_org ON odoo_payment_terms(org_id);
CREATE INDEX IF NOT EXISTS idx_odoo_payment_term_lines_term ON odoo_payment_term_lines(payment_term_id);

-- =====================================================
-- 6. ODOO FISCAL POSITIONS (platform-only rules)
-- =====================================================
CREATE TABLE IF NOT EXISTS odoo_fiscal_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  import_id UUID REFERENCES odoo_config_imports(id) ON DELETE SET NULL,
  odoo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  country_id INTEGER,
  state_ids INTEGER[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT odoo_fiscal_positions_org_odoo_id_unique UNIQUE(org_id, odoo_id)
);

CREATE TABLE IF NOT EXISTS odoo_fiscal_position_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_position_id UUID NOT NULL REFERENCES odoo_fiscal_positions(id) ON DELETE CASCADE,
  account_src_odoo_id INTEGER NOT NULL,
  account_dest_odoo_id INTEGER NOT NULL,
  account_dest_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS odoo_fiscal_position_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_position_id UUID NOT NULL REFERENCES odoo_fiscal_positions(id) ON DELETE CASCADE,
  tax_src_odoo_id INTEGER NOT NULL,
  tax_dest_odoo_id INTEGER,
  tax_dest_xero_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odoo_fiscal_positions_org ON odoo_fiscal_positions(org_id);
CREATE INDEX IF NOT EXISTS idx_odoo_fp_accounts_fp ON odoo_fiscal_position_accounts(fiscal_position_id);
CREATE INDEX IF NOT EXISTS idx_odoo_fp_taxes_fp ON odoo_fiscal_position_taxes(fiscal_position_id);

COMMENT ON TABLE odoo_fiscal_positions IS 'Fiscal position rules: country/state -> tax and account overrides (no Xero equivalent)';

-- =====================================================
-- 7. ODOO JOURNALS
-- =====================================================
CREATE TABLE IF NOT EXISTS odoo_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  import_id UUID REFERENCES odoo_config_imports(id) ON DELETE SET NULL,
  odoo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  default_account_odoo_id INTEGER,
  default_account_code TEXT,
  currency_id TEXT,
  active BOOLEAN DEFAULT true,
  xero_bank_account_id TEXT,
  xero_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT odoo_journals_org_code_unique UNIQUE(org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_odoo_journals_org ON odoo_journals(org_id);
CREATE INDEX IF NOT EXISTS idx_odoo_journals_type ON odoo_journals(org_id, type);

COMMENT ON TABLE odoo_journals IS 'Bank journals -> Xero bank accounts; sale/purchase -> document type logic';

-- =====================================================
-- 8. EXTEND xero_account_mappings (odoo traceability)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_account_mappings' AND column_name = 'odoo_account_id') THEN
    ALTER TABLE xero_account_mappings ADD COLUMN odoo_account_id UUID REFERENCES odoo_accounts(id) ON DELETE SET NULL;
  END IF;
END$$;

-- =====================================================
-- 9. EXTEND xero_entity_mappings (dual-state awareness)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_entity_mappings' AND column_name = 'platform_state') THEN
    ALTER TABLE xero_entity_mappings ADD COLUMN platform_state TEXT DEFAULT 'synced' CHECK (platform_state IN ('draft', 'pending_sync', 'synced', 'error'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_entity_mappings' AND column_name = 'xero_state') THEN
    ALTER TABLE xero_entity_mappings ADD COLUMN xero_state TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_entity_mappings' AND column_name = 'last_reconciled_at') THEN
    ALTER TABLE xero_entity_mappings ADD COLUMN last_reconciled_at TIMESTAMPTZ;
  END IF;
END$$;

-- =====================================================
-- 10. TRIGGER updated_at for odoo_* tables
-- =====================================================
CREATE OR REPLACE FUNCTION odoo_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_odoo_accounts_updated_at') THEN
    CREATE TRIGGER trigger_odoo_accounts_updated_at BEFORE UPDATE ON odoo_accounts FOR EACH ROW EXECUTE FUNCTION odoo_update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_odoo_taxes_updated_at') THEN
    CREATE TRIGGER trigger_odoo_taxes_updated_at BEFORE UPDATE ON odoo_taxes FOR EACH ROW EXECUTE FUNCTION odoo_update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_odoo_payment_terms_updated_at') THEN
    CREATE TRIGGER trigger_odoo_payment_terms_updated_at BEFORE UPDATE ON odoo_payment_terms FOR EACH ROW EXECUTE FUNCTION odoo_update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_odoo_fiscal_positions_updated_at') THEN
    CREATE TRIGGER trigger_odoo_fiscal_positions_updated_at BEFORE UPDATE ON odoo_fiscal_positions FOR EACH ROW EXECUTE FUNCTION odoo_update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_odoo_journals_updated_at') THEN
    CREATE TRIGGER trigger_odoo_journals_updated_at BEFORE UPDATE ON odoo_journals FOR EACH ROW EXECUTE FUNCTION odoo_update_updated_at();
  END IF;
END$$;

-- =====================================================
-- 11. RECORD MIGRATION
-- =====================================================
INSERT INTO schema_migrations (migration_name)
VALUES ('0265_odoo_financial_config')
ON CONFLICT (migration_name) DO NOTHING;
