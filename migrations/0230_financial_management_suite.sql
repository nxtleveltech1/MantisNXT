-- Migration: 0230_financial_management_suite.sql
-- Description: Comprehensive Financial Management Suite - AP, AR, GL, Cash, Budget, Tax, Assets, Cost Accounting
-- Date: 2025-01-XX

BEGIN;

-- =====================================================
-- ENUMS
-- =====================================================

-- AP Invoice Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ap_invoice_status') THEN
        CREATE TYPE ap_invoice_status AS ENUM (
            'draft', 'submitted', 'under_review', 'approved', 'rejected',
            'paid', 'partially_paid', 'overdue', 'cancelled', 'disputed'
        );
    END IF;
END$$;

-- AR Invoice Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ar_invoice_status') THEN
        CREATE TYPE ar_invoice_status AS ENUM (
            'draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'
        );
    END IF;
END$$;

-- Payment Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'pending', 'scheduled', 'processing', 'paid', 'partially_paid',
            'failed', 'cancelled', 'overdue', 'refunded'
        );
    END IF;
END$$;

-- Payment Method
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM (
            'bank_transfer', 'credit_card', 'cheque', 'cash', 'eft', 'stop_order', 'debit_order'
        );
    END IF;
END$$;

-- Three-way Match Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'three_way_match_status') THEN
        CREATE TYPE three_way_match_status AS ENUM (
            'not_started', 'in_progress', 'matched', 'exceptions',
            'failed', 'manual_review', 'approved_with_exceptions'
        );
    END IF;
END$$;

-- Reconciliation Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reconciliation_status') THEN
        CREATE TYPE reconciliation_status AS ENUM (
            'unreconciled', 'reconciled', 'pending_review', 'disputed', 'adjusted'
        );
    END IF;
END$$;

-- GL Account Type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gl_account_type') THEN
        CREATE TYPE gl_account_type AS ENUM (
            'asset', 'liability', 'equity', 'revenue', 'expense'
        );
    END IF;
END$$;

-- Journal Entry Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journal_entry_status') THEN
        CREATE TYPE journal_entry_status AS ENUM (
            'draft', 'posted', 'reversed', 'adjusted', 'closed'
        );
    END IF;
END$$;

-- AR Invoice Source Type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ar_invoice_source_type') THEN
        CREATE TYPE ar_invoice_source_type AS ENUM (
            'sales_invoice', 'direct_ar', 'manual'
        );
    END IF;
END$$;

-- =====================================================
-- CHART OF ACCOUNTS ENHANCEMENT
-- =====================================================

-- Enhance existing account table if needed
DO $$
BEGIN
    -- Add cost center support
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'cost_center_id') THEN
        ALTER TABLE account ADD COLUMN cost_center_id uuid;
    END IF;
    
    -- Add project tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'project_id') THEN
        ALTER TABLE account ADD COLUMN project_id uuid;
    END IF;
    
    -- Add budget accounts flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'is_budget_account') THEN
        ALTER TABLE account ADD COLUMN is_budget_account boolean DEFAULT false;
    END IF;
    
    -- Add consolidation hierarchy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'consolidation_account_code') THEN
        ALTER TABLE account ADD COLUMN consolidation_account_code text;
    END IF;
    
    -- Add tax reporting categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'tax_reporting_category') THEN
        ALTER TABLE account ADD COLUMN tax_reporting_category text;
    END IF;
END$$;

-- =====================================================
-- ACCOUNTS PAYABLE TABLES
-- =====================================================

-- AP Vendor Invoices
CREATE TABLE IF NOT EXISTS ap_vendor_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    vendor_id uuid NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    purchase_order_id uuid REFERENCES purchase_order(id) ON DELETE SET NULL,
    invoice_number text NOT NULL,
    vendor_invoice_number text NOT NULL,
    invoice_date date NOT NULL DEFAULT CURRENT_DATE,
    due_date date NOT NULL,
    payment_terms text DEFAULT 'Net 30',
    currency text DEFAULT 'ZAR',
    exchange_rate numeric(10,6) DEFAULT 1.0,
    subtotal numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    shipping_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    paid_amount numeric(15,2) DEFAULT 0,
    balance_due numeric(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status ap_invoice_status DEFAULT 'draft',
    three_way_match_status three_way_match_status DEFAULT 'not_started',
    early_payment_discount_percent numeric(5,2) DEFAULT 0,
    early_payment_discount_days integer,
    notes text,
    billing_address jsonb,
    metadata jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    approved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT ap_vendor_invoice_number_org_unique UNIQUE(org_id, invoice_number),
    CONSTRAINT ap_vendor_amounts_non_negative CHECK (
        subtotal >= 0 AND tax_amount >= 0 AND discount_amount >= 0 AND
        shipping_amount >= 0 AND total_amount >= 0 AND paid_amount >= 0
    ),
    CONSTRAINT ap_vendor_due_date_after_invoice CHECK (due_date >= invoice_date),
    CONSTRAINT ap_vendor_paid_not_exceed_total CHECK (paid_amount <= total_amount)
);

-- AP Invoice Line Items
CREATE TABLE IF NOT EXISTS ap_invoice_line_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ap_invoice_id uuid NOT NULL REFERENCES ap_vendor_invoices(id) ON DELETE CASCADE,
    purchase_order_item_id uuid REFERENCES purchase_order_item(id) ON DELETE SET NULL,
    product_id uuid REFERENCES core.product(product_id) ON DELETE SET NULL,
    description text NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    tax_rate numeric(5,4) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    line_total numeric(15,2) NOT NULL,
    line_number integer NOT NULL,
    account_id uuid, -- FK to account table (to be added when account table exists)
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT ap_line_quantity_positive CHECK (quantity > 0),
    CONSTRAINT ap_line_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT ap_line_discount_range CHECK (discount_percent >= 0 AND discount_percent <= 100),
    CONSTRAINT ap_line_unique_line_number UNIQUE(ap_invoice_id, line_number)
);

-- AP Payments
CREATE TABLE IF NOT EXISTS ap_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    vendor_id uuid NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    payment_number text NOT NULL,
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'ZAR',
    exchange_rate numeric(10,6) DEFAULT 1.0,
    payment_method payment_method NOT NULL,
    status payment_status DEFAULT 'pending',
    bank_account_id uuid,
    reference_number text,
    transaction_id text,
    notes text,
    processed_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    authorized_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    authorized_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT ap_payment_number_org_unique UNIQUE(org_id, payment_number),
    CONSTRAINT ap_payment_amount_positive CHECK (amount > 0)
);

-- AP Payment Allocations
CREATE TABLE IF NOT EXISTS ap_payment_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ap_payment_id uuid NOT NULL REFERENCES ap_payments(id) ON DELETE CASCADE,
    ap_invoice_id uuid NOT NULL REFERENCES ap_vendor_invoices(id) ON DELETE RESTRICT,
    allocated_amount numeric(15,2) NOT NULL,
    discount_taken numeric(15,2) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT ap_allocation_amount_positive CHECK (allocated_amount > 0)
);

-- AP Three-way Match
CREATE TABLE IF NOT EXISTS ap_three_way_match (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ap_invoice_id uuid NOT NULL REFERENCES ap_vendor_invoices(id) ON DELETE CASCADE,
    purchase_order_id uuid NOT NULL REFERENCES purchase_order(id) ON DELETE RESTRICT,
    receipt_id uuid REFERENCES ar_receipts(id) ON DELETE SET NULL,
    status three_way_match_status DEFAULT 'not_started',
    po_amount numeric(15,2),
    receipt_amount numeric(15,2),
    invoice_amount numeric(15,2),
    variance_amount numeric(15,2),
    variance_percent numeric(5,2),
    exceptions text[],
    matched_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    matched_at timestamptz,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT ap_match_unique_invoice UNIQUE(ap_invoice_id)
);

-- AP Credit Notes
CREATE TABLE IF NOT EXISTS ap_credit_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    vendor_id uuid NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    ap_invoice_id uuid REFERENCES ap_vendor_invoices(id) ON DELETE SET NULL,
    credit_note_number text NOT NULL,
    credit_note_date date NOT NULL DEFAULT CURRENT_DATE,
    reason text,
    currency text DEFAULT 'ZAR',
    total_amount numeric(15,2) NOT NULL,
    applied_amount numeric(15,2) DEFAULT 0,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'cancelled')),
    notes text,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT ap_credit_note_number_org_unique UNIQUE(org_id, credit_note_number),
    CONSTRAINT ap_credit_note_amount_positive CHECK (total_amount > 0)
);

-- AP Expense Claims
CREATE TABLE IF NOT EXISTS ap_expense_claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE RESTRICT,
    claim_number text NOT NULL,
    claim_date date NOT NULL DEFAULT CURRENT_DATE,
    total_amount numeric(15,2) DEFAULT 0,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
    submitted_at timestamptz,
    approved_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    approved_at timestamptz,
    paid_at timestamptz,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT ap_expense_claim_number_org_unique UNIQUE(org_id, claim_number)
);

-- =====================================================
-- ACCOUNTS RECEIVABLE TABLES
-- =====================================================

-- AR Customer Invoices
CREATE TABLE IF NOT EXISTS ar_customer_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    sales_invoice_id uuid, -- FK to invoices table (to be added when invoices table exists)
    sales_order_id uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
    quotation_id uuid, -- FK to quotations table (to be added when quotations table exists)
    invoice_number text NOT NULL,
    source_type ar_invoice_source_type DEFAULT 'direct_ar',
    invoice_date date NOT NULL DEFAULT CURRENT_DATE,
    due_date date NOT NULL,
    payment_terms text DEFAULT 'Net 30',
    currency text DEFAULT 'ZAR',
    exchange_rate numeric(10,6) DEFAULT 1.0,
    subtotal numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    shipping_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    paid_amount numeric(15,2) DEFAULT 0,
    balance_due numeric(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status ar_invoice_status DEFAULT 'draft',
    sent_at timestamptz,
    viewed_at timestamptz,
    first_payment_at timestamptz,
    notes text,
    billing_address jsonb,
    shipping_address jsonb,
    metadata jsonb DEFAULT '{}',
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT ar_customer_invoice_number_org_unique UNIQUE(org_id, invoice_number),
    CONSTRAINT ar_customer_amounts_non_negative CHECK (
        subtotal >= 0 AND tax_amount >= 0 AND discount_amount >= 0 AND
        shipping_amount >= 0 AND total_amount >= 0 AND paid_amount >= 0
    ),
    CONSTRAINT ar_customer_due_date_after_invoice CHECK (due_date >= invoice_date),
    CONSTRAINT ar_customer_paid_not_exceed_total CHECK (paid_amount <= total_amount)
);

-- AR Invoice Line Items
CREATE TABLE IF NOT EXISTS ar_invoice_line_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ar_invoice_id uuid NOT NULL REFERENCES ar_customer_invoices(id) ON DELETE CASCADE,
    sales_order_item_id uuid REFERENCES sales_order_items(id) ON DELETE SET NULL,
    product_id uuid REFERENCES core.product(product_id) ON DELETE SET NULL,
    description text NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    tax_rate numeric(5,4) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    line_total numeric(15,2) NOT NULL,
    line_number integer NOT NULL,
    account_id uuid, -- FK to account table (to be added when account table exists)
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT ar_line_quantity_positive CHECK (quantity > 0),
    CONSTRAINT ar_line_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT ar_line_discount_range CHECK (discount_percent >= 0 AND discount_percent <= 100),
    CONSTRAINT ar_line_unique_line_number UNIQUE(ar_invoice_id, line_number)
);

-- AR Receipts
CREATE TABLE IF NOT EXISTS ar_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    receipt_number text NOT NULL,
    receipt_date date NOT NULL DEFAULT CURRENT_DATE,
    amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'ZAR',
    exchange_rate numeric(10,6) DEFAULT 1.0,
    payment_method payment_method NOT NULL,
    status payment_status DEFAULT 'pending',
    bank_account_id uuid,
    reference_number text,
    transaction_id text,
    gateway_transaction_id text,
    gateway_response jsonb,
    notes text,
    processed_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT ar_receipt_number_org_unique UNIQUE(org_id, receipt_number),
    CONSTRAINT ar_receipt_amount_positive CHECK (amount > 0)
);

-- AR Receipt Allocations
CREATE TABLE IF NOT EXISTS ar_receipt_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ar_receipt_id uuid NOT NULL REFERENCES ar_receipts(id) ON DELETE CASCADE,
    ar_invoice_id uuid NOT NULL REFERENCES ar_customer_invoices(id) ON DELETE RESTRICT,
    allocated_amount numeric(15,2) NOT NULL,
    discount_taken numeric(15,2) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT ar_receipt_allocation_amount_positive CHECK (allocated_amount > 0)
);

-- AR Credit Notes
CREATE TABLE IF NOT EXISTS ar_credit_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    ar_invoice_id uuid REFERENCES ar_customer_invoices(id) ON DELETE SET NULL,
    credit_note_number text NOT NULL,
    credit_note_date date NOT NULL DEFAULT CURRENT_DATE,
    reason text,
    currency text DEFAULT 'ZAR',
    total_amount numeric(15,2) NOT NULL,
    applied_amount numeric(15,2) DEFAULT 0,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'cancelled')),
    notes text,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT ar_credit_note_number_org_unique UNIQUE(org_id, credit_note_number),
    CONSTRAINT ar_credit_note_amount_positive CHECK (total_amount > 0)
);

-- AR Collection Notes
CREATE TABLE IF NOT EXISTS ar_collection_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    ar_invoice_id uuid REFERENCES ar_customer_invoices(id) ON DELETE SET NULL,
    note_date date NOT NULL DEFAULT CURRENT_DATE,
    contact_method text CHECK (contact_method IN ('email', 'phone', 'letter', 'in_person')),
    contact_person text,
    notes text NOT NULL,
    next_follow_up_date date,
    status text DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated', 'closed')),
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- AR Aging Summary View (Materialized)
CREATE MATERIALIZED VIEW IF NOT EXISTS ar_aging_summary AS
SELECT
    org_id,
    customer_id,
    ar_invoice_id,
    invoice_number,
    invoice_date,
    due_date,
    total_amount,
    paid_amount,
    balance_due,
    CASE
        WHEN balance_due = 0 THEN 'current'
        WHEN CURRENT_DATE <= due_date THEN 'current'
        WHEN CURRENT_DATE <= due_date + INTERVAL '30 days' THEN '1-30'
        WHEN CURRENT_DATE <= due_date + INTERVAL '60 days' THEN '31-60'
        WHEN CURRENT_DATE <= due_date + INTERVAL '90 days' THEN '61-90'
        ELSE '90+'
    END AS aging_bucket,
    CURRENT_DATE - due_date AS days_overdue
FROM ar_customer_invoices
WHERE balance_due > 0 AND status NOT IN ('cancelled', 'refunded');

CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_aging_summary_invoice ON ar_aging_summary(ar_invoice_id);
CREATE INDEX IF NOT EXISTS idx_ar_aging_summary_customer ON ar_aging_summary(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_aging_summary_org ON ar_aging_summary(org_id);

-- Unified AR Invoices View
CREATE OR REPLACE VIEW v_unified_ar_invoices AS
SELECT
    ar.id,
    ar.org_id,
    ar.customer_id,
    ar.sales_invoice_id,
    ar.sales_order_id,
    ar.quotation_id,
    ar.invoice_number,
    ar.source_type,
    ar.invoice_date,
    ar.due_date,
    ar.total_amount,
    ar.paid_amount,
    ar.balance_due,
    ar.status,
    ar.created_at,
    CASE
        WHEN ar.source_type = 'sales_invoice' THEN si.document_number
        ELSE ar.invoice_number
    END AS display_number
FROM ar_customer_invoices ar
LEFT JOIN LATERAL (
    SELECT id, document_number 
    FROM invoices 
    WHERE invoices.id = ar.sales_invoice_id
    LIMIT 1
) si ON true;

-- =====================================================
-- GENERAL LEDGER TABLES (Enhance existing)
-- =====================================================

-- Enhance journal_entry table if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entry' AND column_name = 'status') THEN
        ALTER TABLE journal_entry ADD COLUMN status journal_entry_status DEFAULT 'draft';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entry' AND column_name = 'period') THEN
        ALTER TABLE journal_entry ADD COLUMN period text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entry' AND column_name = 'fiscal_year') THEN
        ALTER TABLE journal_entry ADD COLUMN fiscal_year integer;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entry' AND column_name = 'reversed_by') THEN
        ALTER TABLE journal_entry ADD COLUMN reversed_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entry' AND column_name = 'reversed_at') THEN
        ALTER TABLE journal_entry ADD COLUMN reversed_at timestamptz;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entry' AND column_name = 'reversal_reason') THEN
        ALTER TABLE journal_entry ADD COLUMN reversal_reason text;
    END IF;
END$$;

-- GL Account Balances
CREATE TABLE IF NOT EXISTS gl_account_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    account_id uuid NOT NULL, -- FK to account table (to be added when account table exists)
    period text NOT NULL,
    fiscal_year integer NOT NULL,
    opening_balance numeric(15,2) DEFAULT 0,
    debit_total numeric(15,2) DEFAULT 0,
    credit_total numeric(15,2) DEFAULT 0,
    closing_balance numeric(15,2) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT gl_account_balance_unique UNIQUE(org_id, account_id, period, fiscal_year),
    CONSTRAINT gl_period_format CHECK (period ~ '^\d{4}-\d{2}$')
);

-- GL Periods
CREATE TABLE IF NOT EXISTS gl_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    period text NOT NULL,
    fiscal_year integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_closed boolean DEFAULT false,
    closed_at timestamptz,
    closed_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT gl_period_unique UNIQUE(org_id, period, fiscal_year),
    CONSTRAINT gl_period_dates_valid CHECK (end_date >= start_date),
    CONSTRAINT gl_period_format CHECK (period ~ '^\d{4}-\d{2}$')
);

-- GL Fiscal Years
CREATE TABLE IF NOT EXISTS gl_fiscal_years (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    fiscal_year integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_closed boolean DEFAULT false,
    closed_at timestamptz,
    closed_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT gl_fiscal_year_unique UNIQUE(org_id, fiscal_year),
    CONSTRAINT gl_fiscal_year_dates_valid CHECK (end_date >= start_date)
);

-- GL Closing Entries
CREATE TABLE IF NOT EXISTS gl_closing_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    period text NOT NULL,
    fiscal_year integer NOT NULL,
    journal_entry_id uuid NOT NULL, -- FK to journal_entry table (to be added when journal_entry table exists)
    closing_type text NOT NULL CHECK (closing_type IN ('period', 'year', 'revenue', 'expense')),
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT gl_closing_entry_unique UNIQUE(org_id, period, fiscal_year, closing_type)
);

-- GL Recurring Entries
CREATE TABLE IF NOT EXISTS gl_recurring_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    template_name text NOT NULL,
    description text NOT NULL,
    frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    day_of_month integer CHECK (day_of_month >= 1 AND day_of_month <= 31),
    is_active boolean DEFAULT true,
    next_run_date date,
    last_run_date date,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT gl_recurring_template_name_org_unique UNIQUE(org_id, template_name)
);

-- GL Recurring Entry Lines
CREATE TABLE IF NOT EXISTS gl_recurring_entry_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_entry_id uuid NOT NULL REFERENCES gl_recurring_entries(id) ON DELETE CASCADE,
    account_id uuid NOT NULL, -- FK to account table (to be added when account table exists)
    description text,
    debit_amount numeric(15,2) DEFAULT 0,
    credit_amount numeric(15,2) DEFAULT 0,
    line_number integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT gl_recurring_line_amounts_non_negative CHECK (debit_amount >= 0 AND credit_amount >= 0),
    CONSTRAINT gl_recurring_line_amount_exclusive CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (debit_amount = 0 AND credit_amount > 0)
    ),
    CONSTRAINT gl_recurring_line_unique_line_number UNIQUE(recurring_entry_id, line_number)
);

-- =====================================================
-- CASH MANAGEMENT TABLES
-- =====================================================

-- Cash Bank Accounts
CREATE TABLE IF NOT EXISTS cash_bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    account_name text NOT NULL,
    account_number text NOT NULL,
    bank_name text NOT NULL,
    bank_code text,
    branch_code text,
    account_type text NOT NULL CHECK (account_type IN ('checking', 'savings', 'money_market', 'other')),
    currency text DEFAULT 'ZAR',
    opening_balance numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    is_reconciled boolean DEFAULT false,
    last_reconciled_at timestamptz,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT cash_bank_account_number_org_unique UNIQUE(org_id, account_number)
);

-- Cash Bank Transactions
CREATE TABLE IF NOT EXISTS cash_bank_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    bank_account_id uuid NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE CASCADE,
    transaction_date date NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'fee', 'interest')),
    amount numeric(15,2) NOT NULL,
    balance_after numeric(15,2),
    description text,
    reference_number text,
    check_number text,
    payee text,
    category text,
    is_reconciled boolean DEFAULT false,
    reconciled_at timestamptz,
    imported_from text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT cash_bank_transaction_amount_non_zero CHECK (amount != 0)
);

-- Cash Bank Reconciliation
CREATE TABLE IF NOT EXISTS cash_bank_reconciliation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    bank_account_id uuid NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE CASCADE,
    reconciliation_date date NOT NULL,
    statement_balance numeric(15,2) NOT NULL,
    book_balance numeric(15,2) NOT NULL,
    reconciled_balance numeric(15,2),
    status reconciliation_status DEFAULT 'unreconciled',
    notes text,
    reconciled_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    reconciled_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Cash Reconciliation Lines
CREATE TABLE IF NOT EXISTS cash_reconciliation_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_id uuid NOT NULL REFERENCES cash_bank_reconciliation(id) ON DELETE CASCADE,
    bank_transaction_id uuid REFERENCES cash_bank_transactions(id) ON DELETE SET NULL,
    journal_entry_id uuid REFERENCES journal_entry(id) ON DELETE SET NULL,
    ar_receipt_id uuid REFERENCES ar_receipts(id) ON DELETE SET NULL,
    ap_payment_id uuid REFERENCES ap_payments(id) ON DELETE SET NULL,
    amount numeric(15,2) NOT NULL,
    is_match boolean DEFAULT false,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- Cash Petty Cash
CREATE TABLE IF NOT EXISTS cash_petty_cash (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    account_name text NOT NULL,
    custodian_id uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE RESTRICT,
    opening_balance numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) DEFAULT 0,
    max_amount numeric(15,2),
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT cash_petty_cash_account_name_org_unique UNIQUE(org_id, account_name)
);

-- Cash Petty Cash Transactions
CREATE TABLE IF NOT EXISTS cash_petty_cash_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    petty_cash_id uuid NOT NULL REFERENCES cash_petty_cash(id) ON DELETE CASCADE,
    transaction_date date NOT NULL DEFAULT CURRENT_DATE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('replenish', 'expense', 'transfer')),
    amount numeric(15,2) NOT NULL,
    description text NOT NULL,
    receipt_number text,
    category text,
    approved_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    approved_at timestamptz,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT cash_petty_transaction_amount_positive CHECK (amount > 0)
);

-- Cash Forecasts
CREATE TABLE IF NOT EXISTS cash_forecasts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    forecast_date date NOT NULL,
    bank_account_id uuid REFERENCES cash_bank_accounts(id) ON DELETE SET NULL,
    opening_balance numeric(15,2) NOT NULL,
    projected_inflows numeric(15,2) DEFAULT 0,
    projected_outflows numeric(15,2) DEFAULT 0,
    projected_balance numeric(15,2) GENERATED ALWAYS AS (opening_balance + projected_inflows - projected_outflows) STORED,
    confidence_level text CHECK (confidence_level IN ('high', 'medium', 'low')),
    assumptions text,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT cash_forecast_unique_date_account UNIQUE(org_id, forecast_date, bank_account_id)
);

-- =====================================================
-- BUDGETING TABLES
-- =====================================================

-- Budget Versions
CREATE TABLE IF NOT EXISTS budget_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    version_name text NOT NULL,
    fiscal_year integer NOT NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    is_default boolean DEFAULT false,
    notes text,
    created_by uuid NOT NULL REFERENCES auth.users_extended(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT budget_version_name_org_unique UNIQUE(org_id, version_name, fiscal_year)
);

-- Budget Periods
CREATE TABLE IF NOT EXISTS budget_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_version_id uuid NOT NULL REFERENCES budget_versions(id) ON DELETE CASCADE,
    period text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT budget_period_unique UNIQUE(budget_version_id, period),
    CONSTRAINT budget_period_dates_valid CHECK (end_date >= start_date),
    CONSTRAINT budget_period_format CHECK (period ~ '^\d{4}-\d{2}$')
);

-- Budget Lines
CREATE TABLE IF NOT EXISTS budget_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_version_id uuid NOT NULL REFERENCES budget_versions(id) ON DELETE CASCADE,
    account_id uuid NOT NULL, -- FK to account table (to be added when account table exists)
    period text NOT NULL,
    budget_amount numeric(15,2) NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT budget_line_unique UNIQUE(budget_version_id, account_id, period)
);

-- Budget Actuals (Materialized view for performance)
-- Note: This view will be updated when journal_entry and journal_entry_line tables exist
CREATE MATERIALIZED VIEW IF NOT EXISTS budget_actuals AS
SELECT
    bv.org_id,
    bv.id AS budget_version_id,
    bv.version_name,
    bl.account_id,
    bl.period,
    bl.budget_amount,
    0 AS actual_amount, -- Will be calculated when journal_entry tables exist
    bl.budget_amount AS variance_amount -- Will be calculated when journal_entry tables exist
FROM budget_versions bv
JOIN budget_lines bl ON bv.id = bl.budget_version_id
GROUP BY bv.org_id, bv.id, bv.version_name, bl.account_id, bl.period, bl.budget_amount;

CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_actuals_unique ON budget_actuals(budget_version_id, account_id, period);
CREATE INDEX IF NOT EXISTS idx_budget_actuals_org ON budget_actuals(org_id);

-- Budget Forecasts
CREATE TABLE IF NOT EXISTS budget_forecasts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    budget_version_id uuid NOT NULL REFERENCES budget_versions(id) ON DELETE CASCADE,
    forecast_date date NOT NULL,
    account_id uuid NOT NULL, -- FK to account table (to be added when account table exists)
    forecast_amount numeric(15,2) NOT NULL,
    assumptions text,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT budget_forecast_unique UNIQUE(budget_version_id, forecast_date, account_id)
);

-- =====================================================
-- TAX MANAGEMENT TABLES
-- =====================================================

-- Enhance existing tax_rate table if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tax_rate' AND column_name = 'tax_code') THEN
        ALTER TABLE tax_rate ADD COLUMN tax_code text;
    END IF;
END$$;

-- Tax Transactions
CREATE TABLE IF NOT EXISTS tax_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    transaction_date date NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('sale', 'purchase', 'adjustment', 'payment', 'refund')),
    source_type text,
    source_id uuid,
    tax_rate_id uuid NOT NULL, -- FK to tax_rate table (to be added when tax_rate table exists)
    taxable_amount numeric(15,2) NOT NULL,
    tax_amount numeric(15,2) NOT NULL,
    is_input_tax boolean DEFAULT false,
    is_output_tax boolean DEFAULT false,
    period text NOT NULL,
    fiscal_year integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT tax_transaction_period_format CHECK (period ~ '^\d{4}-\d{2}$')
);

-- Tax Returns
CREATE TABLE IF NOT EXISTS tax_returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    return_period text NOT NULL,
    fiscal_year integer NOT NULL,
    return_type text NOT NULL CHECK (return_type IN ('vat', 'income_tax', 'paye', 'other')),
    filing_date date,
    due_date date NOT NULL,
    total_tax_due numeric(15,2) DEFAULT 0,
    total_tax_paid numeric(15,2) DEFAULT 0,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
    submitted_at timestamptz,
    submitted_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT tax_return_unique UNIQUE(org_id, return_period, return_type),
    CONSTRAINT tax_return_period_format CHECK (return_period ~ '^\d{4}-\d{2}$')
);

-- Tax Return Lines
CREATE TABLE IF NOT EXISTS tax_return_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_return_id uuid NOT NULL REFERENCES tax_returns(id) ON DELETE CASCADE,
    line_number integer NOT NULL,
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    tax_code text,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT tax_return_line_unique_line_number UNIQUE(tax_return_id, line_number)
);

-- Tax Compliance Log
CREATE TABLE IF NOT EXISTS tax_compliance_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    log_date date NOT NULL DEFAULT CURRENT_DATE,
    compliance_type text NOT NULL,
    status text NOT NULL CHECK (status IN ('compliant', 'non_compliant', 'warning', 'pending')),
    description text NOT NULL,
    action_taken text,
    resolved_at timestamptz,
    resolved_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- FIXED ASSETS TABLES
-- =====================================================

-- FA Asset Register
CREATE TABLE IF NOT EXISTS fa_asset_register (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    asset_number text NOT NULL,
    asset_name text NOT NULL,
    asset_category_id uuid REFERENCES fa_asset_categories(id) ON DELETE SET NULL,
    description text,
    purchase_date date NOT NULL,
    purchase_cost numeric(15,2) NOT NULL,
    current_value numeric(15,2),
    depreciation_method text CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'units_of_production', 'sum_of_years')),
    useful_life_years integer,
    salvage_value numeric(15,2) DEFAULT 0,
    location text,
    custodian_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'under_maintenance', 'retired')),
    disposed_date date,
    disposed_amount numeric(15,2),
    notes text,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT fa_asset_number_org_unique UNIQUE(org_id, asset_number),
    CONSTRAINT fa_asset_purchase_cost_positive CHECK (purchase_cost > 0)
);

-- FA Asset Categories
CREATE TABLE IF NOT EXISTS fa_asset_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    category_code text NOT NULL,
    category_name text NOT NULL,
    default_depreciation_method text CHECK (default_depreciation_method IN ('straight_line', 'declining_balance', 'units_of_production', 'sum_of_years')),
    default_useful_life_years integer,
    account_id uuid, -- FK to account table (to be added when account table exists)
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT fa_asset_category_code_org_unique UNIQUE(org_id, category_code)
);

-- FA Depreciation Methods
CREATE TABLE IF NOT EXISTS fa_depreciation_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    method_code text NOT NULL,
    method_name text NOT NULL,
    method_type text NOT NULL CHECK (method_type IN ('straight_line', 'declining_balance', 'units_of_production', 'sum_of_years')),
    rate numeric(5,4),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT fa_depreciation_method_code_org_unique UNIQUE(org_id, method_code)
);

-- FA Depreciation Schedules
CREATE TABLE IF NOT EXISTS fa_depreciation_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid NOT NULL REFERENCES fa_asset_register(id) ON DELETE CASCADE,
    period text NOT NULL,
    fiscal_year integer NOT NULL,
    opening_book_value numeric(15,2) NOT NULL,
    depreciation_amount numeric(15,2) NOT NULL,
    accumulated_depreciation numeric(15,2) NOT NULL,
    closing_book_value numeric(15,2) NOT NULL,
    journal_entry_id uuid REFERENCES journal_entry(id) ON DELETE SET NULL,
    posted_at timestamptz,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT fa_depreciation_schedule_unique UNIQUE(asset_id, period, fiscal_year),
    CONSTRAINT fa_depreciation_period_format CHECK (period ~ '^\d{4}-\d{2}$')
);

-- FA Asset Disposals
CREATE TABLE IF NOT EXISTS fa_asset_disposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid NOT NULL REFERENCES fa_asset_register(id) ON DELETE CASCADE,
    disposal_date date NOT NULL,
    disposal_method text CHECK (disposal_method IN ('sale', 'scrap', 'donation', 'trade_in')),
    disposal_amount numeric(15,2),
    gain_loss_amount numeric(15,2),
    journal_entry_id uuid REFERENCES journal_entry(id) ON DELETE SET NULL,
    notes text,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- FA Asset Maintenance
CREATE TABLE IF NOT EXISTS fa_asset_maintenance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id uuid NOT NULL REFERENCES fa_asset_register(id) ON DELETE CASCADE,
    maintenance_date date NOT NULL,
    maintenance_type text CHECK (maintenance_type IN ('repair', 'service', 'inspection', 'upgrade')),
    description text NOT NULL,
    cost numeric(15,2),
    vendor_id uuid REFERENCES supplier(id) ON DELETE SET NULL,
    next_maintenance_date date,
    performed_by text,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- COST ACCOUNTING TABLES
-- =====================================================

-- Cost Centers
CREATE TABLE IF NOT EXISTS cost_centers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    cost_center_code text NOT NULL,
    cost_center_name text NOT NULL,
    parent_cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
    manager_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT cost_center_code_org_unique UNIQUE(org_id, cost_center_code)
);

-- Cost Allocations
CREATE TABLE IF NOT EXISTS cost_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    allocation_name text NOT NULL,
    source_cost_center_id uuid NOT NULL REFERENCES cost_centers(id) ON DELETE RESTRICT,
    allocation_method text NOT NULL CHECK (allocation_method IN ('direct', 'percentage', 'activity_based', 'step_down')),
    allocation_percent numeric(5,2),
    is_active boolean DEFAULT true,
    description text,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT cost_allocation_name_org_unique UNIQUE(org_id, allocation_name)
);

-- Cost Allocation Rules (Many-to-Many: Allocation to Target Cost Centers)
CREATE TABLE IF NOT EXISTS cost_allocation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_allocation_id uuid NOT NULL REFERENCES cost_allocations(id) ON DELETE CASCADE,
    target_cost_center_id uuid NOT NULL REFERENCES cost_centers(id) ON DELETE RESTRICT,
    allocation_percent numeric(5,2) NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT cost_allocation_rule_unique UNIQUE(cost_allocation_id, target_cost_center_id),
    CONSTRAINT cost_allocation_rule_percent_range CHECK (allocation_percent >= 0 AND allocation_percent <= 100)
);

-- Cost Allocation Runs
CREATE TABLE IF NOT EXISTS cost_allocation_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    run_date date NOT NULL DEFAULT CURRENT_DATE,
    period text NOT NULL,
    fiscal_year integer NOT NULL,
    total_allocated_amount numeric(15,2) DEFAULT 0,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at timestamptz,
    completed_at timestamptz,
    error_message text,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT cost_allocation_run_period_format CHECK (period ~ '^\d{4}-\d{2}$')
);

-- Cost Allocation Run Details
CREATE TABLE IF NOT EXISTS cost_allocation_run_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_run_id uuid NOT NULL REFERENCES cost_allocation_runs(id) ON DELETE CASCADE,
    cost_allocation_id uuid NOT NULL REFERENCES cost_allocations(id) ON DELETE RESTRICT,
    source_cost_center_id uuid NOT NULL REFERENCES cost_centers(id) ON DELETE RESTRICT,
    target_cost_center_id uuid NOT NULL REFERENCES cost_centers(id) ON DELETE RESTRICT,
    allocated_amount numeric(15,2) NOT NULL,
    journal_entry_id uuid REFERENCES journal_entry(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Project Costing
CREATE TABLE IF NOT EXISTS project_costing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    project_code text NOT NULL,
    project_name text NOT NULL,
    start_date date,
    end_date date,
    budget_amount numeric(15,2),
    actual_cost numeric(15,2) DEFAULT 0,
    status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
    manager_id uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT project_code_org_unique UNIQUE(org_id, project_code)
);

-- Project Cost Transactions
CREATE TABLE IF NOT EXISTS project_cost_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES project_costing(id) ON DELETE CASCADE,
    transaction_date date NOT NULL DEFAULT CURRENT_DATE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('labor', 'material', 'overhead', 'other')),
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    account_id uuid, -- FK to account table (to be added when account table exists)
    journal_entry_line_id uuid, -- FK to journal_entry_line table (to be added when journal_entry_line table exists)
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Job Costing
CREATE TABLE IF NOT EXISTS job_costing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    job_number text NOT NULL,
    job_name text NOT NULL,
    customer_id uuid REFERENCES customer(id) ON DELETE SET NULL,
    start_date date,
    completion_date date,
    estimated_cost numeric(15,2),
    actual_cost numeric(15,2) DEFAULT 0,
    billable_amount numeric(15,2),
    status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
    project_id uuid REFERENCES project_costing(id) ON DELETE SET NULL,
    cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT job_number_org_unique UNIQUE(org_id, job_number)
);

-- Job Cost Transactions
CREATE TABLE IF NOT EXISTS job_cost_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES job_costing(id) ON DELETE CASCADE,
    transaction_date date NOT NULL DEFAULT CURRENT_DATE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('labor', 'material', 'overhead', 'expense', 'revenue')),
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    account_id uuid, -- FK to account table (to be added when account table exists)
    journal_entry_line_id uuid, -- FK to journal_entry_line table (to be added when journal_entry_line table exists)
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- FINANCIAL REPORTING TABLES
-- =====================================================

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    template_name text NOT NULL,
    report_type text NOT NULL CHECK (report_type IN ('balance_sheet', 'income_statement', 'cash_flow', 'trial_balance', 'custom')),
    template_config jsonb NOT NULL DEFAULT '{}',
    is_system_template boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT report_template_name_org_unique UNIQUE(org_id, template_name)
);

-- Report Schedules
CREATE TABLE IF NOT EXISTS report_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    template_id uuid NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    schedule_name text NOT NULL,
    frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
    day_of_month integer CHECK (day_of_month >= 1 AND day_of_month <= 31),
    recipients text[],
    is_active boolean DEFAULT true,
    next_run_date date,
    last_run_date date,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT report_schedule_name_org_unique UNIQUE(org_id, schedule_name)
);

-- Report Executions
CREATE TABLE IF NOT EXISTS report_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    template_id uuid NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    schedule_id uuid REFERENCES report_schedules(id) ON DELETE SET NULL,
    execution_date date NOT NULL DEFAULT CURRENT_DATE,
    period text,
    fiscal_year integer,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    output_file_path text,
    error_message text,
    started_at timestamptz,
    completed_at timestamptz,
    created_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Financial Statements Cache
CREATE TABLE IF NOT EXISTS financial_statements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    statement_type text NOT NULL CHECK (statement_type IN ('balance_sheet', 'income_statement', 'cash_flow', 'trial_balance')),
    period text NOT NULL,
    fiscal_year integer NOT NULL,
    statement_data jsonb NOT NULL,
    generated_at timestamptz DEFAULT now(),
    generated_by uuid REFERENCES auth.users_extended(id) ON DELETE SET NULL,
    
    CONSTRAINT financial_statement_unique UNIQUE(org_id, statement_type, period, fiscal_year),
    CONSTRAINT financial_statement_period_format CHECK (period ~ '^\d{4}-\d{2}$')
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- AP Indexes
CREATE INDEX IF NOT EXISTS idx_ap_vendor_invoices_org ON ap_vendor_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_ap_vendor_invoices_vendor ON ap_vendor_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_vendor_invoices_status ON ap_vendor_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ap_vendor_invoices_due_date ON ap_vendor_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_ap_invoice_line_items_invoice ON ap_invoice_line_items(ap_invoice_id);
CREATE INDEX IF NOT EXISTS idx_ap_payments_org ON ap_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_ap_payments_vendor ON ap_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_payment_allocations_payment ON ap_payment_allocations(ap_payment_id);
CREATE INDEX IF NOT EXISTS idx_ap_payment_allocations_invoice ON ap_payment_allocations(ap_invoice_id);

-- AR Indexes
CREATE INDEX IF NOT EXISTS idx_ar_customer_invoices_org ON ar_customer_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_ar_customer_invoices_customer ON ar_customer_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_customer_invoices_sales_invoice ON ar_customer_invoices(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_ar_customer_invoices_status ON ar_customer_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ar_customer_invoices_due_date ON ar_customer_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_customer_invoices_source_type ON ar_customer_invoices(source_type);
CREATE INDEX IF NOT EXISTS idx_ar_invoice_line_items_invoice ON ar_invoice_line_items(ar_invoice_id);
CREATE INDEX IF NOT EXISTS idx_ar_receipts_org ON ar_receipts(org_id);
CREATE INDEX IF NOT EXISTS idx_ar_receipts_customer ON ar_receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_receipt_allocations_receipt ON ar_receipt_allocations(ar_receipt_id);
CREATE INDEX IF NOT EXISTS idx_ar_receipt_allocations_invoice ON ar_receipt_allocations(ar_invoice_id);

-- GL Indexes
CREATE INDEX IF NOT EXISTS idx_gl_account_balances_org ON gl_account_balances(org_id);
CREATE INDEX IF NOT EXISTS idx_gl_account_balances_account ON gl_account_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_account_balances_period ON gl_account_balances(period, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_gl_periods_org ON gl_periods(org_id);
CREATE INDEX IF NOT EXISTS idx_gl_periods_period ON gl_periods(period, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_gl_fiscal_years_org ON gl_fiscal_years(org_id);
CREATE INDEX IF NOT EXISTS idx_gl_fiscal_years_year ON gl_fiscal_years(fiscal_year);

-- Cash Indexes
CREATE INDEX IF NOT EXISTS idx_cash_bank_accounts_org ON cash_bank_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_cash_bank_transactions_account ON cash_bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_bank_transactions_date ON cash_bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_bank_reconciliation_account ON cash_bank_reconciliation(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_petty_cash_org ON cash_petty_cash(org_id);
CREATE INDEX IF NOT EXISTS idx_cash_forecasts_org ON cash_forecasts(org_id);
CREATE INDEX IF NOT EXISTS idx_cash_forecasts_date ON cash_forecasts(forecast_date);

-- Budget Indexes
CREATE INDEX IF NOT EXISTS idx_budget_versions_org ON budget_versions(org_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_version ON budget_lines(budget_version_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_account ON budget_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_version ON budget_forecasts(budget_version_id);

-- Tax Indexes
CREATE INDEX IF NOT EXISTS idx_tax_transactions_org ON tax_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_tax_transactions_period ON tax_transactions(period, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_tax_returns_org ON tax_returns(org_id);
CREATE INDEX IF NOT EXISTS idx_tax_returns_period ON tax_returns(return_period);

-- Fixed Assets Indexes
CREATE INDEX IF NOT EXISTS idx_fa_asset_register_org ON fa_asset_register(org_id);
CREATE INDEX IF NOT EXISTS idx_fa_asset_register_category ON fa_asset_register(asset_category_id);
CREATE INDEX IF NOT EXISTS idx_fa_depreciation_schedules_asset ON fa_depreciation_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_fa_depreciation_schedules_period ON fa_depreciation_schedules(period, fiscal_year);

-- Cost Accounting Indexes
CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON cost_centers(org_id);
CREATE INDEX IF NOT EXISTS idx_cost_allocations_org ON cost_allocations(org_id);
CREATE INDEX IF NOT EXISTS idx_cost_allocation_runs_org ON cost_allocation_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_project_costing_org ON project_costing(org_id);
CREATE INDEX IF NOT EXISTS idx_job_costing_org ON job_costing(org_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
DO $$
DECLARE
    tbl_name text;
    tables text[] := ARRAY[
        'ap_vendor_invoices', 'ap_payments', 'ap_credit_notes', 'ap_expense_claims',
        'ar_customer_invoices', 'ar_receipts', 'ar_credit_notes', 'ar_collection_notes',
        'gl_account_balances', 'gl_periods', 'gl_recurring_entries',
        'cash_bank_accounts', 'cash_bank_reconciliation', 'cash_forecasts',
        'budget_versions', 'budget_lines', 'budget_forecasts',
        'tax_returns', 'tax_compliance_log',
        'fa_asset_register', 'fa_asset_categories',
        'cost_centers', 'cost_allocations', 'project_costing', 'job_costing',
        'report_templates', 'report_schedules'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trigger_update_updated_at ON %I', tbl_name);
            EXECUTE format('CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', tbl_name);
        END IF;
    END LOOP;
END$$;

COMMIT;

-- Record migration
INSERT INTO schema_migrations (migration_name)
VALUES ('0230_financial_management_suite')
ON CONFLICT (migration_name) DO NOTHING;

