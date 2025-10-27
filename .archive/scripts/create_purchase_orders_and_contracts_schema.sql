-- =====================================================
-- PURCHASE ORDER & CONTRACT MANAGEMENT SCHEMA
-- Agent 4 - MantisNXT Purchase Order & Contract System
-- =====================================================
-- Comprehensive schema for purchase orders, contracts, and approval workflows
-- Compatible with existing supplier and inventory data from Agent 3

-- =====================================================
-- ENABLE REQUIRED EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENHANCED PURCHASE ORDER SYSTEM
-- =====================================================

-- Enhanced purchase order table (if not exists from migration)
CREATE TABLE IF NOT EXISTS purchase_orders_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
    
    -- Purchase Order Information
    po_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Requester Information
    requested_by VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    budget_code VARCHAR(100),
    cost_center VARCHAR(100),
    
    -- Financial Information
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'ZAR',
    
    -- Dates and Delivery
    order_date DATE DEFAULT CURRENT_DATE,
    requested_delivery_date DATE NOT NULL,
    confirmed_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Delivery Information
    delivery_location TEXT NOT NULL,
    delivery_instructions TEXT,
    special_requirements TEXT,
    payment_terms VARCHAR(100) NOT NULL,
    
    -- Status and Workflow
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'sent', 'acknowledged',
        'in_progress', 'shipped', 'partially_received', 'received', 'completed', 
        'cancelled', 'on_hold', 'disputed'
    )),
    workflow_status VARCHAR(50) DEFAULT 'pending_approval',
    
    -- Approval Information
    approval_level_required INTEGER DEFAULT 1,
    current_approval_level INTEGER DEFAULT 0,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    sent_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    
    -- Shipping and Tracking
    tracking_number VARCHAR(255),
    carrier VARCHAR(255),
    shipping_method VARCHAR(100),
    
    -- Risk and Compliance
    risk_score INTEGER DEFAULT 0,
    compliance_checked BOOLEAN DEFAULT FALSE,
    environmental_impact VARCHAR(50),
    three_way_match_status VARCHAR(50) DEFAULT 'pending' CHECK (three_way_match_status IN (
        'pending', 'matched', 'exceptions', 'manual_review', 'resolved'
    )),
    
    -- Quality and Inspection
    inspection_required BOOLEAN DEFAULT FALSE,
    quality_requirements JSONB,
    
    -- Additional Information
    notes TEXT,
    internal_notes TEXT,
    terms_and_conditions TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    version INTEGER DEFAULT 1,
    
    -- Validation Constraints
    CONSTRAINT po_amount_consistency CHECK (
        total_amount = subtotal + tax_amount + shipping_amount - discount_amount
    ),
    CONSTRAINT po_date_logic CHECK (
        requested_delivery_date >= order_date AND
        (confirmed_delivery_date IS NULL OR confirmed_delivery_date >= order_date) AND
        (actual_delivery_date IS NULL OR actual_delivery_date >= order_date)
    ),
    CONSTRAINT po_approval_consistency CHECK (
        (approved_by IS NULL AND approved_at IS NULL) OR
        (approved_by IS NOT NULL AND approved_at IS NOT NULL)
    )
);

-- =====================================================
-- ENHANCED PURCHASE ORDER ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_order_items_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders_enhanced(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    -- Product Information
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    specifications TEXT,
    manufacturer VARCHAR(255),
    model_number VARCHAR(100),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    
    -- Quantities and Units
    quantity DECIMAL(12,3) NOT NULL,
    received_quantity DECIMAL(12,3) DEFAULT 0,
    accepted_quantity DECIMAL(12,3) DEFAULT 0,
    rejected_quantity DECIMAL(12,3) DEFAULT 0,
    remaining_quantity DECIMAL(12,3),
    unit VARCHAR(20) NOT NULL,
    
    -- Pricing Information
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 15,
    
    -- Delivery Information
    requested_date DATE NOT NULL,
    confirmed_date DATE,
    actual_delivery_date DATE,
    partial_deliveries_allowed BOOLEAN DEFAULT TRUE,
    
    -- Status and Tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'in_production', 'shipped', 
        'partially_received', 'received', 'inspected', 'accepted', 
        'rejected', 'cancelled'
    )),
    
    -- Quality and Compliance
    quality_requirements JSONB,
    inspection_required BOOLEAN DEFAULT FALSE,
    compliance_certifications TEXT[],
    quality_grade VARCHAR(10),
    
    -- Additional Information
    warranty_period VARCHAR(50),
    return_policy TEXT,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(purchase_order_id, line_number),
    CONSTRAINT poi_quantity_positive CHECK (quantity > 0),
    CONSTRAINT poi_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT poi_total_price_calc CHECK (total_price = quantity * unit_price),
    CONSTRAINT poi_received_quantities CHECK (
        received_quantity >= 0 AND
        accepted_quantity >= 0 AND
        rejected_quantity >= 0 AND
        received_quantity = accepted_quantity + rejected_quantity
    ),
    CONSTRAINT poi_delivery_date_logic CHECK (
        (confirmed_date IS NULL OR confirmed_date >= requested_date) AND
        (actual_delivery_date IS NULL OR actual_delivery_date >= requested_date)
    )
);

-- =====================================================
-- CONTRACT MANAGEMENT SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    
    -- Contract Identification
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    contract_type VARCHAR(50) NOT NULL DEFAULT 'standard' CHECK (contract_type IN (
        'standard', 'framework', 'strategic_partnership', 'preferred_supplier',
        'exclusive', 'spot_purchase', 'blanket_order', 'master_agreement'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Contract Duration
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renewal BOOLEAN DEFAULT FALSE,
    renewal_period INTEGER, -- in months
    renewal_terms TEXT,
    termination_notice_days INTEGER DEFAULT 30,
    
    -- Financial Terms
    total_contract_value DECIMAL(15,2),
    minimum_spend DECIMAL(15,2),
    maximum_spend DECIMAL(15,2),
    spend_to_date DECIMAL(15,2) DEFAULT 0,
    payment_terms VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'ZAR',
    price_adjustment_mechanism TEXT,
    volume_discounts JSONB,
    
    -- Service Level Agreements
    delivery_sla_days INTEGER,
    quality_sla_percentage DECIMAL(5,2) DEFAULT 98.0,
    response_time_hours INTEGER DEFAULT 24,
    availability_percentage DECIMAL(5,2) DEFAULT 99.0,
    
    -- Quality and Compliance
    quality_requirements JSONB,
    compliance_requirements TEXT[],
    performance_metrics JSONB,
    kpi_targets JSONB,
    penalties JSONB,
    incentives JSONB,
    
    -- Legal and Governance
    governing_law VARCHAR(100) DEFAULT 'South African Law',
    jurisdiction VARCHAR(100) DEFAULT 'South African Courts',
    dispute_resolution VARCHAR(100) DEFAULT 'Arbitration',
    confidentiality_clause BOOLEAN DEFAULT TRUE,
    intellectual_property_terms TEXT,
    liability_cap DECIMAL(15,2),
    insurance_requirements TEXT,
    
    -- Risk Management
    force_majeure_clause BOOLEAN DEFAULT TRUE,
    business_continuity_plan TEXT,
    disaster_recovery_requirements TEXT,
    security_requirements JSONB,
    
    -- Status and Approval
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'under_review', 'legal_review', 'approved', 'signed',
        'active', 'suspended', 'under_amendment', 'terminated', 'expired'
    )),
    approval_workflow JSONB,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    signed_date DATE,
    signatory_supplier VARCHAR(255),
    signatory_company VARCHAR(255),
    
    -- Performance Tracking
    performance_score DECIMAL(5,2),
    last_performance_review DATE,
    next_review_date DATE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    -- Validation Constraints
    CONSTRAINT contract_date_range CHECK (end_date > start_date),
    CONSTRAINT contract_value_positive CHECK (
        total_contract_value IS NULL OR total_contract_value > 0
    ),
    CONSTRAINT contract_spend_range CHECK (
        minimum_spend IS NULL OR maximum_spend IS NULL OR minimum_spend <= maximum_spend
    ),
    CONSTRAINT contract_spend_tracking CHECK (spend_to_date >= 0),
    CONSTRAINT contract_performance_score CHECK (
        performance_score IS NULL OR (performance_score >= 0 AND performance_score <= 100)
    )
);

-- =====================================================
-- CONTRACT AMENDMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS contract_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
    
    -- Amendment Details
    amendment_number INTEGER NOT NULL,
    amendment_type VARCHAR(50) NOT NULL CHECK (amendment_type IN (
        'value_change', 'term_extension', 'scope_change', 'price_adjustment',
        'sla_modification', 'address_change', 'contact_update', 'other'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    justification TEXT,
    
    -- Change Details
    effective_date DATE NOT NULL,
    old_value JSONB,
    new_value JSONB,
    financial_impact DECIMAL(15,2),
    
    -- Approval and Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'rejected', 'implemented'
    )),
    requested_by VARCHAR(255) NOT NULL,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    implemented_at TIMESTAMP,
    
    -- Legal Review
    legal_review_required BOOLEAN DEFAULT FALSE,
    legal_reviewer VARCHAR(255),
    legal_review_date TIMESTAMP,
    legal_comments TEXT,
    
    -- Documentation
    supporting_documents TEXT[],
    amendment_document_path TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(contract_id, amendment_number),
    CONSTRAINT amendment_effective_date_logic CHECK (effective_date >= CURRENT_DATE - INTERVAL '1 year')
);

-- =====================================================
-- PURCHASE ORDER APPROVAL WORKFLOW
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_order_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders_enhanced(id) ON DELETE CASCADE,
    
    -- Approval Step
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    approver_role VARCHAR(100) NOT NULL,
    approver_name VARCHAR(255) NOT NULL,
    approver_email VARCHAR(255),
    
    -- Approval Thresholds
    approval_threshold DECIMAL(15,2),
    required BOOLEAN DEFAULT TRUE,
    can_delegate BOOLEAN DEFAULT TRUE,
    
    -- Status and Timing
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'delegated', 'skipped', 'expired'
    )),
    approved_at TIMESTAMP,
    response_deadline TIMESTAMP,
    escalation_date TIMESTAMP,
    escalated_to VARCHAR(255),
    
    -- Delegation
    delegated_to VARCHAR(255),
    delegated_at TIMESTAMP,
    delegation_reason TEXT,
    
    -- Decision Information
    decision_notes TEXT,
    conditions TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(purchase_order_id, step_number),
    CONSTRAINT approval_threshold_positive CHECK (
        approval_threshold IS NULL OR approval_threshold >= 0
    )
);

-- =====================================================
-- PURCHASE ORDER RECEIPTS AND INSPECTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_order_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders_enhanced(id) ON DELETE CASCADE,
    
    -- Receipt Information
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    receipt_type VARCHAR(50) DEFAULT 'full' CHECK (receipt_type IN ('partial', 'full', 'final')),
    received_date TIMESTAMP NOT NULL,
    received_by VARCHAR(255) NOT NULL,
    
    -- Location and Handling
    receiving_location VARCHAR(255),
    warehouse_location VARCHAR(255),
    handling_instructions TEXT,
    
    -- Quality Control
    inspection_status VARCHAR(50) DEFAULT 'pending' CHECK (inspection_status IN (
        'pending', 'in_progress', 'passed', 'failed', 'conditional', 'waived'
    )),
    inspector_name VARCHAR(255),
    inspection_date TIMESTAMP,
    inspection_duration_minutes INTEGER,
    overall_quality_score INTEGER CHECK (overall_quality_score BETWEEN 0 AND 100),
    
    -- Certification and Documentation
    certificate_number VARCHAR(100),
    certification_authority VARCHAR(255),
    documentation_complete BOOLEAN DEFAULT FALSE,
    
    -- Financial Reconciliation
    invoice_received BOOLEAN DEFAULT FALSE,
    invoice_number VARCHAR(100),
    invoice_amount DECIMAL(15,2),
    amount_variance DECIMAL(15,2),
    variance_explanation TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN (
        'draft', 'completed', 'disputed', 'rejected'
    )),
    
    -- Additional Information
    damage_report TEXT,
    discrepancy_notes TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- RECEIPT LINE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_order_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES purchase_order_receipts(id) ON DELETE CASCADE,
    po_item_id UUID NOT NULL REFERENCES purchase_order_items_enhanced(id),
    
    -- Received Quantities
    ordered_quantity DECIMAL(12,3) NOT NULL,
    received_quantity DECIMAL(12,3) NOT NULL,
    accepted_quantity DECIMAL(12,3) NOT NULL,
    rejected_quantity DECIMAL(12,3) DEFAULT 0,
    damaged_quantity DECIMAL(12,3) DEFAULT 0,
    
    -- Location and Storage
    storage_location VARCHAR(255),
    bin_location VARCHAR(100),
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    serial_numbers TEXT[],
    
    -- Quality Information
    quality_grade VARCHAR(10),
    quality_notes TEXT,
    defect_description TEXT,
    corrective_action TEXT,
    
    -- Expiry and Shelf Life
    expiry_date DATE,
    manufacture_date DATE,
    shelf_life_days INTEGER,
    
    -- Cost Information
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    variance_amount DECIMAL(15,2),
    
    -- Additional Information
    notes TEXT,
    photos_taken BOOLEAN DEFAULT FALSE,
    documentation_path TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT receipt_quantities_valid CHECK (
        received_quantity >= 0 AND
        accepted_quantity >= 0 AND
        rejected_quantity >= 0 AND
        damaged_quantity >= 0 AND
        received_quantity = accepted_quantity + rejected_quantity + damaged_quantity
    ),
    CONSTRAINT receipt_quantities_not_exceed_ordered CHECK (
        received_quantity <= ordered_quantity
    )
);

-- =====================================================
-- PURCHASE ORDER AUDIT TRAIL
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_order_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders_enhanced(id) ON DELETE CASCADE,
    
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
-- CONTRACT PERFORMANCE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS contract_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
    
    -- Measurement Period
    measurement_period_start DATE NOT NULL,
    measurement_period_end DATE NOT NULL,
    measurement_type VARCHAR(50) NOT NULL CHECK (measurement_type IN (
        'monthly', 'quarterly', 'annual', 'project_based', 'ad_hoc'
    )),
    
    -- Delivery Performance
    total_orders INTEGER DEFAULT 0,
    on_time_deliveries INTEGER DEFAULT 0,
    late_deliveries INTEGER DEFAULT 0,
    early_deliveries INTEGER DEFAULT 0,
    on_time_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_orders > 0 
        THEN (on_time_deliveries::DECIMAL / total_orders) * 100 
        ELSE 0 END
    ) STORED,
    
    -- Quality Performance
    total_items_received INTEGER DEFAULT 0,
    items_accepted INTEGER DEFAULT 0,
    items_rejected INTEGER DEFAULT 0,
    quality_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_items_received > 0 
        THEN (items_accepted::DECIMAL / total_items_received) * 100 
        ELSE 0 END
    ) STORED,
    
    -- Financial Performance
    total_spend DECIMAL(15,2) DEFAULT 0,
    budget_variance DECIMAL(15,2) DEFAULT 0,
    cost_savings DECIMAL(15,2) DEFAULT 0,
    penalties_applied DECIMAL(15,2) DEFAULT 0,
    incentives_earned DECIMAL(15,2) DEFAULT 0,
    
    -- Service Performance
    average_response_time_hours DECIMAL(8,2),
    service_availability_percentage DECIMAL(5,2),
    customer_satisfaction_score DECIMAL(3,1),
    
    -- Compliance Performance
    compliance_incidents INTEGER DEFAULT 0,
    audit_findings INTEGER DEFAULT 0,
    corrective_actions_required INTEGER DEFAULT 0,
    corrective_actions_completed INTEGER DEFAULT 0,
    
    -- Overall Scoring
    overall_performance_score DECIMAL(5,2),
    performance_grade VARCHAR(5),
    
    -- Reviews and Actions
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    action_items TEXT,
    next_review_date DATE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT performance_period_valid CHECK (measurement_period_end > measurement_period_start),
    CONSTRAINT performance_percentages_valid CHECK (
        on_time_percentage BETWEEN 0 AND 100 AND
        quality_percentage BETWEEN 0 AND 100 AND
        (service_availability_percentage IS NULL OR service_availability_percentage BETWEEN 0 AND 100)
    ),
    CONSTRAINT performance_score_valid CHECK (
        overall_performance_score IS NULL OR 
        (overall_performance_score >= 0 AND overall_performance_score <= 100)
    )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Purchase Orders Enhanced Indexes
CREATE INDEX IF NOT EXISTS idx_po_enhanced_org_id ON purchase_orders_enhanced(org_id);
CREATE INDEX IF NOT EXISTS idx_po_enhanced_supplier_id ON purchase_orders_enhanced(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_enhanced_status ON purchase_orders_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_po_enhanced_po_number ON purchase_orders_enhanced(po_number);
CREATE INDEX IF NOT EXISTS idx_po_enhanced_department ON purchase_orders_enhanced(department);
CREATE INDEX IF NOT EXISTS idx_po_enhanced_created_at ON purchase_orders_enhanced(created_at);
CREATE INDEX IF NOT EXISTS idx_po_enhanced_delivery_date ON purchase_orders_enhanced(requested_delivery_date);
CREATE INDEX IF NOT EXISTS idx_po_enhanced_total_amount ON purchase_orders_enhanced(total_amount);
CREATE INDEX IF NOT EXISTS idx_po_enhanced_approval ON purchase_orders_enhanced(org_id, status) 
    WHERE status = 'pending_approval';

-- Purchase Order Items Enhanced Indexes
CREATE INDEX IF NOT EXISTS idx_poi_enhanced_po_id ON purchase_order_items_enhanced(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_enhanced_product_code ON purchase_order_items_enhanced(product_code);
CREATE INDEX IF NOT EXISTS idx_poi_enhanced_status ON purchase_order_items_enhanced(status);

-- Contract Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier_id ON supplier_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_status ON supplier_contracts(status);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_type ON supplier_contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_dates ON supplier_contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_number ON supplier_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_performance ON supplier_contracts(performance_score DESC)
    WHERE performance_score IS NOT NULL;

-- Contract Performance Indexes
CREATE INDEX IF NOT EXISTS idx_contract_performance_contract_id ON contract_performance_metrics(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_performance_period ON contract_performance_metrics(measurement_period_start, measurement_period_end);
CREATE INDEX IF NOT EXISTS idx_contract_performance_score ON contract_performance_metrics(overall_performance_score DESC);

-- Audit Trail Indexes
CREATE INDEX IF NOT EXISTS idx_po_audit_po_id ON purchase_order_audit_trail(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_audit_timestamp ON purchase_order_audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_po_audit_user ON purchase_order_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_po_audit_action ON purchase_order_audit_trail(action);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function to update contract spend tracking
CREATE OR REPLACE FUNCTION update_contract_spend()
RETURNS TRIGGER AS $$
BEGIN
    -- Update spend_to_date when purchase orders are created/updated
    UPDATE supplier_contracts 
    SET spend_to_date = (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM purchase_orders_enhanced
        WHERE supplier_id = NEW.supplier_id 
        AND status IN ('completed', 'received')
        AND order_date BETWEEN supplier_contracts.start_date AND supplier_contracts.end_date
    )
    WHERE supplier_id = NEW.supplier_id AND status = 'active';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate remaining quantities on receipt
CREATE OR REPLACE FUNCTION update_remaining_quantities()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_order_items_enhanced
    SET remaining_quantity = quantity - COALESCE(received_quantity, 0)
    WHERE id = NEW.po_item_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update contract status based on dates
CREATE OR REPLACE FUNCTION update_contract_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-expire contracts past end date
    IF NEW.end_date < CURRENT_DATE AND NEW.status = 'active' THEN
        NEW.status = 'expired';
    END IF;
    
    -- Auto-activate signed contracts at start date
    IF NEW.start_date <= CURRENT_DATE AND NEW.status = 'signed' THEN
        NEW.status = 'active';
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- APPLY TRIGGERS
-- =====================================================

-- Spend tracking trigger
CREATE TRIGGER update_contract_spend_on_po_change
    AFTER INSERT OR UPDATE ON purchase_orders_enhanced
    FOR EACH ROW 
    EXECUTE FUNCTION update_contract_spend();

-- Remaining quantity trigger
CREATE TRIGGER update_remaining_quantities_on_receipt
    AFTER INSERT OR UPDATE ON purchase_order_receipt_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_remaining_quantities();

-- Contract status automation trigger
CREATE TRIGGER auto_update_contract_status
    BEFORE UPDATE ON supplier_contracts
    FOR EACH ROW 
    EXECUTE FUNCTION update_contract_status();

-- Updated timestamp triggers
CREATE TRIGGER update_purchase_orders_enhanced_updated_at
    BEFORE UPDATE ON purchase_orders_enhanced
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_order_items_enhanced_updated_at
    BEFORE UPDATE ON purchase_order_items_enhanced
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_contracts_updated_at
    BEFORE UPDATE ON supplier_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Purchase Order Summary View
CREATE OR REPLACE VIEW purchase_order_summary AS
SELECT 
    po.id,
    po.po_number,
    s.name as supplier_name,
    po.department,
    po.total_amount,
    po.status,
    po.requested_delivery_date,
    po.actual_delivery_date,
    CASE 
        WHEN po.actual_delivery_date IS NULL THEN NULL
        WHEN po.actual_delivery_date <= po.requested_delivery_date THEN 'On Time'
        ELSE 'Late'
    END as delivery_performance,
    CASE
        WHEN po.actual_delivery_date IS NOT NULL AND po.actual_delivery_date > po.requested_delivery_date 
        THEN po.actual_delivery_date - po.requested_delivery_date
        ELSE NULL
    END as days_late
FROM purchase_orders_enhanced po
JOIN supplier s ON po.supplier_id = s.id;

-- Contract Performance Summary View
CREATE OR REPLACE VIEW contract_performance_summary AS
SELECT 
    c.id,
    c.contract_number,
    s.name as supplier_name,
    c.contract_type,
    c.total_contract_value,
    c.spend_to_date,
    ROUND((c.spend_to_date / NULLIF(c.total_contract_value, 0)) * 100, 2) as spend_percentage,
    c.performance_score,
    c.status,
    c.start_date,
    c.end_date,
    CASE 
        WHEN c.end_date < CURRENT_DATE THEN 'Expired'
        WHEN c.start_date > CURRENT_DATE THEN 'Future'
        ELSE 'Active'
    END as contract_status
FROM supplier_contracts c
JOIN supplier s ON c.supplier_id = s.id;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 
    '🎉 PURCHASE ORDER & CONTRACT SCHEMA COMPLETE!' as message,
    'Enhanced purchase order system with full workflow support' as feature_1,
    'Comprehensive contract management with performance tracking' as feature_2,
    'Approval workflows, audit trails, and quality management' as feature_3,
    'Ready for Agent 4 data generation and testing' as status;