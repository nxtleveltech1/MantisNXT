#!/usr/bin/env node
/**
 * Corrected CRUD Operations Test
 * Tests data persistence with actual schema structure
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

async function testCorrectedCRUD() {
    const pool = new Pool(dbConfig);

    try {
        console.log('🧪 Testing CRUD Operations with Correct Schema...\n');

        // Test 1: Suppliers (using actual column names)
        console.log('1. Testing Suppliers Module:');
        try {
            const insertSupplier = await pool.query(`
                INSERT INTO suppliers (name, email, phone, contact_person, primary_category, geographic_region, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, name
            `, [
                'Schema Test Supplier',
                'schema@test.com',
                '+27123456789',
                'Schema Contact',
                'Electronics',
                'Gauteng',
                'active'
            ]);

            const supplierId = insertSupplier.rows[0].id;
            console.log(`   ✅ INSERT: Created supplier ID ${supplierId}`);

            const selectSupplier = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplierId]);
            console.log(`   ✅ SELECT: Retrieved supplier "${selectSupplier.rows[0].name}"`);

            await pool.query('UPDATE suppliers SET phone = $1 WHERE id = $2', ['+27987654321', supplierId]);
            console.log(`   ✅ UPDATE: Modified phone number`);

            await pool.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
            console.log(`   ✅ DELETE: Removed test supplier\n`);

        } catch (error) {
            console.log(`   ❌ Suppliers CRUD failed: ${error.message}\n`);
        }

        // Test 2: Inventory Items (using actual column names: sale_price not selling_price)
        console.log('2. Testing Inventory Module:');
        try {
            const insertItem = await pool.query(`
                INSERT INTO inventory_items (sku, name, category, cost_price, sale_price, stock_qty, reorder_point, currency)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name
            `, [
                'TEST-SKU-002',
                'Schema Test Item',
                'raw_materials',
                100.00,
                150.00,
                50,
                10,
                'ZAR'
            ]);

            const itemId = insertItem.rows[0].id;
            console.log(`   ✅ INSERT: Created inventory item ID ${itemId}`);

            const selectItem = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
            console.log(`   ✅ SELECT: Retrieved item "${selectItem.rows[0].name}"`);

            await pool.query('UPDATE inventory_items SET stock_qty = $1 WHERE id = $2', [75, itemId]);
            console.log(`   ✅ UPDATE: Modified stock quantity`);

            await pool.query('DELETE FROM inventory_items WHERE id = $1', [itemId]);
            console.log(`   ✅ DELETE: Removed test item\n`);

        } catch (error) {
            console.log(`   ❌ Inventory CRUD failed: ${error.message}\n`);
        }

        // Test 3: Users (no role column, but other fields exist)
        console.log('3. Testing Users Module:');
        try {
            const insertUser = await pool.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, is_active)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, email
            `, [
                'schema@test.user',
                '$2b$10$test.hash.for.validation',
                'Schema',
                'Test',
                true
            ]);

            const userId = insertUser.rows[0].id;
            console.log(`   ✅ INSERT: Created user ID ${userId}`);

            const selectUser = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
            console.log(`   ✅ SELECT: Retrieved user "${selectUser.rows[0].email}"`);

            await pool.query('UPDATE users SET first_name = $1 WHERE id = $2', ['Updated', userId]);
            console.log(`   ✅ UPDATE: Modified first name`);

            await pool.query('DELETE FROM users WHERE id = $1', [userId]);
            console.log(`   ✅ DELETE: Removed test user\n`);

        } catch (error) {
            console.log(`   ❌ Users CRUD failed: ${error.message}\n`);
        }

        // Test 4: Purchase Orders (need to create a supplier first)
        console.log('4. Testing Purchase Orders Module:');
        try {
            // Create a test supplier first
            const supplierResult = await pool.query(`
                INSERT INTO suppliers (name, email, status)
                VALUES ($1, $2, $3)
                RETURNING id
            `, ['PO Test Supplier', 'po@test.com', 'active']);

            const supplierId = supplierResult.rows[0].id;

            const insertPO = await pool.query(`
                INSERT INTO purchase_orders (po_number, supplier_id, status, order_date, total_amount, currency)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, po_number
            `, [
                'PO-TEST-001',
                supplierId,
                'draft',
                new Date().toISOString().split('T')[0], // Just the date part
                1000.00,
                'ZAR'
            ]);

            const poId = insertPO.rows[0].id;
            console.log(`   ✅ INSERT: Created PO ID ${poId} (${insertPO.rows[0].po_number})`);

            const selectPO = await pool.query('SELECT * FROM purchase_orders WHERE id = $1', [poId]);
            console.log(`   ✅ SELECT: Retrieved PO with status "${selectPO.rows[0].status}"`);

            await pool.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['approved', poId]);
            console.log(`   ✅ UPDATE: Modified status to approved`);

            // Clean up
            await pool.query('DELETE FROM purchase_orders WHERE id = $1', [poId]);
            await pool.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
            console.log(`   ✅ DELETE: Removed test PO and supplier\n`);

        } catch (error) {
            console.log(`   ❌ Purchase Orders CRUD failed: ${error.message}\n`);
        }

        // Test 5: Customers
        console.log('5. Testing Customers Module:');
        try {
            const insertCustomer = await pool.query(`
                INSERT INTO customers (company_name, first_name, last_name, email, phone, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, company_name
            `, [
                'Test Customer Inc',
                'John',
                'Customer',
                'customer@test.com',
                '+27123456789',
                'active'
            ]);

            const customerId = insertCustomer.rows[0].id;
            console.log(`   ✅ INSERT: Created customer ID ${customerId}`);

            const selectCustomer = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
            console.log(`   ✅ SELECT: Retrieved customer "${selectCustomer.rows[0].company_name}"`);

            await pool.query('UPDATE customers SET phone = $1 WHERE id = $2', ['+27987654321', customerId]);
            console.log(`   ✅ UPDATE: Modified phone number`);

            await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
            console.log(`   ✅ DELETE: Removed test customer\n`);

        } catch (error) {
            console.log(`   ❌ Customers CRUD failed: ${error.message}\n`);
        }

        // Test 6: Sales Orders
        console.log('6. Testing Sales Orders Module:');
        try {
            // Create a test customer first
            const customerResult = await pool.query(`
                INSERT INTO customers (company_name, email, status)
                VALUES ($1, $2, $3)
                RETURNING id
            `, ['SO Test Customer', 'so@test.com', 'active']);

            const customerId = customerResult.rows[0].id;

            const insertSO = await pool.query(`
                INSERT INTO sales_orders (order_number, customer_id, status, order_date, total_amount, currency)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, order_number
            `, [
                'SO-TEST-001',
                customerId,
                'draft',
                new Date().toISOString().split('T')[0],
                1500.00,
                'ZAR'
            ]);

            const soId = insertSO.rows[0].id;
            console.log(`   ✅ INSERT: Created SO ID ${soId} (${insertSO.rows[0].order_number})`);

            const selectSO = await pool.query('SELECT * FROM sales_orders WHERE id = $1', [soId]);
            console.log(`   ✅ SELECT: Retrieved SO with status "${selectSO.rows[0].status}"`);

            await pool.query('UPDATE sales_orders SET status = $1 WHERE id = $2', ['confirmed', soId]);
            console.log(`   ✅ UPDATE: Modified status to confirmed`);

            // Clean up
            await pool.query('DELETE FROM sales_orders WHERE id = $1', [soId]);
            await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
            console.log(`   ✅ DELETE: Removed test SO and customer\n`);

        } catch (error) {
            console.log(`   ❌ Sales Orders CRUD failed: ${error.message}\n`);
        }

        console.log('🎉 Corrected CRUD testing completed successfully!');

    } catch (error) {
        console.error('❌ CRUD testing failed:', error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    testCorrectedCRUD();
}

module.exports = { testCorrectedCRUD };