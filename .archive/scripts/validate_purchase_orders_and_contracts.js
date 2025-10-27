#!/usr/bin/env node

/**
 * =====================================================
 * PURCHASE ORDER & CONTRACT VALIDATION SUITE
 * Agent 4 - MantisNXT Purchase Order System Validation
 * =====================================================
 * 
 * Comprehensive validation of purchase orders, contracts, and relationships
 * Ensures data integrity and business logic compliance
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

class PurchaseOrderValidator {
    constructor() {
        this.pool = new Pool(dbConfig);
        this.organizationId = '00000000-0000-0000-0000-000000000001';
        this.validationResults = {
            purchaseOrders: {
                total: 0,
                valid: 0,
                errors: []
            },
            contracts: {
                total: 0,
                valid: 0,
                errors: []
            },
            relationships: {
                valid: 0,
                errors: []
            },
            businessLogic: {
                valid: 0,
                errors: []
            },
            warnings: []
        };
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

    async validatePurchaseOrders() {
        console.log('📦 Validating purchase orders...');

        try {
            // Check if we have the right table structure
            const tableCheck = await this.client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('purchase_order', 'purchase_orders_enhanced')
            `);

            const tableName = tableCheck.rows.find(t => t.table_name === 'purchase_orders_enhanced') 
                ? 'purchase_orders_enhanced' 
                : 'purchase_order';

            console.log(`   Using table: ${tableName}`);

            // Basic purchase order validation
            const poValidationQuery = `
                SELECT 
                    po.id,
                    po.po_number,
                    po.total_amount,
                    po.status,
                    s.name as supplier_name,
                    po.order_date,
                    po.${tableName === 'purchase_orders_enhanced' ? 'requested_delivery_date' : 'expected_delivery_date'} as delivery_date,
                    CASE 
                        WHEN po.total_amount < 0 THEN 'Negative amount'
                        WHEN po.order_date > CURRENT_DATE THEN 'Future order date'
                        WHEN po.${tableName === 'purchase_orders_enhanced' ? 'requested_delivery_date' : 'expected_delivery_date'} < po.order_date THEN 'Invalid delivery date'
                        ELSE 'Valid'
                    END as validation_status
                FROM ${tableName} po
                JOIN supplier s ON po.supplier_id = s.id
                WHERE ${tableName === 'purchase_orders_enhanced' ? 'po.org_id' : 's.org_id'} = $1
            `;

            const poResults = await this.client.query(poValidationQuery, [this.organizationId]);
            this.validationResults.purchaseOrders.total = poResults.rows.length;

            console.log(`   📊 Found ${poResults.rows.length} purchase orders`);

            poResults.rows.forEach(po => {
                if (po.validation_status === 'Valid') {
                    this.validationResults.purchaseOrders.valid++;
                } else {
                    this.validationResults.purchaseOrders.errors.push(
                        `PO ${po.po_number}: ${po.validation_status}`
                    );
                }
            });

            // Validate purchase order line items if enhanced table exists
            if (tableName === 'purchase_orders_enhanced') {
                const itemValidationQuery = `
                    SELECT 
                        poi.id,
                        po.po_number,
                        poi.line_number,
                        poi.quantity,
                        poi.unit_price,
                        poi.total_price,
                        CASE 
                            WHEN poi.quantity <= 0 THEN 'Invalid quantity'
                            WHEN poi.unit_price < 0 THEN 'Negative unit price'
                            WHEN ABS(poi.total_price - (poi.quantity * poi.unit_price)) > 0.01 THEN 'Price calculation error'
                            ELSE 'Valid'
                        END as validation_status
                    FROM purchase_order_items_enhanced poi
                    JOIN purchase_orders_enhanced po ON poi.purchase_order_id = po.id
                    WHERE po.org_id = $1
                `;

                const itemResults = await this.client.query(itemValidationQuery, [this.organizationId]);
                console.log(`   📦 Found ${itemResults.rows.length} purchase order line items`);

                itemResults.rows.forEach(item => {
                    if (item.validation_status !== 'Valid') {
                        this.validationResults.purchaseOrders.errors.push(
                            `PO ${item.po_number} Line ${item.line_number}: ${item.validation_status}`
                        );
                    }
                });
            }

        } catch (error) {
            console.error('❌ Error validating purchase orders:', error.message);
            this.validationResults.purchaseOrders.errors.push('Validation failed: ' + error.message);
        }
    }

    async validateContracts() {
        console.log('📋 Validating supplier contracts...');

        try {
            const contractValidationQuery = `
                SELECT 
                    c.id,
                    c.contract_number,
                    c.contract_type,
                    s.name as supplier_name,
                    c.total_contract_value,
                    c.start_date,
                    c.end_date,
                    c.status,
                    CASE 
                        WHEN c.start_date >= c.end_date THEN 'Invalid date range'
                        WHEN c.total_contract_value <= 0 THEN 'Invalid contract value'
                        WHEN c.minimum_spend > c.maximum_spend THEN 'Invalid spend range'
                        WHEN c.end_date < CURRENT_DATE AND c.status = 'active' THEN 'Expired but active'
                        ELSE 'Valid'
                    END as validation_status
                FROM supplier_contracts c
                JOIN supplier s ON c.supplier_id = s.id
                WHERE s.org_id = $1
            `;

            const contractResults = await this.client.query(contractValidationQuery, [this.organizationId]);
            this.validationResults.contracts.total = contractResults.rows.length;

            console.log(`   📊 Found ${contractResults.rows.length} supplier contracts`);

            contractResults.rows.forEach(contract => {
                if (contract.validation_status === 'Valid') {
                    this.validationResults.contracts.valid++;
                } else {
                    this.validationResults.contracts.errors.push(
                        `Contract ${contract.contract_number}: ${contract.validation_status}`
                    );
                }
            });

        } catch (error) {
            console.error('❌ Error validating contracts:', error.message);
            this.validationResults.contracts.errors.push('Contract validation failed: ' + error.message);
        }
    }

    async validateRelationships() {
        console.log('🔗 Validating foreign key relationships...');

        try {
            // Check supplier-purchase order relationships
            const supplierPOQuery = `
                SELECT 
                    COUNT(*) as orphaned_pos
                FROM purchase_order po
                LEFT JOIN supplier s ON po.supplier_id = s.id
                WHERE s.id IS NULL AND po.org_id = $1
            `;

            // Try enhanced table if available
            const enhancedPOQuery = `
                SELECT 
                    COUNT(*) as orphaned_pos
                FROM purchase_orders_enhanced po
                LEFT JOIN supplier s ON po.supplier_id = s.id
                WHERE s.id IS NULL AND po.org_id = $1
            `;

            let orphanedPOs = 0;
            try {
                const result = await this.client.query(enhancedPOQuery, [this.organizationId]);
                orphanedPOs = parseInt(result.rows[0].orphaned_pos);
            } catch (error) {
                // Fallback to standard table
                const result = await this.client.query(supplierPOQuery, [this.organizationId]);
                orphanedPOs = parseInt(result.rows[0].orphaned_pos);
            }

            if (orphanedPOs === 0) {
                this.validationResults.relationships.valid++;
                console.log('   ✅ All purchase orders have valid supplier relationships');
            } else {
                this.validationResults.relationships.errors.push(
                    `${orphanedPOs} purchase orders have invalid supplier references`
                );
            }

            // Check contract-supplier relationships
            const contractSupplierQuery = `
                SELECT 
                    COUNT(*) as orphaned_contracts
                FROM supplier_contracts c
                LEFT JOIN supplier s ON c.supplier_id = s.id
                WHERE s.id IS NULL
            `;

            const contractResult = await this.client.query(contractSupplierQuery);
            const orphanedContracts = parseInt(contractResult.rows[0].orphaned_contracts);

            if (orphanedContracts === 0) {
                this.validationResults.relationships.valid++;
                console.log('   ✅ All contracts have valid supplier relationships');
            } else {
                this.validationResults.relationships.errors.push(
                    `${orphanedContracts} contracts have invalid supplier references`
                );
            }

            // Check purchase order item relationships
            const itemRelationshipQuery = `
                SELECT 
                    COUNT(*) as orphaned_items
                FROM purchase_order_item poi
                LEFT JOIN purchase_order po ON poi.purchase_order_id = po.id
                LEFT JOIN inventory_item i ON poi.inventory_item_id = i.id
                WHERE po.id IS NULL OR i.id IS NULL
            `;

            try {
                const itemResult = await this.client.query(itemRelationshipQuery);
                const orphanedItems = parseInt(itemResult.rows[0].orphaned_items);

                if (orphanedItems === 0) {
                    this.validationResults.relationships.valid++;
                    console.log('   ✅ All purchase order items have valid relationships');
                } else {
                    this.validationResults.relationships.errors.push(
                        `${orphanedItems} purchase order items have invalid relationships`
                    );
                }
            } catch (error) {
                this.validationResults.warnings.push('Could not validate PO item relationships - table may not exist');
            }

        } catch (error) {
            console.error('❌ Error validating relationships:', error.message);
            this.validationResults.relationships.errors.push('Relationship validation failed: ' + error.message);
        }
    }

    async validateBusinessLogic() {
        console.log('💼 Validating business logic...');

        try {
            // Validate PO status workflow logic
            const statusLogicQuery = `
                SELECT 
                    po.po_number,
                    po.status,
                    po.approved_at,
                    po.sent_at,
                    po.acknowledged_at,
                    CASE 
                        WHEN po.status IN ('approved', 'sent', 'acknowledged', 'in_progress', 'shipped', 'received', 'completed') AND po.approved_at IS NULL THEN 'Missing approval timestamp'
                        WHEN po.status IN ('sent', 'acknowledged', 'in_progress', 'shipped', 'received', 'completed') AND po.sent_at IS NULL THEN 'Missing sent timestamp'
                        WHEN po.status IN ('acknowledged', 'in_progress', 'shipped', 'received', 'completed') AND po.acknowledged_at IS NULL THEN 'Missing acknowledgment timestamp'
                        ELSE 'Valid'
                    END as workflow_validation
                FROM ${await this.getTableName()} po
                WHERE po.org_id = $1
            `;

            const workflowResults = await this.client.query(statusLogicQuery, [this.organizationId]);
            
            workflowResults.rows.forEach(po => {
                if (po.workflow_validation === 'Valid') {
                    this.validationResults.businessLogic.valid++;
                } else {
                    this.validationResults.businessLogic.errors.push(
                        `PO ${po.po_number}: ${po.workflow_validation}`
                    );
                }
            });

            // Validate contract date logic
            const contractDateQuery = `
                SELECT 
                    c.contract_number,
                    c.start_date,
                    c.end_date,
                    c.status,
                    CASE 
                        WHEN c.end_date < CURRENT_DATE AND c.status = 'active' THEN 'Expired contract still active'
                        WHEN c.start_date > CURRENT_DATE AND c.status = 'active' THEN 'Future contract marked active'
                        ELSE 'Valid'
                    END as date_validation
                FROM supplier_contracts c
                JOIN supplier s ON c.supplier_id = s.id
                WHERE s.org_id = $1
            `;

            const contractDateResults = await this.client.query(contractDateQuery, [this.organizationId]);
            
            contractDateResults.rows.forEach(contract => {
                if (contract.date_validation === 'Valid') {
                    this.validationResults.businessLogic.valid++;
                } else {
                    this.validationResults.businessLogic.errors.push(
                        `Contract ${contract.contract_number}: ${contract.date_validation}`
                    );
                }
            });

        } catch (error) {
            console.error('❌ Error validating business logic:', error.message);
            this.validationResults.businessLogic.errors.push('Business logic validation failed: ' + error.message);
        }
    }

    async getTableName() {
        try {
            const tableCheck = await this.client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('purchase_order', 'purchase_orders_enhanced')
            `);

            return tableCheck.rows.find(t => t.table_name === 'purchase_orders_enhanced') 
                ? 'purchase_orders_enhanced' 
                : 'purchase_order';
        } catch (error) {
            return 'purchase_order';
        }
    }

    async generateDataQualityReport() {
        console.log('📊 Generating data quality report...');

        try {
            const tableName = await this.getTableName();

            // Purchase Order Statistics
            const poStatsQuery = `
                SELECT 
                    COUNT(*) as total_purchase_orders,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                    COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_approval,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                    ROUND(SUM(total_amount), 2) as total_value,
                    ROUND(AVG(total_amount), 2) as avg_order_value,
                    MIN(total_amount) as min_order_value,
                    MAX(total_amount) as max_order_value,
                    COUNT(DISTINCT supplier_id) as unique_suppliers,
                    COUNT(DISTINCT ${tableName === 'purchase_orders_enhanced' ? 'department' : 'created_by'}) as unique_departments
                FROM ${tableName} po
                WHERE ${tableName === 'purchase_orders_enhanced' ? 'po.org_id' : 'po.org_id'} = $1
            `;

            const poStats = await this.client.query(poStatsQuery, [this.organizationId]);

            // Contract Statistics
            const contractStatsQuery = `
                SELECT 
                    COUNT(*) as total_contracts,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contracts,
                    COUNT(CASE WHEN contract_type = 'strategic_partnership' THEN 1 END) as strategic_contracts,
                    ROUND(SUM(total_contract_value), 2) as total_contract_value,
                    ROUND(AVG(total_contract_value), 2) as avg_contract_value
                FROM supplier_contracts c
                JOIN supplier s ON c.supplier_id = s.id
                WHERE s.org_id = $1
            `;

            let contractStats = null;
            try {
                contractStats = await this.client.query(contractStatsQuery, [this.organizationId]);
            } catch (error) {
                console.log('   ⚠️ Contract statistics not available');
            }

            // Supplier Coverage Analysis
            const supplierCoverageQuery = `
                SELECT 
                    s.name as supplier_name,
                    COUNT(po.id) as po_count,
                    ROUND(SUM(po.total_amount), 2) as total_po_value,
                    CASE WHEN c.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_contract,
                    s.risk_score,
                    s.payment_terms
                FROM supplier s
                LEFT JOIN ${tableName} po ON s.id = po.supplier_id
                LEFT JOIN supplier_contracts c ON s.id = c.supplier_id
                WHERE s.org_id = $1
                GROUP BY s.id, s.name, s.risk_score, s.payment_terms, c.id
                ORDER BY total_po_value DESC NULLS LAST
            `;

            const supplierCoverage = await this.client.query(supplierCoverageQuery, [this.organizationId]);

            // Generate comprehensive report
            console.log('\n📋 DATA QUALITY VALIDATION REPORT');
            console.log('==========================================');
            
            if (poStats.rows[0]) {
                const ps = poStats.rows[0];
                console.log(`📦 Purchase Orders: ${ps.total_purchase_orders}`);
                console.log(`   ✅ Completed: ${ps.completed_orders}`);
                console.log(`   ⏳ Pending Approval: ${ps.pending_approval}`);
                console.log(`   🔄 In Progress: ${ps.in_progress}`);
                console.log(`   💰 Total Value: R${parseFloat(ps.total_value || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
                console.log(`   📊 Average Order: R${parseFloat(ps.avg_order_value || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
                console.log(`   📈 Value Range: R${parseFloat(ps.min_order_value || 0).toLocaleString('en-ZA')} - R${parseFloat(ps.max_order_value || 0).toLocaleString('en-ZA')}`);
                console.log(`   🏢 Suppliers with Orders: ${ps.unique_suppliers}`);
                console.log(`   🏬 Departments: ${ps.unique_departments}`);
            }

            if (contractStats && contractStats.rows[0]) {
                const cs = contractStats.rows[0];
                console.log(`\n📋 Contracts: ${cs.total_contracts}`);
                console.log(`   ✅ Active: ${cs.active_contracts}`);
                console.log(`   ⭐ Strategic: ${cs.strategic_contracts}`);
                console.log(`   💰 Total Value: R${parseFloat(cs.total_contract_value || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
                console.log(`   📊 Average Value: R${parseFloat(cs.avg_contract_value || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
            }

            console.log('\n🏆 SUPPLIER COVERAGE ANALYSIS:');
            supplierCoverage.rows.forEach((supplier, idx) => {
                const poValue = parseFloat(supplier.total_po_value || 0);
                const status = supplier.po_count > 0 ? `${supplier.po_count} POs, R${poValue.toLocaleString('en-ZA')}` : 'No POs';
                const contract = supplier.has_contract === 'Yes' ? '📋' : '  ';
                console.log(`${idx + 1}. ${contract} ${supplier.supplier_name}: ${status}`);
            });

        } catch (error) {
            console.error('❌ Error generating quality report:', error.message);
        }
    }

    async validateSystemIntegration() {
        console.log('🔧 Validating system integration...');

        try {
            // Check if all expected tables exist
            const tableExistenceQuery = `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN (
                    'supplier', 'inventory_item', 'purchase_order', 'purchase_orders_enhanced',
                    'purchase_order_item', 'purchase_order_items_enhanced',
                    'supplier_contracts', 'purchase_order_approvals', 'purchase_order_receipts'
                )
                ORDER BY table_name
            `;

            const tables = await this.client.query(tableExistenceQuery);
            const existingTables = tables.rows.map(t => t.table_name);

            console.log(`   📊 Database Tables Found: ${existingTables.length}`);
            existingTables.forEach(table => console.log(`      ✅ ${table}`));

            const expectedTables = [
                'supplier', 'inventory_item', 'purchase_order'
            ];

            const missingTables = expectedTables.filter(table => !existingTables.includes(table));
            if (missingTables.length > 0) {
                this.validationResults.warnings.push(
                    `Missing expected tables: ${missingTables.join(', ')}`
                );
            }

            // Validate data consistency across Agent 3 and Agent 4 data
            const dataConsistencyQuery = `
                SELECT 
                    'Data Consistency' as check_type,
                    (SELECT COUNT(*) FROM supplier WHERE org_id = $1) as suppliers,
                    (SELECT COUNT(*) FROM inventory_item WHERE org_id = $1) as products,
                    (SELECT COUNT(*) FROM ${await this.getTableName()} WHERE org_id = $1) as purchase_orders,
                    (SELECT COUNT(*) FROM supplier_contracts WHERE supplier_id IN (
                        SELECT id FROM supplier WHERE org_id = $1
                    )) as contracts
            `;

            const consistency = await this.client.query(dataConsistencyQuery, [this.organizationId]);
            const data = consistency.rows[0];

            console.log(`   🔗 Data Relationships:`);
            console.log(`      👥 Suppliers: ${data.suppliers}`);
            console.log(`      📦 Products: ${data.products}`);
            console.log(`      🛒 Purchase Orders: ${data.purchase_orders}`);
            console.log(`      📋 Contracts: ${data.contracts}`);

            // Validate that we have 22 of each key entity
            if (parseInt(data.suppliers) >= 22) {
                console.log('   ✅ Supplier count meets requirement (≥22)');
            } else {
                this.validationResults.warnings.push(`Only ${data.suppliers} suppliers found, expected ≥22`);
            }

            if (parseInt(data.purchase_orders) >= 22) {
                console.log('   ✅ Purchase order count meets requirement (≥22)');
            } else {
                this.validationResults.warnings.push(`Only ${data.purchase_orders} purchase orders found, expected ≥22`);
            }

        } catch (error) {
            console.error('❌ Error validating system integration:', error.message);
            this.validationResults.warnings.push('System integration validation failed: ' + error.message);
        }
    }

    async generateFinalReport() {
        console.log('\n📋 FINAL VALIDATION REPORT');
        console.log('=========================================');

        // Purchase Order Validation Summary
        console.log(`📦 Purchase Orders: ${this.validationResults.purchaseOrders.valid}/${this.validationResults.purchaseOrders.total} valid`);
        if (this.validationResults.purchaseOrders.errors.length > 0) {
            console.log('   ❌ Purchase Order Errors:');
            this.validationResults.purchaseOrders.errors.forEach(error => 
                console.log(`      ${error}`)
            );
        }

        // Contract Validation Summary
        console.log(`📋 Contracts: ${this.validationResults.contracts.valid}/${this.validationResults.contracts.total} valid`);
        if (this.validationResults.contracts.errors.length > 0) {
            console.log('   ❌ Contract Errors:');
            this.validationResults.contracts.errors.forEach(error => 
                console.log(`      ${error}`)
            );
        }

        // Relationship Validation Summary
        console.log(`🔗 Relationships: ${this.validationResults.relationships.valid} validations passed`);
        if (this.validationResults.relationships.errors.length > 0) {
            console.log('   ❌ Relationship Errors:');
            this.validationResults.relationships.errors.forEach(error => 
                console.log(`      ${error}`)
            );
        }

        // Business Logic Validation Summary
        console.log(`💼 Business Logic: ${this.validationResults.businessLogic.valid} validations passed`);
        if (this.validationResults.businessLogic.errors.length > 0) {
            console.log('   ❌ Business Logic Errors:');
            this.validationResults.businessLogic.errors.forEach(error => 
                console.log(`      ${error}`)
            );
        }

        // Warnings Summary
        if (this.validationResults.warnings.length > 0) {
            console.log(`\n⚠️ Warnings: ${this.validationResults.warnings.length}`);
            this.validationResults.warnings.forEach(warning => 
                console.log(`   ${warning}`)
            );
        }

        // Overall Status
        const totalErrors = this.validationResults.purchaseOrders.errors.length +
                          this.validationResults.contracts.errors.length +
                          this.validationResults.relationships.errors.length +
                          this.validationResults.businessLogic.errors.length;

        if (totalErrors === 0) {
            console.log('\n🎉 VALIDATION SUCCESSFUL!');
            console.log('✅ All purchase orders and contracts pass validation');
            console.log('✅ All relationships are properly established');
            console.log('✅ Business logic compliance verified');
            console.log('🚀 System ready for Agent coordination and testing');
        } else {
            console.log(`\n⚠️ VALIDATION COMPLETED WITH ${totalErrors} ERRORS`);
            console.log('🔧 Review and fix errors before proceeding to testing');
        }

        return totalErrors === 0;
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
            await this.validatePurchaseOrders();
            await this.validateContracts();
            await this.validateRelationships();
            await this.validateBusinessLogic();
            await this.generateDataQualityReport();
            
            return await this.generateFinalReport();

        } catch (error) {
            console.error('❌ Validation suite failed:', error.message);
            return false;
        } finally {
            await this.cleanup();
        }
    }
}

// =====================================================
// EXECUTION
// =====================================================

if (require.main === module) {
    console.log('🔍 Starting MantisNXT Purchase Order & Contract Validation');
    console.log('🎯 Agent 4: Validating purchase orders and contracts');
    console.log('📊 Comprehensive data quality and integrity checks');
    console.log('================================\n');

    const validator = new PurchaseOrderValidator();
    validator.run().then(success => {
        if (success) {
            console.log('\n✅ Agent 4 validation completed successfully');
            process.exit(0);
        } else {
            console.log('\n❌ Agent 4 validation completed with errors');
            process.exit(1);
        }
    }).catch(console.error);
}

module.exports = PurchaseOrderValidator;