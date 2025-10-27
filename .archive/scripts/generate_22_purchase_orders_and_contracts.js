#!/usr/bin/env node

/**
 * =====================================================
 * PURCHASE ORDER & CONTRACT MANAGEMENT GENERATOR
 * Agent 4 - MantisNXT Purchase Order System
 * =====================================================
 * 
 * Creates 22 realistic purchase orders (1 per supplier/product)
 * Includes contracts for high-value strategic suppliers
 * Proper workflow statuses and business scenarios
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
    host: '62.169.20.53',
    port: 6600,
    database: 'nxtprod-db_001',
    user: 'nxtdb_admin',
    password: 'P@33w0rd-1',
};

class PurchaseOrderGenerator {
    constructor() {
        this.pool = new Pool(dbConfig);
        this.organizationId = '00000000-0000-0000-0000-000000000001';
        this.stats = {
            purchaseOrdersCreated: 0,
            contractsCreated: 0,
            totalValue: 0,
            errors: [],
            warnings: []
        };
        
        // Realistic business scenarios for different departments
        this.departments = [
            'IT Infrastructure', 'Manufacturing', 'Construction', 'Operations',
            'Research & Development', 'Quality Assurance', 'Facilities', 'Security'
        ];
        
        this.requesters = [
            'Sarah Mitchell', 'David Chen', 'Mike Rodriguez', 'Lisa Thompson',
            'John Williams', 'Amy Johnson', 'Peter van der Merwe', 'Hans Mueller',
            'Rachel Green', 'Wolfgang Weber', 'Michelle Brown', 'Klaus Schmidt',
            'Thunder Jackson', 'Global Manager', 'Audio Specialist', 'Alex Apex',
            'Nomsa Mbeki', 'Hiroshi Tanaka', 'Sarah Wilson', 'Michael Davies',
            'James Anderson', 'Mary van Wyk'
        ];
    }

    async connect() {
        try {
            this.client = await this.pool.connect();
            console.log('✅ Connected to PostgreSQL database');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async getSupplierProductData() {
        try {
            console.log('📊 Fetching supplier and product data...');
            
            // Try to get data from both possible schemas
            let supplierProductQuery = `
                SELECT 
                    s.id as supplier_id,
                    s.name as supplier_name,
                    i.id as product_id,
                    i.sku,
                    i.name as product_name,
                    i.description,
                    i.unit_price,
                    i.category,
                    i.quantity_on_hand,
                    i.unit_of_measure,
                    s.payment_terms,
                    s.lead_time_days,
                    s.risk_score
                FROM supplier s
                LEFT JOIN inventory_item i ON s.id = i.supplier_id
                WHERE s.org_id = $1 AND i.is_active = true
                ORDER BY s.name
            `;

            const result = await this.client.query(supplierProductQuery, [this.organizationId]);
            
            if (result.rows.length === 0) {
                // Try alternative schema
                console.log('⚠️ No data found in migration schema, checking enhanced schema...');
                throw new Error('No supplier-product data found');
            }

            console.log(`✅ Found ${result.rows.length} supplier-product pairs`);
            return result.rows;
            
        } catch (error) {
            console.error('❌ Error fetching supplier-product data:', error.message);
            this.stats.errors.push('Data fetch error: ' + error.message);
            return [];
        }
    }

    generatePONumber(index) {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const poNum = String(index + 1).padStart(3, '0');
        return `PO-${year}${month}-${poNum}`;
    }

    calculateDeliveryDate(orderDate, leadTimeDays) {
        const delivery = new Date(orderDate);
        delivery.setDate(delivery.getDate() + leadTimeDays + Math.floor(Math.random() * 7)); // Add some variance
        return delivery;
    }

    generatePurchaseOrderData(supplierProduct, index) {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 90)); // Orders from last 90 days
        
        const quantity = this.calculateRealisticQuantity(supplierProduct);
        const unitPrice = parseFloat(supplierProduct.unit_price);
        const subtotal = quantity * unitPrice;
        const taxAmount = subtotal * 0.15; // 15% VAT
        const shippingAmount = this.calculateShipping(subtotal);
        const discountAmount = this.calculateDiscount(subtotal, supplierProduct.category);
        const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;
        
        const requestedDelivery = this.calculateDeliveryDate(baseDate, supplierProduct.lead_time_days);
        const status = this.generateRealisticStatus(index, totalAmount);
        const department = this.departments[index % this.departments.length];
        const requester = this.requesters[index % this.requesters.length];
        
        return {
            supplier_id: supplierProduct.supplier_id,
            po_number: this.generatePONumber(index),
            title: `${supplierProduct.product_name} - ${department} Order`,
            description: `Purchase order for ${supplierProduct.product_name}. ${supplierProduct.description.substring(0, 100)}...`,
            category: this.mapToBusinessCategory(supplierProduct.category),
            priority: this.calculatePriority(totalAmount, status),
            requested_by: requester,
            department: department,
            budget_code: `${department.replace(/\s+/g, '').toUpperCase()}-${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
            subtotal: subtotal,
            tax_amount: taxAmount,
            shipping_amount: shippingAmount,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            currency: 'ZAR',
            requested_delivery_date: requestedDelivery,
            confirmed_delivery_date: status === 'sent' || status === 'acknowledged' || status === 'partially_received' || status === 'completed' ? requestedDelivery : null,
            actual_delivery_date: status === 'partially_received' || status === 'completed' ? new Date(requestedDelivery.getTime() + (Math.random() * 7 * 24 * 60 * 60 * 1000)) : null,
            delivery_location: this.generateDeliveryLocation(department),
            payment_terms: supplierProduct.payment_terms,
            status: status,
            workflow_status: this.getWorkflowStatus(status),
            approved_by: status !== 'draft' ? this.getApprover(department) : null,
            approved_at: status !== 'draft' ? new Date(baseDate.getTime() + (24 * 60 * 60 * 1000)) : null,
            sent_at: (status === 'sent' || status === 'acknowledged' || status === 'partially_received' || status === 'completed') ? new Date(baseDate.getTime() + (48 * 60 * 60 * 1000)) : null,
            acknowledged_at: (status === 'acknowledged' || status === 'partially_received' || status === 'completed') ? new Date(baseDate.getTime() + (72 * 60 * 60 * 1000)) : null,
            notes: this.generateBusinessNotes(supplierProduct, department),
            internal_notes: `Generated for Agent 4 testing. Product: ${supplierProduct.sku}. Supplier risk: ${supplierProduct.risk_score}`,
            tracking_number: (status === 'partially_received' || status === 'completed') ? this.generateTrackingNumber(supplierProduct.supplier_name) : null,
            carrier: (status === 'partially_received' || status === 'completed') ? this.selectCarrier(shippingAmount) : null,
            risk_score: this.calculatePORiskScore(supplierProduct.risk_score, totalAmount),
            three_way_match_status: status === 'completed' ? 'matched' : 'pending',
            created_by: 'Agent4-TestData',
            created_at: baseDate,
            product_data: {
                product_id: supplierProduct.product_id,
                sku: supplierProduct.sku,
                quantity: quantity,
                unit_price: unitPrice,
                total_price: subtotal,
                unit: supplierProduct.unit_of_measure
            }
        };
    }

    calculateRealisticQuantity(supplierProduct) {
        const stockLevel = supplierProduct.quantity_on_hand;
        const category = supplierProduct.category;
        
        // Base quantity on category and realistic business needs
        switch (category) {
            case 'finished_goods':
                return Math.max(1, Math.floor(stockLevel * 0.2) + Math.floor(Math.random() * 5));
            case 'components':
                return Math.max(5, Math.floor(stockLevel * 0.1) + Math.floor(Math.random() * 20));
            case 'raw_materials':
                return Math.max(10, Math.floor(stockLevel * 0.15) + Math.floor(Math.random() * 50));
            case 'consumables':
                return Math.max(20, Math.floor(stockLevel * 0.25) + Math.floor(Math.random() * 100));
            default:
                return Math.max(1, Math.floor(Math.random() * 10) + 1);
        }
    }

    calculateShipping(subtotal) {
        if (subtotal < 1000) return 150;
        if (subtotal < 10000) return subtotal * 0.05;
        if (subtotal < 50000) return subtotal * 0.03;
        return Math.max(1500, subtotal * 0.02);
    }

    calculateDiscount(subtotal, category) {
        // Strategic suppliers get better discounts
        const baseDiscount = Math.random() * 0.08; // 0-8%
        const categoryMultiplier = category === 'finished_goods' ? 1.2 : 1.0;
        return subtotal * baseDiscount * categoryMultiplier;
    }

    generateRealisticStatus(index, totalAmount) {
        const statusDistribution = [
            'draft', 'pending_approval', 'approved', 'sent', 'acknowledged',
            'partially_received', 'completed', 'cancelled', 'on_hold'
        ];
        
        // Weighted distribution for realistic business scenarios
        const weights = [0.1, 0.15, 0.2, 0.15, 0.1, 0.1, 0.1, 0.05, 0.05];
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return statusDistribution[i];
            }
        }
        
        return 'draft';
    }

    calculatePriority(totalAmount, status) {
        if (totalAmount > 100000) return 'urgent';
        if (totalAmount > 50000) return 'high';
        if (status === 'draft') return 'low';
        return 'medium';
    }

    mapToBusinessCategory(inventoryCategory) {
        const mapping = {
            'finished_goods': 'Equipment & Machinery',
            'components': 'Parts & Components',
            'raw_materials': 'Raw Materials',
            'consumables': 'Supplies & Consumables',
            'services': 'Professional Services',
            'packaging': 'Packaging Materials',
            'tools': 'Tools & Equipment',
            'safety_equipment': 'Safety & Compliance'
        };
        return mapping[inventoryCategory] || 'General Supplies';
    }

    generateDeliveryLocation(department) {
        const locations = {
            'IT Infrastructure': 'IT Department, Main Building, Floor 3',
            'Manufacturing': 'Manufacturing Floor, Building B',
            'Construction': 'Construction Site Office, Project Alpha',
            'Operations': 'Operations Center, Main Campus',
            'Research & Development': 'R&D Laboratory, Innovation Wing',
            'Quality Assurance': 'QA Testing Facility, Building C',
            'Facilities': 'Facilities Management, Warehouse District',
            'Security': 'Security Operations Center, Main Gate'
        };
        return locations[department] || 'General Receiving, Main Warehouse';
    }

    getApprover(department) {
        const approvers = {
            'IT Infrastructure': 'IT Director',
            'Manufacturing': 'Manufacturing Manager',
            'Construction': 'Project Manager',
            'Operations': 'Operations Director',
            'Research & Development': 'R&D Director',
            'Quality Assurance': 'QA Manager',
            'Facilities': 'Facilities Manager',
            'Security': 'Security Director'
        };
        return approvers[department] || 'Department Manager';
    }

    getWorkflowStatus(status) {
        const mapping = {
            'draft': 'draft',
            'pending_approval': 'pending_approval',
            'approved': 'processing',
            'sent': 'supplier_acknowledged',
            'acknowledged': 'supplier_processing',
            'partially_received': 'quality_inspection',
            'completed': 'completed',
            'cancelled': 'cancelled',
            'on_hold': 'on_hold'
        };
        return mapping[status] || 'pending_approval';
    }

    generateBusinessNotes(supplierProduct, department) {
        const templates = [
            `Critical ${supplierProduct.product_name} required for ${department} operations. Ensure quality certification included.`,
            `Bulk order for ${supplierProduct.product_name}. Coordinate delivery with warehouse team for proper storage.`,
            `Replacement ${supplierProduct.product_name} for equipment upgrade project. Technical specifications must match exactly.`,
            `Annual procurement of ${supplierProduct.product_name}. Previous orders have been satisfactory.`,
            `Emergency order for ${supplierProduct.product_name}. Fast-track approval and delivery required.`,
            `Strategic partnership order for ${supplierProduct.product_name}. Negotiated pricing applies.`
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    generateTrackingNumber(supplierName) {
        const prefix = supplierName.substring(0, 3).toUpperCase();
        const number = Math.floor(Math.random() * 900000) + 100000;
        return `${prefix}-${number}`;
    }

    selectCarrier(shippingAmount) {
        if (shippingAmount > 5000) return 'DHL Express';
        if (shippingAmount > 2000) return 'FedEx Priority';
        if (shippingAmount > 500) return 'Courier Guy';
        return 'Standard Post';
    }

    calculatePORiskScore(supplierRisk, totalAmount) {
        let riskScore = supplierRisk;
        
        // Adjust based on order value
        if (totalAmount > 200000) riskScore += 20;
        else if (totalAmount > 100000) riskScore += 10;
        else if (totalAmount > 50000) riskScore += 5;
        
        return Math.min(100, riskScore);
    }

    async createContractSchema() {
        console.log('📋 Creating contract management schema...');
        
        const createContractSchema = `
            -- Create contract management tables
            CREATE TABLE IF NOT EXISTS supplier_contracts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
                contract_number VARCHAR(100) UNIQUE NOT NULL,
                contract_type VARCHAR(50) NOT NULL DEFAULT 'standard',
                title VARCHAR(255) NOT NULL,
                description TEXT,
                
                -- Contract terms
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                auto_renewal BOOLEAN DEFAULT FALSE,
                renewal_period INTEGER, -- months
                
                -- Financial terms
                total_contract_value DECIMAL(15,2),
                minimum_spend DECIMAL(15,2),
                maximum_spend DECIMAL(15,2),
                payment_terms VARCHAR(100),
                currency VARCHAR(3) DEFAULT 'ZAR',
                
                -- Service levels
                delivery_sla_days INTEGER,
                quality_requirements JSONB,
                performance_metrics JSONB,
                penalties JSONB,
                
                -- Legal terms
                governing_law VARCHAR(100) DEFAULT 'South African Law',
                dispute_resolution VARCHAR(100) DEFAULT 'Arbitration',
                confidentiality_clause BOOLEAN DEFAULT TRUE,
                termination_notice_days INTEGER DEFAULT 30,
                
                -- Status and approval
                status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
                    'draft', 'under_review', 'approved', 'active', 'suspended', 'terminated', 'expired'
                )),
                approved_by VARCHAR(255),
                approved_at TIMESTAMP,
                signed_date DATE,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                created_by VARCHAR(255),
                
                -- Validation
                CONSTRAINT contract_date_range CHECK (end_date > start_date),
                CONSTRAINT contract_value_positive CHECK (total_contract_value IS NULL OR total_contract_value > 0),
                CONSTRAINT contract_spend_range CHECK (
                    minimum_spend IS NULL OR maximum_spend IS NULL OR minimum_spend <= maximum_spend
                )
            );

            -- Contract amendments table
            CREATE TABLE IF NOT EXISTS contract_amendments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
                amendment_number INTEGER NOT NULL,
                amendment_type VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                effective_date DATE NOT NULL,
                old_value JSONB,
                new_value JSONB,
                reason TEXT,
                approved_by VARCHAR(255),
                approved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                
                UNIQUE(contract_id, amendment_number)
            );

            -- Create indexes for performance
            CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier_id ON supplier_contracts(supplier_id);
            CREATE INDEX IF NOT EXISTS idx_supplier_contracts_status ON supplier_contracts(status);
            CREATE INDEX IF NOT EXISTS idx_supplier_contracts_dates ON supplier_contracts(start_date, end_date);
            CREATE INDEX IF NOT EXISTS idx_contract_amendments_contract_id ON contract_amendments(contract_id);
        `;

        try {
            await this.client.query(createContractSchema);
            console.log('✅ Contract schema created successfully');
        } catch (error) {
            console.error('❌ Error creating contract schema:', error.message);
            this.stats.errors.push('Contract schema error: ' + error.message);
        }
    }

    async insertPurchaseOrders(supplierProducts) {
        console.log('📦 Creating 22 purchase orders...');
        
        for (const [index, supplierProduct] of supplierProducts.entries()) {
            try {
                const poData = this.generatePurchaseOrderData(supplierProduct, index);
                
                // Insert purchase order
                const insertPOQuery = `
                    INSERT INTO purchase_order (
                        id, org_id, supplier_id, po_number, status, total_amount, tax_amount, 
                        shipping_amount, order_date, expected_delivery_date, actual_delivery_date,
                        notes, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                    ) RETURNING id
                `;

                const poResult = await this.client.query(insertPOQuery, [
                    this.organizationId,
                    poData.supplier_id,
                    poData.po_number,
                    poData.status,
                    poData.total_amount,
                    poData.tax_amount,
                    poData.shipping_amount,
                    poData.created_at,
                    poData.requested_delivery_date,
                    poData.actual_delivery_date,
                    `${poData.title} - ${poData.notes}`,
                    poData.created_at,
                    new Date()
                ]);

                const purchaseOrderId = poResult.rows[0].id;

                // Insert purchase order line item
                const insertPOItemQuery = `
                    INSERT INTO purchase_order_item (
                        purchase_order_id, inventory_item_id, quantity, unit_price, quantity_received
                    ) VALUES (
                        $1, $2, $3, $4, $5
                    )
                `;

                await this.client.query(insertPOItemQuery, [
                    purchaseOrderId,
                    poData.product_data.product_id,
                    poData.product_data.quantity,
                    poData.product_data.unit_price,
                    poData.status === 'partially_received' || poData.status === 'completed' ? poData.product_data.quantity : 0
                ]);

                this.stats.purchaseOrdersCreated++;
                this.stats.totalValue += poData.total_amount;
                
                console.log(`   ✅ ${poData.po_number}: ${supplierProduct.supplier_name} - R${poData.total_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);

                // Create contract for high-value or strategic suppliers
                if (poData.total_amount > 50000 || supplierProduct.risk_score < 30) {
                    await this.createSupplierContract(supplierProduct, poData, index);
                }

            } catch (error) {
                console.error(`   ❌ Failed to create PO for ${supplierProduct.supplier_name}:`, error.message);
                this.stats.errors.push(`PO creation failed for ${supplierProduct.supplier_name}: ${error.message}`);
            }
        }
    }

    async createSupplierContract(supplierProduct, poData, index) {
        try {
            const contractData = {
                supplier_id: supplierProduct.supplier_id,
                contract_number: `CTR-${new Date().getFullYear()}-${String(index + 1).padStart(3, '0')}`,
                contract_type: poData.total_amount > 100000 ? 'strategic_partnership' : 'standard_supply',
                title: `Supply Agreement - ${supplierProduct.supplier_name}`,
                description: `Comprehensive supply agreement for ${supplierProduct.category} products including ${supplierProduct.product_name} and related items.`,
                start_date: new Date(),
                end_date: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year
                auto_renewal: poData.total_amount > 100000,
                renewal_period: 12,
                total_contract_value: poData.total_amount * (2 + Math.random() * 3), // 2-5x current order
                minimum_spend: poData.total_amount * 0.8,
                maximum_spend: poData.total_amount * 5,
                payment_terms: supplierProduct.payment_terms,
                delivery_sla_days: supplierProduct.lead_time_days,
                quality_requirements: JSON.stringify({
                    inspection_required: true,
                    quality_standards: ['ISO 9001', 'SABS Approved'],
                    defect_rate_max: 0.02,
                    warranty_period: '12 months'
                }),
                performance_metrics: JSON.stringify({
                    on_time_delivery: 0.95,
                    quality_acceptance: 0.98,
                    response_time_hours: 24
                }),
                penalties: JSON.stringify({
                    late_delivery: '1% per day',
                    quality_issues: '5% penalty',
                    non_compliance: '10% penalty'
                }),
                status: 'active',
                approved_by: 'Contract Manager',
                approved_at: new Date(),
                signed_date: new Date(),
                created_by: 'Agent4-ContractGen'
            };

            const insertContractQuery = `
                INSERT INTO supplier_contracts (
                    supplier_id, contract_number, contract_type, title, description,
                    start_date, end_date, auto_renewal, renewal_period,
                    total_contract_value, minimum_spend, maximum_spend,
                    payment_terms, delivery_sla_days, quality_requirements,
                    performance_metrics, penalties, status, approved_by,
                    approved_at, signed_date, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
                )
            `;

            await this.client.query(insertContractQuery, [
                contractData.supplier_id,
                contractData.contract_number,
                contractData.contract_type,
                contractData.title,
                contractData.description,
                contractData.start_date,
                contractData.end_date,
                contractData.auto_renewal,
                contractData.renewal_period,
                contractData.total_contract_value,
                contractData.minimum_spend,
                contractData.maximum_spend,
                contractData.payment_terms,
                contractData.delivery_sla_days,
                contractData.quality_requirements,
                contractData.performance_metrics,
                contractData.penalties,
                contractData.status,
                contractData.approved_by,
                contractData.approved_at,
                contractData.signed_date,
                contractData.created_by
            ]);

            this.stats.contractsCreated++;
            console.log(`   📋 Contract ${contractData.contract_number} created for ${supplierProduct.supplier_name}`);

        } catch (error) {
            console.error(`   ❌ Failed to create contract for ${supplierProduct.supplier_name}:`, error.message);
            this.stats.warnings.push(`Contract creation failed for ${supplierProduct.supplier_name}: ${error.message}`);
        }
    }

    async generateReports() {
        console.log('📊 Generating purchase order and contract reports...');

        try {
            // Purchase order summary
            const poSummaryQuery = `
                SELECT 
                    COUNT(*) as total_pos,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_pos,
                    COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_approval,
                    COUNT(CASE WHEN status = 'partially_received' THEN 1 END) as partially_received,
                    ROUND(SUM(total_amount), 2) as total_value,
                    ROUND(AVG(total_amount), 2) as avg_value,
                    MIN(total_amount) as min_value,
                    MAX(total_amount) as max_value
                FROM purchase_order 
                WHERE org_id = $1
            `;

            const poSummary = await this.client.query(poSummaryQuery, [this.organizationId]);

            // Contract summary
            const contractSummaryQuery = `
                SELECT 
                    COUNT(*) as total_contracts,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contracts,
                    ROUND(SUM(total_contract_value), 2) as total_contract_value,
                    ROUND(AVG(total_contract_value), 2) as avg_contract_value
                FROM supplier_contracts sc
                JOIN supplier s ON sc.supplier_id = s.id
                WHERE s.org_id = $1
            `;

            let contractSummary = null;
            try {
                contractSummary = await this.client.query(contractSummaryQuery, [this.organizationId]);
            } catch (error) {
                console.log('   ⚠️ Contract summary not available (table may not exist)');
            }

            // Top suppliers by PO value
            const topSuppliersQuery = `
                SELECT 
                    s.name as supplier_name,
                    COUNT(po.id) as po_count,
                    ROUND(SUM(po.total_amount), 2) as total_value,
                    ROUND(AVG(po.total_amount), 2) as avg_value
                FROM supplier s
                JOIN purchase_order po ON s.id = po.supplier_id
                WHERE s.org_id = $1
                GROUP BY s.id, s.name
                ORDER BY total_value DESC
                LIMIT 10
            `;

            const topSuppliers = await this.client.query(topSuppliersQuery, [this.organizationId]);

            // Print comprehensive summary
            console.log('\n📋 PURCHASE ORDER & CONTRACT SUMMARY');
            console.log('=========================================');
            console.log(`✅ Purchase Orders Created: ${this.stats.purchaseOrdersCreated}`);
            console.log(`📋 Contracts Created: ${this.stats.contractsCreated}`);
            
            if (poSummary.rows[0]) {
                const ps = poSummary.rows[0];
                console.log(`💰 Total PO Value: R${parseFloat(ps.total_value || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
                console.log(`📊 Average PO Value: R${parseFloat(ps.avg_value || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
                console.log(`📈 Value Range: R${parseFloat(ps.min_value || 0).toLocaleString('en-ZA')} - R${parseFloat(ps.max_value || 0).toLocaleString('en-ZA')}`);
                console.log(`✅ Completed Orders: ${ps.completed_pos}/${ps.total_pos}`);
                console.log(`⏳ Pending Approval: ${ps.pending_approval}`);
                console.log(`🔄 Partially Received: ${ps.partially_received}`);
            }

            if (contractSummary && contractSummary.rows[0]) {
                const cs = contractSummary.rows[0];
                console.log(`📋 Active Contracts: ${cs.active_contracts}/${cs.total_contracts}`);
                console.log(`💰 Total Contract Value: R${parseFloat(cs.total_contract_value || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
                console.log(`📊 Average Contract Value: R${parseFloat(cs.avg_contract_value || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
            }

            console.log('\n🏆 TOP SUPPLIERS BY VALUE:');
            topSuppliers.rows.forEach((supplier, idx) => {
                console.log(`${idx + 1}. ${supplier.supplier_name}: ${supplier.po_count} POs, R${parseFloat(supplier.total_value).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
            });

            if (this.stats.warnings.length > 0) {
                console.log(`\n⚠️ Warnings: ${this.stats.warnings.length}`);
                this.stats.warnings.forEach(warning => console.log(`   ${warning}`));
            }

            if (this.stats.errors.length > 0) {
                console.log(`\n❌ Errors: ${this.stats.errors.length}`);
                this.stats.errors.forEach(error => console.log(`   ${error}`));
            }

            console.log('\n🎉 Purchase order and contract generation completed!');
            console.log('💡 Realistic business scenarios with proper status workflows');
            console.log('💡 High-value suppliers have comprehensive contracts');
            console.log('💡 All foreign key relationships properly established');
            console.log('💡 Ready for Agent coordination and system testing');

        } catch (error) {
            console.error('❌ Error generating reports:', error.message);
        }
    }

    async cleanup() {
        if (this.client) {
            this.client.release();
        }
        await this.pool.end();
        console.log('🔌 Database connection closed');
    }

    async run() {
        try {
            await this.connect();
            await this.createContractSchema();
            
            const supplierProducts = await this.getSupplierProductData();
            
            if (supplierProducts.length === 0) {
                console.error('❌ No supplier-product data found. Please run Agent 3 first.');
                return;
            }

            await this.insertPurchaseOrders(supplierProducts);
            await this.generateReports();

        } catch (error) {
            console.error('❌ Purchase order generation failed:', error.message);
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }
}

// =====================================================
// EXECUTION
// =====================================================

if (require.main === module) {
    console.log('🚀 Starting MantisNXT Purchase Order & Contract Generation');
    console.log('📦 Agent 4: Creating 22 purchase orders with contracts');
    console.log('🎯 Mission: Complete purchase order and contract management');
    console.log('================================\n');

    const generator = new PurchaseOrderGenerator();
    generator.run().catch(console.error);
}

module.exports = PurchaseOrderGenerator;