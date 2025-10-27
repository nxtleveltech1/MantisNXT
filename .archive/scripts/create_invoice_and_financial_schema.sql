-- =====================================================
-- INVOICE & FINANCIAL MANAGEMENT SCHEMA
-- Agent 5 - MantisNXT Invoice & Financial Data System
-- =====================================================
-- Comprehensive invoice, payment, and accounting system
-- Built to work with Agent 4's purchase orders and contracts

-- =====================================================
-- ENABLE REQUIRED EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FINANCIAL ENUMS
-- =====================================================

-- Invoice status enum
CREATE TYPE invoice_status AS ENUM (
    'draft', 'submitted', 'under_review', 'approved', 'rejected',
    'paid', 'partially_paid', 'overdue', 'cancelled', 'disputed'
);

-- Payment status enum  
CREATE TYPE payment_status AS ENUM (
    'pending', 'scheduled', 'processing', 'paid', 'partially_paid',
    'failed', 'cancelled', 'overdue', 'refunded'
);

-- Three-way match status enum
CREATE TYPE three_way_match_status AS ENUM (
    'not_started', 'in_progress', 'matched', 'exceptions', 
    'failed', 'manual_review', 'approved_with_exceptions'
);

-- General ledger account types
CREATE TYPE gl_account_type AS ENUM (
    'asset', 'liability', 'equity', 'revenue', 'expense'
);

-- Payment method enum
CREATE TYPE payment_method AS ENUM (
    'bank_transfer', 'credit_card', 'cheque', 'cash', 'eft', 'stop_order', 'debit_order'
);

-- Account reconciliation status
CREATE TYPE reconciliation_status AS ENUM (
    'unreconciled', 'reconciled', 'pending_review', 'disputed', 'adjusted'
);

-- =====================================================
-- INVOICE MANAGEMENT SYSTEM
-- =====================================================

-- Main invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    purchase_order_id UUID REFERENCES purchase_orders_enhanced(id) ON DELETE SET NULL,
    
    -- Invoice Identification
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_invoice_number VARCHAR(100) NOT NULL,
    reference_number VARCHAR(100),
    
    -- Invoice Details
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    received_date DATE DEFAULT CURRENT_DATE,
    processed_date DATE,
    paid_date DATE,
    
    -- Financial Information
    currency VARCHAR(3) DEFAULT 'ZAR',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    other_charges DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    
    -- Payment Terms
    payment_terms VARCHAR(100) NOT NULL,
    early_payment_discount_percentage DECIMAL(5,2) DEFAULT 0,
    early_payment_days INTEGER DEFAULT 0,
    early_payment_eligible_until DATE,
    
    -- Status and Workflow
    status invoice_status DEFAULT 'submitted',
    approval_status VARCHAR(50) DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    three_way_match_status three_way_match_status DEFAULT 'not_started',
    
    -- Approval Information
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    -- Processing Information
    processed_by VARCHAR(255),
    processing_notes TEXT,
    
    -- OCR and Document Processing
    ocr_processed BOOLEAN DEFAULT FALSE,
    ocr_confidence DECIMAL(5,2),
    extracted_data JSONB,
    manual_review_required BOOLEAN DEFAULT FALSE,
    
    -- Dispute Management
    disputed BOOLEAN DEFAULT FALSE,
    dispute_reason TEXT,
    dispute_date DATE,
    dispute_resolved_date DATE,
    dispute_resolution_notes TEXT,
    
    -- Compliance and Tax
    tax_compliant BOOLEAN DEFAULT TRUE,
    tax_certificate_number VARCHAR(100),
    withholding_tax_percentage DECIMAL(5,2) DEFAULT 0,
    withholding_tax_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Quality and Matching
    matching_exceptions JSONB,
    quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
    validation_errors JSONB,
    
    -- Additional Information
    description TEXT,
    notes TEXT,
    internal_notes TEXT,
    document_urls TEXT[],
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    -- Validation Constraints
    CONSTRAINT invoice_amount_positive CHECK (total_amount >= 0),
    CONSTRAINT invoice_paid_not_exceed_total CHECK (paid_amount <= total_amount),
    CONSTRAINT invoice_date_logic CHECK (
        due_date >= invoice_date AND
        (processed_date IS NULL OR processed_date >= received_date) AND
        (paid_date IS NULL OR paid_date >= invoice_date)
    ),
    CONSTRAINT invoice_subtotal_calc CHECK (
        total_amount = subtotal + tax_amount + shipping_amount + other_charges - discount_amount
    ),
    CONSTRAINT invoice_early_payment_logic CHECK (
        (early_payment_discount_percentage = 0 AND early_payment_days = 0) OR
        (early_payment_discount_percentage > 0 AND early_payment_days > 0)
    )
);

-- =====================================================
-- INVOICE LINE ITEMS
-- =====================================================

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    purchase_order_item_id UUID REFERENCES purchase_order_items_enhanced(id) ON DELETE SET NULL,
    
    -- Line Item Details
    line_number INTEGER NOT NULL,
    product_code VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    specifications TEXT,
    
    -- Quantities and Units
    quantity DECIMAL(12,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    
    -- Pricing Information
    unit_price DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 15.0,
    tax_amount DECIMAL(15,2) NOT NULL,
    
    -- Accounting Information
    account_code VARCHAR(50),
    cost_center VARCHAR(50),
    project_code VARCHAR(50),
    budget_code VARCHAR(50),
    
    -- Matching Information
    matched_to_po BOOLEAN DEFAULT FALSE,
    matched_to_receipt BOOLEAN DEFAULT FALSE,
    po_variance_amount DECIMAL(15,2) DEFAULT 0,
    po_variance_percentage DECIMAL(5,2) DEFAULT 0,
    receipt_variance_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Quality and Compliance
    quality_approved BOOLEAN DEFAULT TRUE,
    compliance_approved BOOLEAN DEFAULT TRUE,
    exception_notes TEXT,
    
    -- Additional Information
    delivery_date DATE,
    warranty_period VARCHAR(50),
    serial_numbers TEXT[],
    batch_numbers TEXT[],
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(invoice_id, line_number),
    CONSTRAINT ili_quantity_positive CHECK (quantity > 0),
    CONSTRAINT ili_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT ili_line_total_calc CHECK (
        line_total = (quantity * unit_price) - discount_amount + tax_amount
    ),
    CONSTRAINT ili_variance_reasonable CHECK (
        ABS(po_variance_percentage) <= 100 AND
        ABS(receipt_variance_amount) <= line_total
    )
);

-- =====================================================
-- PAYMENT MANAGEMENT SYSTEM
-- =====================================================

-- Payment records table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    
    -- Payment Identification
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    reference_number VARCHAR(100),
    transaction_id VARCHAR(100),
    
    -- Payment Details
    payment_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    
    -- Payment Method and Processing
    payment_method payment_method NOT NULL,
    bank_account VARCHAR(100),
    account_holder VARCHAR(255),
    routing_details JSONB,
    
    -- Status and Processing
    status payment_status DEFAULT 'pending',
    processed_at TIMESTAMP,
    processed_by VARCHAR(255),
    confirmation_number VARCHAR(100),
    
    -- Bank Information
    bank_name VARCHAR(255),
    bank_branch VARCHAR(255),
    bank_reference VARCHAR(100),
    clearing_date DATE,
    
    -- Discount and Penalties
    early_payment_discount DECIMAL(15,2) DEFAULT 0,
    late_payment_penalty DECIMAL(15,2) DEFAULT 0,
    withholding_tax DECIMAL(15,2) DEFAULT 0,
    
    -- Approval and Authorization
    authorized_by VARCHAR(255),
    authorized_at TIMESTAMP,
    authorization_limit DECIMAL(15,2),
    dual_authorization_required BOOLEAN DEFAULT FALSE,
    second_authorizer VARCHAR(255),
    second_authorized_at TIMESTAMP,
    
    -- Reconciliation
    reconciliation_status reconciliation_status DEFAULT 'unreconciled',
    reconciled_at TIMESTAMP,
    reconciled_by VARCHAR(255),
    bank_statement_date DATE,
    bank_statement_reference VARCHAR(100),
    
    -- Additional Information
    description TEXT,
    notes TEXT,
    attachments TEXT[],
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    -- Validation Constraints
    CONSTRAINT payment_amount_positive CHECK (amount > 0),
    CONSTRAINT payment_date_logic CHECK (payment_date <= clearing_date OR clearing_date IS NULL),
    CONSTRAINT payment_authorization_logic CHECK (
        (authorized_by IS NULL AND authorized_at IS NULL) OR
        (authorized_by IS NOT NULL AND authorized_at IS NOT NULL)
    ),
    CONSTRAINT payment_dual_auth_logic CHECK (
        NOT dual_authorization_required OR 
        (second_authorizer IS NOT NULL AND second_authorized_at IS NOT NULL)
    )
);

-- =====================================================
-- ACCOUNTS PAYABLE SYSTEM
-- =====================================================

-- Accounts payable entries
CREATE TABLE accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- AP Entry Details
    ap_number VARCHAR(100) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    gl_account_code VARCHAR(50) NOT NULL,
    
    -- Financial Information
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) GENERATED ALWAYS AS (debit_amount - credit_amount) STORED,
    currency VARCHAR(3) DEFAULT 'ZAR',
    
    -- Aging Information
    days_outstanding INTEGER GENERATED ALWAYS AS (
        CASE WHEN status = 'paid' THEN 0
        ELSE EXTRACT(days FROM CURRENT_DATE - transaction_date)
        END
    ) STORED,
    aging_bucket VARCHAR(20) GENERATED ALWAYS AS (
        CASE
        WHEN status = 'paid' THEN 'paid'
        WHEN days_outstanding <= 30 THEN '0-30'
        WHEN days_outstanding <= 60 THEN '31-60'
        WHEN days_outstanding <= 90 THEN '61-90'
        ELSE '90+'
        END
    ) STORED,
    
    -- Status and Processing
    status payment_status DEFAULT 'pending',
    reconciled BOOLEAN DEFAULT FALSE,
    reconciled_at TIMESTAMP,
    reconciled_by VARCHAR(255),
    
    -- Additional Information
    description TEXT,
    notes TEXT,
    cost_center VARCHAR(50),
    project_code VARCHAR(50),
    budget_code VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    -- Validation Constraints
    CONSTRAINT ap_amounts_valid CHECK (
        debit_amount >= 0 AND credit_amount >= 0 AND
        NOT (debit_amount = 0 AND credit_amount = 0)
    ),
    CONSTRAINT ap_reconciliation_logic CHECK (
        (reconciled = FALSE AND reconciled_at IS NULL AND reconciled_by IS NULL) OR
        (reconciled = TRUE AND reconciled_at IS NOT NULL AND reconciled_by IS NOT NULL)
    )
);

-- =====================================================
-- GENERAL LEDGER SYSTEM
-- =====================================================

-- Chart of accounts
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    
    -- Account Information
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type gl_account_type NOT NULL,
    parent_account_code VARCHAR(50),
    
    -- Account Configuration
    is_active BOOLEAN DEFAULT TRUE,
    requires_cost_center BOOLEAN DEFAULT FALSE,
    requires_project BOOLEAN DEFAULT FALSE,
    allow_manual_posting BOOLEAN DEFAULT TRUE,
    
    -- Financial Information
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    current_balance DECIMAL(15,2) DEFAULT 0,
    ytd_balance DECIMAL(15,2) DEFAULT 0,
    
    -- Reporting and Classification
    financial_statement_category VARCHAR(100),
    tax_reporting_category VARCHAR(100),
    consolidation_account VARCHAR(50),
    
    -- Additional Information
    description TEXT,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    FOREIGN KEY (parent_account_code) REFERENCES chart_of_accounts(account_code) DEFERRABLE
);

-- General ledger entries
CREATE TABLE general_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    
    -- Entry Identification
    entry_number VARCHAR(100) UNIQUE NOT NULL,
    journal_type VARCHAR(50) NOT NULL DEFAULT 'AP',
    reference_number VARCHAR(100),
    source_document_type VARCHAR(50),
    source_document_id UUID,
    
    -- Entry Details
    transaction_date DATE NOT NULL,
    posting_date DATE DEFAULT CURRENT_DATE,
    period VARCHAR(10) NOT NULL, -- YYYY-MM format
    fiscal_year INTEGER NOT NULL,
    
    -- Financial Information
    total_debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'ZAR',
    
    -- Status and Processing
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'posted', 'reversed', 'adjusted', 'closed'
    )),
    posted_by VARCHAR(255),
    posted_at TIMESTAMP,
    reversed_by VARCHAR(255),
    reversed_at TIMESTAMP,
    reversal_reason TEXT,
    
    -- Additional Information
    description TEXT NOT NULL,
    notes TEXT,
    batch_id VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    -- Validation Constraints
    CONSTRAINT gl_entry_balanced CHECK (total_debit_amount = total_credit_amount),
    CONSTRAINT gl_period_format CHECK (period ~ '^\d{4}-\d{2}$'),
    CONSTRAINT gl_posting_logic CHECK (
        (status = 'draft' AND posted_at IS NULL) OR
        (status != 'draft' AND posted_at IS NOT NULL)
    )
);

-- General ledger line details
CREATE TABLE general_ledger_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gl_entry_id UUID NOT NULL REFERENCES general_ledger_entries(id) ON DELETE CASCADE,
    
    -- Line Details
    line_number INTEGER NOT NULL,
    account_code VARCHAR(50) NOT NULL REFERENCES chart_of_accounts(account_code),
    
    -- Financial Information
    debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'ZAR',
    
    -- Cost Accounting
    cost_center VARCHAR(50),
    project_code VARCHAR(50),
    budget_code VARCHAR(50),
    department VARCHAR(100),
    
    -- Reference Information
    supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    purchase_order_id UUID REFERENCES purchase_orders_enhanced(id) ON DELETE SET NULL,
    
    -- Additional Information
    description TEXT,
    reference VARCHAR(255),
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(gl_entry_id, line_number),
    CONSTRAINT gl_line_amounts_valid CHECK (
        debit_amount >= 0 AND credit_amount >= 0 AND
        NOT (debit_amount = 0 AND credit_amount = 0) AND
        NOT (debit_amount > 0 AND credit_amount > 0)
    )
);

-- =====================================================
-- PAYMENT ALLOCATION SYSTEM
-- =====================================================

-- Payment allocations (for partial payments across multiple invoices)
CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Allocation Details
    allocated_amount DECIMAL(15,2) NOT NULL,
    allocation_percentage DECIMAL(5,2),
    allocation_date DATE DEFAULT CURRENT_DATE,
    
    -- Discount Applied
    early_payment_discount_applied DECIMAL(15,2) DEFAULT 0,
    withholding_tax_applied DECIMAL(15,2) DEFAULT 0,
    
    -- Additional Information
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    
    -- Constraints
    CONSTRAINT pa_amount_positive CHECK (allocated_amount > 0),
    CONSTRAINT pa_percentage_valid CHECK (
        allocation_percentage IS NULL OR 
        (allocation_percentage >= 0 AND allocation_percentage <= 100)
    )
);

-- =====================================================
-- THREE-WAY MATCHING SYSTEM
-- =====================================================

-- Three-way matching records
CREATE TABLE three_way_matching (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    purchase_order_id UUID REFERENCES purchase_orders_enhanced(id) ON DELETE SET NULL,
    receipt_id UUID REFERENCES purchase_order_receipts(id) ON DELETE SET NULL,
    
    -- Matching Details
    matching_date TIMESTAMP DEFAULT NOW(),
    status three_way_match_status DEFAULT 'in_progress',
    
    -- Matching Results
    price_match_status VARCHAR(20) DEFAULT 'pending',
    quantity_match_status VARCHAR(20) DEFAULT 'pending',
    terms_match_status VARCHAR(20) DEFAULT 'pending',
    
    -- Variance Analysis
    total_price_variance DECIMAL(15,2) DEFAULT 0,
    total_quantity_variance DECIMAL(12,3) DEFAULT 0,
    variance_percentage DECIMAL(5,2) DEFAULT 0,
    variance_tolerance_exceeded BOOLEAN DEFAULT FALSE,
    
    -- Exception Management
    exceptions_count INTEGER DEFAULT 0,
    critical_exceptions INTEGER DEFAULT 0,
    exception_details JSONB,
    
    -- Approval and Resolution
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    resolution_notes TEXT,
    
    -- Performance Metrics
    matching_confidence_score DECIMAL(5,2),
    manual_review_required BOOLEAN DEFAULT FALSE,
    auto_matched BOOLEAN DEFAULT FALSE,
    
    -- Additional Information
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    -- Constraints
    CONSTRAINT twm_variance_reasonable CHECK (
        ABS(variance_percentage) <= 100
    )
);

-- Three-way matching exceptions
CREATE TABLE matching_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    three_way_match_id UUID NOT NULL REFERENCES three_way_matching(id) ON DELETE CASCADE,
    invoice_line_id UUID REFERENCES invoice_line_items(id) ON DELETE SET NULL,
    
    -- Exception Details
    exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN (
        'price_variance', 'quantity_variance', 'missing_receipt', 'missing_po',
        'tax_mismatch', 'description_mismatch', 'delivery_date_variance',
        'supplier_mismatch', 'duplicate_invoice', 'currency_mismatch'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Variance Information
    field_name VARCHAR(100),
    expected_value TEXT,
    actual_value TEXT,
    variance_amount DECIMAL(15,2),
    variance_percentage DECIMAL(5,2),
    tolerance_limit DECIMAL(5,2),
    
    -- Resolution
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN (
        'open', 'investigating', 'resolved', 'escalated', 'approved', 'rejected'
    )),
    assigned_to VARCHAR(255),
    resolution_action TEXT,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    
    -- Additional Information
    description TEXT NOT NULL,
    suggested_action TEXT,
    business_impact TEXT,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT me_variance_reasonable CHECK (
        variance_percentage IS NULL OR ABS(variance_percentage) <= 1000
    )
);

-- =====================================================
-- FINANCIAL REPORTING TABLES
-- =====================================================

-- Supplier aging report data
CREATE TABLE supplier_aging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    
    -- Aging Period
    as_of_date DATE NOT NULL,
    
    -- Aging Buckets
    current_amount DECIMAL(15,2) DEFAULT 0,           -- 0-30 days
    days_31_60 DECIMAL(15,2) DEFAULT 0,               -- 31-60 days
    days_61_90 DECIMAL(15,2) DEFAULT 0,               -- 61-90 days
    days_over_90 DECIMAL(15,2) DEFAULT 0,             -- 90+ days
    total_outstanding DECIMAL(15,2) GENERATED ALWAYS AS (
        current_amount + days_31_60 + days_61_90 + days_over_90
    ) STORED,
    
    -- Credit Information
    credit_limit DECIMAL(15,2),
    available_credit DECIMAL(15,2),
    
    -- Additional Metrics
    average_payment_days DECIMAL(5,1),
    payment_history_score INTEGER CHECK (payment_history_score BETWEEN 0 AND 100),
    risk_classification VARCHAR(20) DEFAULT 'low',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(org_id, supplier_id, as_of_date),
    CONSTRAINT sa_amounts_non_negative CHECK (
        current_amount >= 0 AND days_31_60 >= 0 AND 
        days_61_90 >= 0 AND days_over_90 >= 0
    )
);

-- =====================================================
-- TAX MANAGEMENT SYSTEM
-- =====================================================

-- Tax configuration
CREATE TABLE tax_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    
    -- Tax Details
    tax_code VARCHAR(20) UNIQUE NOT NULL,
    tax_name VARCHAR(100) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    
    -- Tax Classification
    tax_type VARCHAR(50) NOT NULL CHECK (tax_type IN (
        'vat', 'sales_tax', 'withholding_tax', 'import_duty', 'excise_tax'
    )),
    jurisdiction VARCHAR(100) DEFAULT 'South Africa',
    
    -- Effective Periods
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- Configuration
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    calculation_method VARCHAR(50) DEFAULT 'percentage',
    
    -- GL Account Mapping
    tax_payable_account VARCHAR(50),
    tax_expense_account VARCHAR(50),
    
    -- Additional Information
    description TEXT,
    regulatory_reference VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tax_rate_valid CHECK (tax_rate >= 0 AND tax_rate <= 100),
    CONSTRAINT tax_effective_period CHECK (
        effective_to IS NULL OR effective_to > effective_from
    )
);

-- =====================================================
-- AUDIT AND COMPLIANCE SYSTEM
-- =====================================================

-- Invoice audit trail
CREATE TABLE invoice_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Event Information
    timestamp TIMESTAMP DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(100),
    
    -- Change Details
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    
    -- System Information
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    system_source VARCHAR(100),
    
    -- Additional Context
    business_context TEXT,
    impact_assessment TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Invoice indexes
CREATE INDEX idx_invoices_org_id ON invoices(org_id);
CREATE INDEX idx_invoices_supplier_id ON invoices(supplier_id);
CREATE INDEX idx_invoices_po_id ON invoices(purchase_order_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_supplier_number ON invoices(supplier_invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_total_amount ON invoices(total_amount);
CREATE INDEX idx_invoices_overdue ON invoices(due_date, payment_status) 
    WHERE payment_status != 'paid' AND due_date < CURRENT_DATE;

-- Payment indexes
CREATE INDEX idx_payments_org_id ON payments(org_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX idx_payments_number ON payments(payment_number);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_amount ON payments(amount);

-- Accounts payable indexes
CREATE INDEX idx_ap_org_id ON accounts_payable(org_id);
CREATE INDEX idx_ap_supplier_id ON accounts_payable(supplier_id);
CREATE INDEX idx_ap_invoice_id ON accounts_payable(invoice_id);
CREATE INDEX idx_ap_account_code ON accounts_payable(gl_account_code);
CREATE INDEX idx_ap_status ON accounts_payable(status);
CREATE INDEX idx_ap_aging ON accounts_payable(aging_bucket, total_outstanding);

-- General ledger indexes
CREATE INDEX idx_gl_entries_org_id ON general_ledger_entries(org_id);
CREATE INDEX idx_gl_entries_period ON general_ledger_entries(period);
CREATE INDEX idx_gl_entries_fiscal_year ON general_ledger_entries(fiscal_year);
CREATE INDEX idx_gl_entries_transaction_date ON general_ledger_entries(transaction_date);
CREATE INDEX idx_gl_entries_status ON general_ledger_entries(status);
CREATE INDEX idx_gl_lines_entry_id ON general_ledger_lines(gl_entry_id);
CREATE INDEX idx_gl_lines_account_code ON general_ledger_lines(account_code);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function to auto-calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate totals from line items
    SELECT 
        COALESCE(SUM(line_total - tax_amount), 0),
        COALESCE(SUM(tax_amount), 0),
        COALESCE(SUM(line_total), 0)
    INTO 
        NEW.subtotal,
        NEW.tax_amount,
        NEW.total_amount
    FROM invoice_line_items 
    WHERE invoice_id = NEW.id;
    
    -- Add shipping and other charges, subtract discounts
    NEW.total_amount = NEW.subtotal + NEW.tax_amount + NEW.shipping_amount + NEW.other_charges - NEW.discount_amount;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update payment status based on payments
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(15,2);
    invoice_total DECIMAL(15,2);
BEGIN
    -- Calculate total payments for this invoice
    SELECT 
        COALESCE(SUM(pa.allocated_amount), 0),
        i.total_amount
    INTO total_paid, invoice_total
    FROM invoices i
    LEFT JOIN payment_allocations pa ON i.id = pa.invoice_id
    LEFT JOIN payments p ON pa.payment_id = p.id
    WHERE i.id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        AND (p.status = 'paid' OR p.status IS NULL)
    GROUP BY i.total_amount;
    
    -- Update invoice payment status
    UPDATE invoices 
    SET 
        paid_amount = COALESCE(total_paid, 0),
        payment_status = CASE
            WHEN COALESCE(total_paid, 0) = 0 THEN 'pending'::payment_status
            WHEN COALESCE(total_paid, 0) >= invoice_total THEN 'paid'::payment_status
            ELSE 'partially_paid'::payment_status
        END,
        status = CASE
            WHEN COALESCE(total_paid, 0) >= invoice_total THEN 'paid'::invoice_status
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update GL account balances
CREATE OR REPLACE FUNCTION update_gl_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update account balance for new/updated lines
        UPDATE chart_of_accounts 
        SET current_balance = current_balance + (NEW.debit_amount - NEW.credit_amount)
        WHERE account_code = NEW.account_code;
    END IF;
    
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        -- Reverse old balance for updated/deleted lines
        UPDATE chart_of_accounts 
        SET current_balance = current_balance - (OLD.debit_amount - OLD.credit_amount)
        WHERE account_code = OLD.account_code;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- APPLY TRIGGERS
-- =====================================================

-- Invoice total calculation trigger
CREATE TRIGGER calculate_invoice_totals_trigger
    BEFORE INSERT OR UPDATE ON invoices
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_invoice_totals();

-- Payment status update trigger
CREATE TRIGGER update_invoice_payment_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
    FOR EACH ROW 
    EXECUTE FUNCTION update_invoice_payment_status();

-- GL balance update trigger
CREATE TRIGGER update_gl_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON general_ledger_lines
    FOR EACH ROW 
    EXECUTE FUNCTION update_gl_account_balance();

-- Updated timestamp triggers
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at
    BEFORE UPDATE ON accounts_payable
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT CHART OF ACCOUNTS SETUP
-- =====================================================

INSERT INTO chart_of_accounts (org_id, account_code, account_name, account_type, normal_balance, financial_statement_category) VALUES
('00000000-0000-0000-0000-000000000001', '2000', 'Accounts Payable', 'liability', 'credit', 'Current Liabilities'),
('00000000-0000-0000-0000-000000000001', '2100', 'VAT Payable', 'liability', 'credit', 'Current Liabilities'),
('00000000-0000-0000-0000-000000000001', '2110', 'Withholding Tax Payable', 'liability', 'credit', 'Current Liabilities'),
('00000000-0000-0000-0000-000000000001', '5000', 'Cost of Goods Sold', 'expense', 'debit', 'Cost of Sales'),
('00000000-0000-0000-0000-000000000001', '5100', 'Raw Materials', 'expense', 'debit', 'Cost of Sales'),
('00000000-0000-0000-0000-000000000001', '5200', 'Equipment Purchases', 'expense', 'debit', 'Operating Expenses'),
('00000000-0000-0000-0000-000000000001', '5300', 'Maintenance Supplies', 'expense', 'debit', 'Operating Expenses'),
('00000000-0000-0000-0000-000000000001', '5400', 'Office Supplies', 'expense', 'debit', 'Operating Expenses'),
('00000000-0000-0000-0000-000000000001', '5500', 'Professional Services', 'expense', 'debit', 'Operating Expenses'),
('00000000-0000-0000-0000-000000000001', '6000', 'Freight and Shipping', 'expense', 'debit', 'Operating Expenses'),
('00000000-0000-0000-0000-000000000001', '1500', 'Inventory - Raw Materials', 'asset', 'debit', 'Current Assets'),
('00000000-0000-0000-0000-000000000001', '1510', 'Inventory - Components', 'asset', 'debit', 'Current Assets'),
('00000000-0000-0000-0000-000000000001', '1520', 'Inventory - Finished Goods', 'asset', 'debit', 'Current Assets'),
('00000000-0000-0000-0000-000000000001', '1700', 'Equipment and Machinery', 'asset', 'debit', 'Fixed Assets'),
('00000000-0000-0000-0000-000000000001', '7000', 'Early Payment Discounts', 'revenue', 'credit', 'Other Income');

-- =====================================================
-- DEFAULT TAX CONFIGURATIONS
-- =====================================================

INSERT INTO tax_configurations (org_id, tax_code, tax_name, tax_rate, tax_type, effective_from, is_default, tax_payable_account) VALUES
('00000000-0000-0000-0000-000000000001', 'VAT15', 'Value Added Tax (15%)', 15.0, 'vat', '2024-01-01', true, '2100'),
('00000000-0000-0000-0000-000000000001', 'VAT0', 'Zero-Rated VAT', 0.0, 'vat', '2024-01-01', false, '2100'),
('00000000-0000-0000-0000-000000000001', 'WHT5', 'Withholding Tax (5%)', 5.0, 'withholding_tax', '2024-01-01', false, '2110');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 
    '🎉 INVOICE & FINANCIAL SCHEMA COMPLETE!' as message,
    'Comprehensive invoice management with three-way matching' as feature_1,
    'Complete accounts payable and general ledger system' as feature_2,
    'Payment tracking, tax management, and financial reporting' as feature_3,
    'Audit trails, compliance checks, and performance metrics' as feature_4,
    'Ready for Agent 5 invoice and financial data generation' as status;