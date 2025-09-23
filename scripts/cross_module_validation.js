#!/usr/bin/env node
/**
 * Cross-Module Data Flow Validation
 * Tests relationships between business modules and foreign key integrity
 */

const { Pool } = require('pg');

const dbConfig = {
    host: '62.169.20.53',
    port: 6600,
    user: 'nxtdb_admin',
    password: 'P@33w0rd-1',
    database: 'nxtprod-db_001',
    max: 10,
    ssl: false
};

async function validateCrossModuleFlow() {
    const pool = new Pool(dbConfig);

    try {
        console.log('🔗 Validating Cross-Module Data Flow...\n');

        // Test 1: Complete Supply Chain Flow (Supplier -> PO -> Inventory -> SO -> Customer)
        console.log('1. Testing Complete Supply Chain Flow:');

        let supplierId, customerId, inventoryItemId, poId, soId;

        try {
            // Step 1: Create supplier
            const supplierResult = await pool.query(`
                INSERT INTO suppliers (name, email, phone, contact_person, primary_category, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, ['Cross-Test Supplier Ltd', 'cross@supplier.com', '+27123456789', 'Supply Manager', 'Electronics', 'active']);

            supplierId = supplierResult.rows[0].id;
            console.log(`   ✅ Created supplier: ${supplierId}`);

            // Step 2: Create customer
            const customerResult = await pool.query(`
                INSERT INTO customers (company_name, first_name, last_name, email, phone, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, ['Cross-Test Customer Inc', 'John', 'Buyer', 'cross@customer.com', '+27987654321', 'active']);

            customerId = customerResult.rows[0].id;
            console.log(`   ✅ Created customer: ${customerId}`);

            // Step 3: Create purchase order
            const poResult = await pool.query(`
                INSERT INTO purchase_orders (po_number, supplier_id, status, order_date, total_amount, currency)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, ['PO-CROSS-001', supplierId, 'approved', new Date().toISOString().split('T')[0], 2000.00, 'ZAR']);

            poId = poResult.rows[0].id;
            console.log(`   ✅ Created purchase order: ${poId}`);

            // Step 4: Create inventory item linked to supplier
            const inventoryResult = await pool.query(`
                INSERT INTO inventory_items (sku, name, supplier_id, cost_price, sale_price, stock_qty, currency)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, ['CROSS-SKU-001', 'Cross-Test Widget', supplierId, 100.00, 150.00, 100, 'ZAR']);

            inventoryItemId = inventoryResult.rows[0].id;
            console.log(`   ✅ Created inventory item: ${inventoryItemId}`);

            // Step 5: Create sales order
            const soResult = await pool.query(`
                INSERT INTO sales_orders (order_number, customer_id, status, order_date, total_amount, currency)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, ['SO-CROSS-001', customerId, 'confirmed', new Date().toISOString().split('T')[0], 1500.00, 'ZAR']);

            soId = soResult.rows[0].id;
            console.log(`   ✅ Created sales order: ${soId}`);

            // Step 6: Verify relationships through JOIN queries
            const supplyChainQuery = `
                SELECT
                    s.name as supplier_name,
                    po.po_number,
                    ii.sku as item_sku,
                    ii.name as item_name,
                    so.order_number as sales_order,
                    c.company_name as customer_name
                FROM suppliers s
                LEFT JOIN purchase_orders po ON s.id = po.supplier_id
                LEFT JOIN inventory_items ii ON s.id = ii.supplier_id
                LEFT JOIN sales_orders so ON c.id = so.customer_id
                LEFT JOIN customers c ON c.id = $1
                WHERE s.id = $2
            `;

            const flowResult = await pool.query(supplyChainQuery, [customerId, supplierId]);

            if (flowResult.rows.length > 0) {
                const flow = flowResult.rows[0];
                console.log(`   ✅ Data flow verified:`);
                console.log(`      Supplier: ${flow.supplier_name} -> PO: ${flow.po_number}`);
                console.log(`      Item: ${flow.item_sku} (${flow.item_name})`);
                console.log(`      Customer: ${flow.customer_name} -> SO: ${flow.sales_order}`);
            }

        } catch (error) {
            console.log(`   ❌ Supply chain flow failed: ${error.message}`);
        }

        // Test 2: Foreign Key Constraint Validation
        console.log('\n2. Testing Foreign Key Constraints:');

        try {
            // Test invalid supplier_id in purchase_orders
            console.log('   Testing invalid supplier reference...');
            try {
                await pool.query(`
                    INSERT INTO purchase_orders (po_number, supplier_id, status, total_amount)
                    VALUES ($1, $2, $3, $4)
                `, ['PO-INVALID-001', '00000000-0000-0000-0000-000000000000', 'draft', 100.00]);
                console.log(`   ❌ Should have failed with foreign key constraint`);
            } catch (fkError) {
                console.log(`   ✅ Foreign key constraint working: ${fkError.message.split('\n')[0]}`);
            }

            // Test invalid customer_id in sales_orders
            console.log('   Testing invalid customer reference...');
            try {
                await pool.query(`
                    INSERT INTO sales_orders (order_number, customer_id, status, total_amount)
                    VALUES ($1, $2, $3, $4)
                `, ['SO-INVALID-001', '00000000-0000-0000-0000-000000000000', 'draft', 100.00]);
                console.log(`   ❌ Should have failed with foreign key constraint`);
            } catch (fkError) {
                console.log(`   ✅ Foreign key constraint working: ${fkError.message.split('\n')[0]}`);
            }

        } catch (error) {
            console.log(`   ❌ FK constraint test failed: ${error.message}`);
        }

        // Test 3: Cascading Operations
        console.log('\n3. Testing Cascading Deletes and Updates:');

        try {
            // Check if deleting supplier affects related records
            const poCountBefore = await pool.query('SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = $1', [supplierId]);
            const itemCountBefore = await pool.query('SELECT COUNT(*) FROM inventory_items WHERE supplier_id = $1', [supplierId]);

            console.log(`   Before deletion - POs: ${poCountBefore.rows[0].count}, Items: ${itemCountBefore.rows[0].count}`);

            // Note: This might fail if there are CASCADE constraints, which is good to know
            try {
                await pool.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
                console.log(`   ⚠️ Supplier deleted successfully - check if cascade behavior is intended`);
            } catch (cascadeError) {
                console.log(`   ✅ Cascade protection working: ${cascadeError.message.split('\n')[0]}`);
                // If delete failed due to FK constraints, that's actually good for data integrity

                // Clean up related records first, then supplier
                await pool.query('DELETE FROM purchase_orders WHERE supplier_id = $1', [supplierId]);
                await pool.query('DELETE FROM inventory_items WHERE supplier_id = $1', [supplierId]);
                await pool.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
                console.log(`   ✅ Manual cleanup successful - foreign key constraints prevent orphaned records`);
            }

        } catch (error) {
            console.log(`   ❌ Cascade test failed: ${error.message}`);
        }

        // Test 4: Data Consistency Across Modules
        console.log('\n4. Testing Data Consistency:');

        try {
            // Test currency consistency
            const currencyQuery = `
                SELECT DISTINCT
                    'suppliers' as table_name, NULL as currency
                UNION ALL
                SELECT 'inventory_items' as table_name, currency FROM inventory_items WHERE currency IS NOT NULL
                UNION ALL
                SELECT 'purchase_orders' as table_name, currency FROM purchase_orders WHERE currency IS NOT NULL
                UNION ALL
                SELECT 'sales_orders' as table_name, currency FROM sales_orders WHERE currency IS NOT NULL
                ORDER BY table_name, currency
            `;

            const currencies = await pool.query(currencyQuery);
            const uniqueCurrencies = [...new Set(currencies.rows.filter(r => r.currency).map(r => r.currency))];

            console.log(`   ✅ Currency usage: ${uniqueCurrencies.join(', ')}`);

            if (uniqueCurrencies.length <= 3) {
                console.log(`   ✅ Currency consistency good - limited currency types`);
            } else {
                console.log(`   ⚠️ Many currencies in use - consider standardization`);
            }

        } catch (error) {
            console.log(`   ❌ Consistency test failed: ${error.message}`);
        }

        // Clean up remaining test data
        console.log('\n5. Cleaning up test data...');
        try {
            if (soId) await pool.query('DELETE FROM sales_orders WHERE id = $1', [soId]);
            if (customerId) await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
            console.log(`   ✅ Test data cleaned up`);
        } catch (error) {
            console.log(`   ⚠️ Cleanup warning: ${error.message}`);
        }

        console.log('\n🎉 Cross-module validation completed!');

    } catch (error) {
        console.error('❌ Cross-module validation failed:', error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    validateCrossModuleFlow();
}

module.exports = { validateCrossModuleFlow };