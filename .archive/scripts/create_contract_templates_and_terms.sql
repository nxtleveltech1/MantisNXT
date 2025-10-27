-- =====================================================
-- SUPPLIER CONTRACT TEMPLATES AND TERMS
-- Agent 4 - MantisNXT Contract Management System
-- =====================================================
-- Comprehensive contract templates for different supplier types
-- Standard terms and conditions with industry-specific variations

-- =====================================================
-- CONTRACT TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL UNIQUE,
    template_type VARCHAR(100) NOT NULL,
    industry_category VARCHAR(100),
    description TEXT,
    
    -- Template Content
    contract_clauses JSONB NOT NULL,
    standard_terms JSONB NOT NULL,
    variable_fields JSONB, -- Fields that need customization
    
    -- Financial Templates
    payment_terms_options TEXT[],
    default_payment_terms VARCHAR(100),
    pricing_models JSONB,
    
    -- Risk and Compliance
    risk_assessment_criteria JSONB,
    compliance_requirements TEXT[],
    insurance_requirements JSONB,
    
    -- Performance Standards
    default_sla_terms JSONB,
    performance_metrics JSONB,
    penalty_structure JSONB,
    incentive_structure JSONB,
    
    -- Legal Framework
    governing_law VARCHAR(100) DEFAULT 'South African Law',
    jurisdiction VARCHAR(100) DEFAULT 'South African Courts',
    dispute_resolution_method VARCHAR(100) DEFAULT 'Arbitration',
    
    -- Metadata
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255),
    approved_by VARCHAR(255),
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- STANDARD CONTRACT TERMS AND CONDITIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS contract_terms_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_category VARCHAR(100) NOT NULL,
    term_name VARCHAR(255) NOT NULL,
    term_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Term Content
    term_text TEXT NOT NULL,
    term_description TEXT,
    legal_implications TEXT,
    
    -- Applicability
    applicable_contract_types TEXT[],
    required_for_industries TEXT[],
    optional_for_industries TEXT[],
    
    -- Risk and Compliance
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    compliance_frameworks TEXT[],
    regulatory_requirements TEXT,
    
    -- Usage Guidelines
    recommended_use_cases TEXT,
    alternative_terms TEXT[],
    legal_precedents TEXT,
    
    -- Metadata
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    last_legal_review DATE,
    next_review_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INSERT STANDARD CONTRACT TEMPLATES
-- =====================================================

INSERT INTO contract_templates (
    template_name, template_type, industry_category, description,
    contract_clauses, standard_terms, variable_fields,
    payment_terms_options, default_payment_terms, pricing_models,
    risk_assessment_criteria, compliance_requirements, insurance_requirements,
    default_sla_terms, performance_metrics, penalty_structure, incentive_structure,
    created_by, approved_by
) VALUES

-- Strategic Partnership Template
(
    'Strategic Partnership Agreement',
    'strategic_partnership',
    'All Industries',
    'Comprehensive strategic partnership template for high-value, long-term supplier relationships with exclusive terms and performance incentives.',
    '{
        "partnership_scope": "Exclusive or preferred supplier arrangement with joint business planning and strategic alignment",
        "exclusivity_terms": "Supplier agrees to provide preferential treatment including priority allocation, competitive pricing, and innovation collaboration",
        "strategic_planning": "Joint quarterly business reviews, annual planning sessions, and collaborative market analysis",
        "innovation_collaboration": "Shared R&D initiatives, early access to new products, and co-development opportunities",
        "business_integration": "EDI integration, shared forecasting, and collaborative inventory management"
    }',
    '{
        "minimum_contract_term": "24 months",
        "auto_renewal": true,
        "renewal_period": "12 months",
        "termination_notice": "90 days",
        "volume_commitments": "Required with graduated pricing",
        "price_protection": "6-month price protection on strategic items",
        "payment_terms": "Extended terms available for strategic partners"
    }',
    '{
        "annual_volume_commitment": "Required field - minimum spend amount",
        "exclusive_product_categories": "Optional - specific product lines for exclusivity",
        "strategic_pricing_tiers": "Required - volume-based pricing structure",
        "innovation_budget": "Optional - joint R&D investment amount",
        "quarterly_review_schedule": "Required - specific dates and attendees"
    }',
    ARRAY['Net 30', 'Net 45', 'Net 60', '2/10 Net 30'],
    'Net 45',
    '{
        "volume_pricing": "Graduated discounts based on annual spend tiers",
        "strategic_pricing": "Cost-plus pricing for custom development",
        "market_pricing": "Market price adjustments with 90-day notice",
        "innovation_pricing": "Special pricing for joint R&D projects"
    }',
    '{
        "financial_stability": "Audited financials required, credit rating minimum B+",
        "operational_risk": "ISO 9001 certification required, backup capacity verification",
        "supply_chain_risk": "Geographic diversity, supplier redundancy, force majeure planning",
        "compliance_risk": "Regulatory compliance history, certification maintenance"
    }',
    ARRAY['ISO 9001:2015', 'B-BBEE Compliance', 'Environmental Compliance', 'Industry-specific certifications'],
    '{
        "professional_liability": "R10,000,000 minimum",
        "product_liability": "R25,000,000 minimum",
        "general_liability": "R5,000,000 minimum",
        "cyber_liability": "R2,000,000 minimum for IT suppliers"
    }',
    '{
        "delivery_performance": "98% on-time delivery within agreed SLA",
        "quality_performance": "99% quality acceptance rate",
        "response_time": "4-hour response for critical issues, 24-hour for standard",
        "availability": "99.5% supplier availability during business hours"
    }',
    '{
        "on_time_delivery": "98% minimum",
        "quality_acceptance": "99% minimum", 
        "customer_satisfaction": "4.5/5.0 minimum",
        "innovation_metrics": "Joint innovation projects per year"
    }',
    '{
        "late_delivery": "0.5% of order value per day late",
        "quality_issues": "2% penalty for rejected items",
        "sla_breach": "1% penalty for SLA violations",
        "contract_breach": "5-20% penalty based on severity"
    }',
    '{
        "early_delivery": "0.2% bonus for early delivery",
        "quality_excellence": "1% bonus for zero defects in quarter",
        "innovation_bonus": "Negotiated rewards for successful joint projects",
        "volume_bonus": "Additional discounts for exceeding commitments"
    }',
    'Legal Department',
    'Contract Director'
),

-- Standard Supply Agreement Template
(
    'Standard Supply Agreement',
    'standard',
    'General Manufacturing',
    'Standard supplier agreement template for regular procurement relationships with balanced terms and standard commercial protections.',
    '{
        "supply_scope": "Regular supplier arrangement for specified product categories with standard commercial terms",
        "product_specifications": "Products must meet documented specifications and industry standards",
        "quality_standards": "Standard quality requirements with inspection and testing protocols",
        "delivery_terms": "Standard delivery schedules with reasonable flexibility for demand variations",
        "commercial_relationship": "Professional commercial relationship with standard business practices"
    }',
    '{
        "minimum_contract_term": "12 months",
        "auto_renewal": false,
        "renewal_period": "12 months with mutual agreement",
        "termination_notice": "30 days",
        "volume_commitments": "Estimated volumes only, no firm commitments",
        "price_adjustments": "Annual price reviews with 30-day notice",
        "payment_terms": "Standard industry payment terms"
    }',
    '{
        "annual_estimated_volume": "Required - estimated annual purchase volume",
        "product_categories": "Required - specific product categories covered",
        "delivery_locations": "Required - standard delivery addresses",
        "quality_specifications": "Required - minimum quality standards",
        "pricing_schedule": "Required - product pricing and discount structure"
    }',
    ARRAY['Net 30', 'Net 45', '2/10 Net 30', 'COD'],
    'Net 30',
    '{
        "standard_pricing": "Published price lists with standard discounts",
        "volume_discounts": "Graduated discounts for quantity purchases",
        "annual_discounts": "Year-end rebates based on total volume",
        "market_adjustments": "Price adjustments with reasonable notice"
    }',
    '{
        "financial_stability": "Credit check and basic financial verification",
        "operational_risk": "Basic operational assessment and references",
        "supply_chain_risk": "Standard supply chain risk evaluation",
        "compliance_risk": "Basic regulatory compliance verification"
    }',
    ARRAY['Basic Business License', 'Tax Compliance', 'Industry-specific certifications as applicable'],
    '{
        "professional_liability": "R2,000,000 minimum",
        "product_liability": "R5,000,000 minimum",
        "general_liability": "R1,000,000 minimum"
    }',
    '{
        "delivery_performance": "95% on-time delivery",
        "quality_performance": "97% quality acceptance rate",
        "response_time": "48-hour response for issues",
        "availability": "Standard business hours availability"
    }',
    '{
        "on_time_delivery": "95% minimum",
        "quality_acceptance": "97% minimum",
        "customer_service": "Professional service standards"
    }',
    '{
        "late_delivery": "Standard industry penalties for chronic lateness",
        "quality_issues": "1% penalty for rejected batches",
        "service_issues": "Warning system with improvement plans"
    }',
    '{
        "performance_bonus": "Annual performance review with potential bonuses",
        "loyalty_discounts": "Long-term relationship pricing improvements",
        "prompt_payment": "2% discount for payment within 10 days"
    }',
    'Procurement Department',
    'Procurement Manager'
),

-- Framework Agreement Template
(
    'Framework Supply Agreement',
    'framework',
    'Multiple Categories',
    'Framework agreement template for multi-category suppliers with flexible call-off arrangements and standardized terms across product lines.',
    '{
        "framework_scope": "Umbrella agreement covering multiple product categories with individual call-off orders",
        "product_portfolio": "Comprehensive product range with standardized terms across categories",
        "call_off_procedure": "Streamlined ordering process for pre-agreed products and pricing",
        "category_management": "Product category specialists and dedicated account management",
        "scalability": "Framework designed to accommodate business growth and changing requirements"
    }',
    '{
        "framework_term": "24-36 months with annual reviews",
        "call_off_validity": "Individual orders valid for 12 months",
        "renewal_mechanism": "Framework renewal with updated terms and pricing",
        "termination_flexibility": "Category-specific termination with notice periods",
        "volume_flexibility": "No minimum commitments, estimates only",
        "pricing_mechanism": "Pre-agreed pricing with annual adjustments",
        "ordering_process": "Simplified purchase order process under framework"
    }',
    '{
        "product_categories": "Required - all categories covered by framework",
        "pricing_schedule": "Required - detailed pricing for all categories",
        "call_off_procedures": "Required - specific ordering and delivery processes",
        "category_contacts": "Required - specialist contacts for each category",
        "review_schedule": "Required - framework review and update schedule"
    }',
    ARRAY['Net 30', 'Net 45', 'Category-specific terms'],
    'Net 30',
    '{
        "framework_pricing": "Pre-negotiated pricing across all categories",
        "dynamic_pricing": "Market-based adjustments with quarterly reviews",
        "volume_aggregation": "Combined volume discounts across categories",
        "innovation_pricing": "Special terms for new product introductions"
    }',
    '{
        "portfolio_risk": "Risk assessment across multiple product categories",
        "supplier_diversification": "Framework reduces dependency on single suppliers",
        "financial_stability": "Enhanced due diligence for multi-category relationships",
        "operational_complexity": "Management overhead for complex frameworks"
    }',
    ARRAY['Multi-category certification', 'Quality system certification', 'Category-specific compliance'],
    '{
        "professional_liability": "R5,000,000 minimum",
        "product_liability": "R15,000,000 minimum covering all categories",
        "general_liability": "R3,000,000 minimum"
    }',
    '{
        "framework_availability": "Framework terms available 24/7",
        "category_expertise": "Specialist support for each product category",
        "delivery_coordination": "Coordinated delivery across multiple categories",
        "account_management": "Dedicated account management for framework relationship"
    }',
    '{
        "cross_category_performance": "Performance measured across all categories",
        "framework_utilization": "Usage metrics and framework effectiveness",
        "category_specialization": "Category-specific performance standards"
    }',
    '{
        "framework_non_performance": "Framework termination for consistent poor performance",
        "category_penalties": "Category-specific penalties for quality or delivery issues",
        "cross_category_impacts": "Performance in one category affects others"
    }',
    '{
        "framework_loyalty": "Long-term partnership bonuses",
        "cross_category_bonuses": "Bonuses for strong performance across multiple categories",
        "innovation_incentives": "Rewards for new product introductions and innovations"
    }',
    'Legal Department',
    'Legal Director'
),

-- Preferred Supplier Template
(
    'Preferred Supplier Agreement',
    'preferred_supplier',
    'Specialized Industries',
    'Preferred supplier template for specialized industries requiring higher quality standards, compliance, and performance with mutual commitment benefits.',
    '{
        "preferred_status": "Preferred supplier designation with priority consideration for relevant procurement",
        "specialization_recognition": "Acknowledgment of supplier expertise in specialized products or services",
        "collaborative_relationship": "Enhanced collaboration including planning, forecasting, and performance improvement",
        "quality_partnership": "Joint quality initiatives and continuous improvement programs",
        "competitive_protection": "Protection from competitive threats through relationship investment"
    }',
    '{
        "preferred_term": "18-24 months with performance-based renewal",
        "commitment_level": "Mutual commitments with performance expectations",
        "renewal_criteria": "Renewal based on performance metrics and relationship value",
        "termination_protection": "Extended notice periods and relationship protection",
        "exclusivity_consideration": "First consideration for new relevant requirements",
        "pricing_stability": "Price protection and predictable adjustment mechanisms",
        "relationship_investment": "Mutual investment in relationship development"
    }',
    '{
        "specialization_areas": "Required - specific areas of supplier expertise",
        "performance_commitments": "Required - specific performance commitments from both parties",
        "collaboration_framework": "Required - structure for ongoing collaboration",
        "improvement_targets": "Required - mutual improvement and development goals",
        "relationship_metrics": "Required - measures of relationship health and value"
    }',
    ARRAY['Net 30', 'Net 45', 'Extended terms for preferred status'],
    'Net 30',
    '{
        "preferred_pricing": "Preferential pricing reflecting relationship value",
        "performance_pricing": "Performance-based pricing adjustments",
        "collaborative_pricing": "Joint cost reduction and value engineering",
        "innovation_sharing": "Shared benefits from innovation and improvements"
    }',
    '{
        "relationship_dependency": "Increased dependency requiring careful management",
        "performance_risk": "Higher expectations requiring consistent performance",
        "competitive_risk": "Reduced supplier diversity in specialized areas",
        "collaboration_risk": "Information sharing and intellectual property considerations"
    }',
    ARRAY['Advanced quality certifications', 'Industry specialization certifications', 'Continuous improvement compliance'],
    '{
        "professional_liability": "R7,500,000 minimum",
        "product_liability": "R20,000,000 minimum",
        "general_liability": "R2,500,000 minimum",
        "errors_omissions": "R5,000,000 for professional services"
    }',
    '{
        "preferred_response": "Priority response times for preferred suppliers",
        "enhanced_support": "Enhanced technical and commercial support",
        "relationship_management": "Dedicated relationship manager and regular reviews",
        "problem_escalation": "Escalation procedures for rapid issue resolution"
    }',
    '{
        "preferred_performance": "Enhanced performance standards reflecting preferred status",
        "relationship_metrics": "Relationship health and satisfaction metrics",
        "continuous_improvement": "Joint improvement initiatives and targets"
    }',
    '{
        "relationship_penalties": "Penalties for failing to maintain preferred status standards",
        "performance_degradation": "Structured approach for performance improvement",
        "status_review": "Regular review of preferred status based on performance"
    }',
    '{
        "preferred_benefits": "Benefits for maintaining excellent preferred supplier performance",
        "relationship_bonuses": "Annual bonuses for outstanding relationship value",
        "growth_incentives": "Incentives for business growth and expansion together"
    }',
    'Legal Department',
    'Legal Director'
),

-- Spot Purchase Template
(
    'Spot Purchase Agreement',
    'spot_purchase',
    'General',
    'Simple template for one-time or irregular purchases with basic terms and minimal administrative overhead.',
    '{
        "purchase_scope": "Single transaction or limited-time purchasing arrangement",
        "simplicity": "Streamlined terms for efficient transaction processing",
        "basic_protection": "Essential legal protections without complex relationship terms",
        "transaction_focus": "Focus on specific transaction rather than ongoing relationship",
        "minimal_overhead": "Reduced administrative burden for both parties"
    }',
    '{
        "contract_term": "Single transaction or specified period only",
        "no_renewal": "No automatic renewal, each transaction separate",
        "simple_termination": "Immediate termination after transaction completion",
        "basic_commitments": "Limited commitments focused on specific transaction",
        "standard_payment": "Standard payment terms without extended arrangements",
        "basic_warranties": "Standard product warranties and basic service guarantees"
    }',
    '{
        "transaction_details": "Required - specific products, quantities, and pricing",
        "delivery_requirements": "Required - delivery location and timing",
        "payment_terms": "Required - specific payment arrangements",
        "basic_specifications": "Required - minimum product specifications and quality standards"
    }',
    ARRAY['COD', 'Net 15', 'Net 30', 'Payment on delivery'],
    'Net 30',
    '{
        "spot_pricing": "Market pricing at time of transaction",
        "fixed_pricing": "Fixed price for duration of specific transaction",
        "simple_adjustments": "Limited price adjustment mechanisms"
    }',
    '{
        "transaction_risk": "Risk limited to specific transaction value and scope",
        "supplier_verification": "Basic supplier verification and credential checking",
        "payment_risk": "Standard payment risk assessment",
        "delivery_risk": "Basic delivery and performance risk evaluation"
    }',
    ARRAY['Basic business license', 'Tax compliance', 'Product certifications as applicable'],
    '{
        "professional_liability": "R500,000 minimum",
        "product_liability": "R2,000,000 minimum",
        "general_liability": "R500,000 minimum"
    }',
    '{
        "basic_delivery": "Standard delivery terms and conditions",
        "simple_support": "Basic product support and warranty service",
        "transaction_completion": "Clear completion criteria and acceptance procedures"
    }',
    '{
        "delivery_performance": "Delivery as specified in transaction terms",
        "quality_acceptance": "Products meet specified requirements",
        "basic_service": "Professional service and communication standards"
    }',
    '{
        "transaction_penalties": "Penalties for non-delivery or non-conformance",
        "basic_remedies": "Standard remedies for transaction failures"
    }',
    '{
        "prompt_payment": "Discounts for early payment",
        "repeat_business": "Consideration for future opportunities based on performance"
    }',
    'Procurement Department',
    'Procurement Manager'
);

-- =====================================================
-- INSERT STANDARD TERMS AND CONDITIONS
-- =====================================================

INSERT INTO contract_terms_library (
    term_category, term_name, term_code, term_text, term_description,
    legal_implications, applicable_contract_types, required_for_industries,
    risk_level, compliance_frameworks, recommended_use_cases
) VALUES

-- Payment Terms
(
    'Payment',
    'Standard Payment Terms',
    'PAY_STANDARD_30',
    'Payment is due within thirty (30) days of invoice date. Invoices must be submitted with proper documentation including delivery confirmation and quality acceptance. Late payment may incur interest charges at the prime rate plus 2% per annum.',
    'Standard 30-day payment terms with interest provision for late payments',
    'Creates legal obligation for timely payment and provides remedy for supplier in case of late payment',
    ARRAY['standard', 'preferred_supplier', 'framework'],
    ARRAY['All Industries'],
    'low',
    ARRAY['General Commercial Law'],
    'Use for standard commercial relationships with established credit terms'
),

(
    'Payment',
    'Extended Payment Terms',
    'PAY_EXTENDED_45',
    'Payment is due within forty-five (45) days of invoice date for qualified suppliers with preferred status. Extended terms are conditional on maintaining performance standards and may be revoked for non-performance.',
    'Extended payment terms for strategic or preferred suppliers',
    'Provides cash flow benefit but creates dependency and performance requirements',
    ARRAY['strategic_partnership', 'preferred_supplier'],
    ARRAY['Technology', 'Healthcare', 'Manufacturing'],
    'medium',
    ARRAY['Commercial Credit Management'],
    'Use for strategic suppliers where extended terms provide mutual benefit'
),

-- Quality and Compliance
(
    'Quality',
    'Standard Quality Requirements',
    'QUAL_STANDARD',
    'All products and services must meet documented specifications and applicable industry standards. Supplier must maintain quality management system and provide quality documentation with deliveries. Defective products will be rejected and returned at supplier expense.',
    'Basic quality requirements and defective product handling',
    'Establishes minimum quality standards and remedies for non-conformance',
    ARRAY['standard', 'framework', 'spot_purchase'],
    ARRAY['All Industries'],
    'medium',
    ARRAY['ISO 9001', 'Industry Quality Standards'],
    'Use for all supplier relationships requiring quality assurance'
),

(
    'Quality',
    'Advanced Quality Requirements',
    'QUAL_ADVANCED',
    'Supplier must maintain ISO 9001:2015 certification and industry-specific quality standards. Statistical process control data must be provided quarterly. Quality audits may be conducted annually. Supplier must participate in continuous improvement initiatives and quality partnerships.',
    'Enhanced quality requirements for strategic suppliers',
    'Creates higher quality obligations and audit rights for buyer',
    ARRAY['strategic_partnership', 'preferred_supplier'],
    ARRAY['Healthcare', 'Aerospace', 'Automotive', 'Technology'],
    'high',
    ARRAY['ISO 9001:2015', 'Industry-specific QMS'],
    'Use for critical suppliers where quality is paramount'
),

-- Delivery and Performance
(
    'Delivery',
    'Standard Delivery Terms',
    'DEL_STANDARD',
    'Delivery must be made to specified locations during normal business hours (8:00 AM - 5:00 PM, Monday-Friday). Supplier must provide 24-hour advance notice of delivery. All deliveries must include proper documentation and packaging for product protection.',
    'Standard delivery terms and notification requirements',
    'Establishes delivery obligations and notice requirements',
    ARRAY['standard', 'framework', 'spot_purchase'],
    ARRAY['All Industries'],
    'low',
    ARRAY['Commercial Delivery Standards'],
    'Use for standard supplier relationships with regular delivery requirements'
),

(
    'Delivery',
    'Expedited Delivery Terms',
    'DEL_EXPEDITED',
    'Supplier agrees to expedited delivery capability with 24-48 hour delivery available for urgent requirements. Expedited delivery premiums are pre-agreed. Supplier must maintain emergency contact procedures and backup delivery capacity.',
    'Enhanced delivery terms for urgent or critical requirements',
    'Creates enhanced delivery obligations and emergency response requirements',
    ARRAY['strategic_partnership', 'preferred_supplier'],
    ARRAY['Healthcare', 'Manufacturing', 'IT Infrastructure'],
    'medium',
    ARRAY['Emergency Response Protocols'],
    'Use for suppliers providing critical products requiring emergency delivery capability'
),

-- Risk Management
(
    'Risk',
    'Force Majeure Standard',
    'RISK_FORCE_MAJEURE',
    'Neither party shall be liable for delays or failures in performance resulting from acts beyond reasonable control including natural disasters, government actions, strikes, or pandemics. Party affected must notify the other within 48 hours and use best efforts to mitigate impact.',
    'Standard force majeure clause for uncontrollable events',
    'Provides protection from liability for extraordinary circumstances beyond control',
    ARRAY['standard', 'strategic_partnership', 'preferred_supplier', 'framework'],
    ARRAY['All Industries'],
    'low',
    ARRAY['Commercial Risk Management'],
    'Use in all contracts to protect against extraordinary circumstances'
),

(
    'Risk',
    'Business Continuity Requirements',
    'RISK_CONTINUITY',
    'Supplier must maintain business continuity plans including backup production capacity, alternative delivery methods, and disaster recovery procedures. Supplier must participate in annual business continuity testing and provide continuity plan updates.',
    'Enhanced business continuity requirements for critical suppliers',
    'Creates obligation for supplier to maintain business continuity capabilities',
    ARRAY['strategic_partnership', 'preferred_supplier'],
    ARRAY['Healthcare', 'Critical Infrastructure', 'Essential Services'],
    'high',
    ARRAY['Business Continuity Management', 'ISO 22301'],
    'Use for critical suppliers where business continuity is essential'
),

-- Intellectual Property
(
    'Intellectual Property',
    'Standard IP Protection',
    'IP_STANDARD',
    'Each party retains ownership of their pre-existing intellectual property. Any jointly developed IP will be owned according to contribution and prior agreement. Confidential information must be protected and not disclosed to third parties.',
    'Basic intellectual property and confidentiality protection',
    'Protects existing IP and establishes confidentiality obligations',
    ARRAY['standard', 'framework', 'spot_purchase'],
    ARRAY['All Industries'],
    'medium',
    ARRAY['Intellectual Property Law', 'Confidentiality Agreements'],
    'Use for all relationships involving potential IP exposure or confidential information'
),

(
    'Intellectual Property',
    'Enhanced IP and Innovation',
    'IP_ENHANCED',
    'Parties agree to collaborative innovation with shared IP development framework. Joint inventions will be owned proportionally based on contribution. Innovation disclosure agreements apply. Patent prosecution and licensing arrangements pre-defined for joint developments.',
    'Enhanced IP framework for innovation partnerships',
    'Creates framework for joint IP development and shared innovation benefits',
    ARRAY['strategic_partnership'],
    ARRAY['Technology', 'R&D Intensive Industries'],
    'high',
    ARRAY['Patent Law', 'Innovation Agreements', 'Joint Development Frameworks'],
    'Use for strategic partnerships involving significant joint innovation and development'
),

-- Termination and Disputes
(
    'Termination',
    'Standard Termination Rights',
    'TERM_STANDARD',
    'Either party may terminate this agreement with thirty (30) days written notice. Immediate termination is allowed for material breach not cured within fifteen (15) days of written notice. Upon termination, all outstanding obligations must be fulfilled.',
    'Standard termination rights and notice periods',
    'Provides balanced termination rights with reasonable notice and cure periods',
    ARRAY['standard', 'framework', 'spot_purchase'],
    ARRAY['All Industries'],
    'low',
    ARRAY['Contract Termination Law'],
    'Use for standard commercial relationships requiring termination flexibility'
),

(
    'Termination',
    'Strategic Partnership Termination',
    'TERM_STRATEGIC',
    'Termination requires ninety (90) days written notice except for material uncured breach. Termination assistance including transition support and knowledge transfer required. Post-termination confidentiality and non-compete provisions apply for twelve (12) months.',
    'Enhanced termination terms for strategic partnerships',
    'Provides relationship protection and transition support for strategic partnerships',
    ARRAY['strategic_partnership', 'preferred_supplier'],
    ARRAY['Critical Industries', 'Strategic Partnerships'],
    'high',
    ARRAY['Strategic Partnership Law', 'Post-Termination Obligations'],
    'Use for strategic relationships requiring protection and transition support'
),

-- Dispute Resolution
(
    'Dispute Resolution',
    'Standard Arbitration',
    'DISP_ARBITRATION',
    'Disputes will be resolved through binding arbitration under the Arbitration Act of South Africa. Arbitration will be conducted in Johannesburg with a single arbitrator agreed by parties or appointed by the Arbitration Foundation of Southern Africa.',
    'Standard arbitration clause for commercial disputes',
    'Provides private dispute resolution mechanism avoiding court proceedings',
    ARRAY['standard', 'strategic_partnership', 'preferred_supplier', 'framework'],
    ARRAY['All Industries'],
    'medium',
    ARRAY['Arbitration Act', 'Commercial Dispute Resolution'],
    'Use for most commercial relationships preferring private dispute resolution'
),

(
    'Dispute Resolution',
    'Escalated Dispute Resolution',
    'DISP_ESCALATED',
    'Disputes will first be addressed through executive-level negotiation within thirty (30) days. If unresolved, mediation with professional mediator required. Final resolution through arbitration if mediation unsuccessful. Parties agree to maintain business relationship during dispute resolution.',
    'Multi-stage dispute resolution for complex relationships',
    'Provides structured escalation to preserve relationships while resolving disputes',
    ARRAY['strategic_partnership', 'preferred_supplier'],
    ARRAY['High-Value Relationships', 'Complex Partnerships'],
    'high',
    ARRAY['Mediation Standards', 'Executive Dispute Resolution'],
    'Use for valuable relationships where dispute resolution should preserve business relationship'
);

-- =====================================================
-- CONTRACT TEMPLATE APPLICATIONS
-- =====================================================

-- Link specific terms to specific templates
CREATE TABLE IF NOT EXISTS template_term_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES contract_terms_library(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    display_order INTEGER,
    customization_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(template_id, term_id)
);

-- Associate terms with Strategic Partnership template
INSERT INTO template_term_associations (template_id, term_id, is_required, display_order) 
SELECT 
    (SELECT id FROM contract_templates WHERE template_name = 'Strategic Partnership Agreement'),
    ct.id,
    CASE 
        WHEN ct.term_code IN ('PAY_EXTENDED_45', 'QUAL_ADVANCED', 'DEL_EXPEDITED', 'IP_ENHANCED', 'TERM_STRATEGIC', 'DISP_ESCALATED') THEN true
        ELSE false
    END,
    ROW_NUMBER() OVER (ORDER BY ct.term_category, ct.term_name)
FROM contract_terms_library ct
WHERE ct.term_code IN ('PAY_EXTENDED_45', 'QUAL_ADVANCED', 'DEL_EXPEDITED', 'RISK_CONTINUITY', 'IP_ENHANCED', 'TERM_STRATEGIC', 'DISP_ESCALATED');

-- Associate terms with Standard Supply Agreement template
INSERT INTO template_term_associations (template_id, term_id, is_required, display_order)
SELECT 
    (SELECT id FROM contract_templates WHERE template_name = 'Standard Supply Agreement'),
    ct.id,
    true,
    ROW_NUMBER() OVER (ORDER BY ct.term_category, ct.term_name)
FROM contract_terms_library ct
WHERE ct.term_code IN ('PAY_STANDARD_30', 'QUAL_STANDARD', 'DEL_STANDARD', 'RISK_FORCE_MAJEURE', 'IP_STANDARD', 'TERM_STANDARD', 'DISP_ARBITRATION');

-- Associate terms with Preferred Supplier template
INSERT INTO template_term_associations (template_id, term_id, is_required, display_order)
SELECT 
    (SELECT id FROM contract_templates WHERE template_name = 'Preferred Supplier Agreement'),
    ct.id,
    CASE 
        WHEN ct.term_code IN ('PAY_EXTENDED_45', 'QUAL_ADVANCED', 'DEL_EXPEDITED', 'TERM_STRATEGIC') THEN true
        ELSE false
    END,
    ROW_NUMBER() OVER (ORDER BY ct.term_category, ct.term_name)
FROM contract_terms_library ct
WHERE ct.term_code IN ('PAY_EXTENDED_45', 'QUAL_ADVANCED', 'DEL_EXPEDITED', 'RISK_CONTINUITY', 'IP_ENHANCED', 'TERM_STRATEGIC', 'DISP_ESCALATED');

-- =====================================================
-- INDUSTRY-SPECIFIC CONTRACT VARIATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS industry_contract_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_name VARCHAR(100) NOT NULL,
    template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
    
    -- Industry-specific modifications
    additional_clauses JSONB,
    modified_terms JSONB,
    compliance_requirements TEXT[],
    industry_standards TEXT[],
    
    -- Regulatory considerations
    regulatory_framework VARCHAR(255),
    licensing_requirements TEXT[],
    certification_requirements TEXT[],
    
    -- Risk factors
    industry_specific_risks JSONB,
    mitigation_strategies JSONB,
    
    -- Performance standards
    industry_performance_standards JSONB,
    benchmarking_criteria JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    
    UNIQUE(industry_name, template_id)
);

-- Insert industry variations for key industries
INSERT INTO industry_contract_variations (
    industry_name, template_id, additional_clauses, modified_terms,
    compliance_requirements, industry_standards, regulatory_framework,
    industry_specific_risks, mitigation_strategies, industry_performance_standards,
    created_by
) VALUES

-- Healthcare Industry Variations
(
    'Healthcare',
    (SELECT id FROM contract_templates WHERE template_name = 'Preferred Supplier Agreement'),
    '{
        "regulatory_compliance": "All products must comply with SAHPRA regulations and maintain current registration",
        "quality_systems": "Supplier must maintain ISO 13485 certification for medical devices",
        "traceability": "Complete product traceability and recall capability required",
        "gdp_compliance": "Good Distribution Practice compliance for pharmaceutical products"
    }',
    '{
        "payment_terms": "Net 30 with exception for critical supplies which may be expedited",
        "delivery_terms": "Temperature-controlled delivery required for pharmaceuticals and biologics",
        "warranty_terms": "Extended warranty terms for medical equipment including service support"
    }',
    ARRAY['SAHPRA Registration', 'ISO 13485', 'GDP Certification', 'Medical Device Regulations'],
    ARRAY['WHO Standards', 'ICH Guidelines', 'South African Medical Standards'],
    'SAHPRA and Health Department Regulations',
    '{
        "regulatory_risk": "Product registration and compliance changes",
        "supply_chain_risk": "Cold chain and specialized logistics requirements",
        "quality_risk": "Patient safety implications of quality failures",
        "liability_risk": "Enhanced liability for medical products and services"
    }',
    '{
        "regulatory_monitoring": "Continuous monitoring of regulatory changes and compliance",
        "supply_chain_redundancy": "Multiple qualified suppliers for critical products",
        "quality_assurance": "Enhanced quality control and batch testing procedures",
        "insurance_coverage": "Comprehensive medical liability insurance requirements"
    }',
    '{
        "regulatory_compliance": "100% compliance with all applicable regulations",
        "quality_performance": "99.5% quality acceptance for medical products",
        "delivery_performance": "98% on-time delivery with temperature compliance",
        "documentation": "100% complete documentation and traceability"
    }',
    'Healthcare Compliance Team'
),

-- Technology Industry Variations
(
    'Technology',
    (SELECT id FROM contract_templates WHERE template_name = 'Strategic Partnership Agreement'),
    '{
        "technology_lifecycle": "Supplier must provide technology roadmap and end-of-life planning",
        "cybersecurity": "Supplier must maintain cybersecurity standards and provide security documentation",
        "data_protection": "POPIA compliance required for all data handling and processing",
        "intellectual_property": "Enhanced IP protection and innovation collaboration frameworks"
    }',
    '{
        "payment_terms": "Net 45 with early payment discounts for technology purchases",
        "delivery_terms": "Just-in-time delivery capability for technology refresh cycles",
        "support_terms": "Comprehensive technical support including remote assistance and on-site service"
    }',
    ARRAY['POPIA Compliance', 'Cybersecurity Standards', 'Technology Certifications'],
    ARRAY['IEEE Standards', 'ISO 27001', 'Technology Industry Standards'],
    'Information Technology and Cybersecurity Regulations',
    '{
        "technology_obsolescence": "Rapid technology change and product lifecycle management",
        "cybersecurity_threats": "Information security and data protection risks",
        "integration_complexity": "Technology integration and compatibility challenges",
        "vendor_dependency": "Technology lock-in and vendor dependency risks"
    }',
    '{
        "lifecycle_management": "Proactive technology lifecycle planning and migration support",
        "security_protocols": "Comprehensive cybersecurity measures and regular assessments",
        "integration_support": "Dedicated integration support and testing procedures",
        "vendor_diversification": "Strategic vendor diversification to reduce dependency"
    }',
    '{
        "technology_currency": "Technology products must be current generation with upgrade path",
        "security_compliance": "100% cybersecurity compliance with regular assessments",
        "integration_success": "95% successful integration with existing systems",
        "support_responsiveness": "4-hour response for critical issues, 24-hour for standard"
    }',
    'IT Security and Compliance Team'
);

-- =====================================================
-- VALIDATION AND REPORTING VIEWS
-- =====================================================

-- Contract Template Usage View
CREATE OR REPLACE VIEW contract_template_usage AS
SELECT 
    ct.template_name,
    ct.template_type,
    COUNT(sc.id) as contracts_using_template,
    ROUND(SUM(sc.total_contract_value), 2) as total_value_using_template,
    ROUND(AVG(sc.total_contract_value), 2) as avg_contract_value
FROM contract_templates ct
LEFT JOIN supplier_contracts sc ON ct.template_type = sc.contract_type
GROUP BY ct.id, ct.template_name, ct.template_type
ORDER BY contracts_using_template DESC;

-- Contract Compliance Summary View
CREATE OR REPLACE VIEW contract_compliance_summary AS
SELECT 
    s.name as supplier_name,
    c.contract_number,
    c.contract_type,
    c.status,
    c.start_date,
    c.end_date,
    CASE 
        WHEN c.end_date < CURRENT_DATE THEN 'Expired'
        WHEN c.start_date > CURRENT_DATE THEN 'Future'
        ELSE 'Current'
    END as contract_status,
    c.total_contract_value,
    c.spend_to_date,
    ROUND((c.spend_to_date / NULLIF(c.total_contract_value, 0)) * 100, 2) as spend_percentage,
    CASE 
        WHEN c.spend_to_date > c.maximum_spend THEN 'Over Limit'
        WHEN c.spend_to_date < c.minimum_spend AND c.status = 'active' THEN 'Under Minimum'
        ELSE 'Within Range'
    END as spend_status
FROM supplier_contracts c
JOIN supplier s ON c.supplier_id = s.id
ORDER BY c.total_contract_value DESC;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 
    '🎉 CONTRACT TEMPLATES AND TERMS SYSTEM COMPLETE!' as message,
    'Comprehensive contract template library with industry variations' as feature_1,
    'Standard terms and conditions library with risk-based categorization' as feature_2,
    'Template-term associations for automated contract generation' as feature_3,
    'Industry-specific compliance and performance requirements' as feature_4,
    'Ready for automated contract generation and management' as status;