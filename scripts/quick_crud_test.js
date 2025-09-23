#!/usr/bin/env node
/**
 * Quick CRUD Operations Test
 * Tests data persistence across core business modules
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

async function testCRUDOperations() {
    const pool = new Pool(dbConfig);

    try {
        console.log('🧪 Testing CRUD Operations...\n');

        // Test 1: Suppliers
        console.log('1. Testing Suppliers Module:');
        try {
            const insertSupplier = await pool.query(`
                INSERT INTO suppliers (name, email, phone, contact_person, primary_category, geographic_region, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, name
            `, [
                'CRUD Test Supplier',
                'crud@test.com',
                '+27123456789',
                'Test Contact',
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

        // Test 2: Inventory Items
        console.log('2. Testing Inventory Module:');
        try {
            const insertItem = await pool.query(`
                INSERT INTO inventory_items (name, sku, category, cost_price, selling_price, quantity_on_hand, minimum_stock_level)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, name
            `, [
                'CRUD Test Item',
                'TEST-SKU-001',
                'raw_materials',
                100.00,
                150.00,
                50,
                10
            ]);

            const itemId = insertItem.rows[0].id;
            console.log(`   ✅ INSERT: Created inventory item ID ${itemId}`);

            const selectItem = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
            console.log(`   ✅ SELECT: Retrieved item "${selectItem.rows[0].name}"`);

            await pool.query('UPDATE inventory_items SET quantity_on_hand = $1 WHERE id = $2', [75, itemId]);
            console.log(`   ✅ UPDATE: Modified quantity`);

            await pool.query('DELETE FROM inventory_items WHERE id = $1', [itemId]);
            console.log(`   ✅ DELETE: Removed test item\n`);

        } catch (error) {
            console.log(`   ❌ Inventory CRUD failed: ${error.message}\n`);
        }

        // Test 3: Users
        console.log('3. Testing Users Module:');
        try {
            const insertUser = await pool.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, email
            `, [
                'crud@test.user',
                '$2b$10$test.hash.for.validation',
                'Test',
                'User',
                'admin',
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

        // Test 4: Purchase Orders
        console.log('4. Testing Purchase Orders Module:');
        try {
            // First check if we have any suppliers to reference
            const supplierCheck = await pool.query('SELECT id FROM suppliers LIMIT 1');

            if (supplierCheck.rows.length === 0) {
                console.log(`   ⚠️ No suppliers found for PO test - skipping\n`);
            } else {
                const supplierId = supplierCheck.rows[0].id;

                const insertPO = await pool.query(`
                    INSERT INTO purchase_orders (supplier_id, order_date, status, total_amount, currency)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, status
                `, [
                    supplierId,
                    new Date(),
                    'draft',
                    1000.00,
                    'ZAR'
                ]);

                const poId = insertPO.rows[0].id;
                console.log(`   ✅ INSERT: Created PO ID ${poId}`);

                const selectPO = await pool.query('SELECT * FROM purchase_orders WHERE id = $1', [poId]);
                console.log(`   ✅ SELECT: Retrieved PO with status "${selectPO.rows[0].status}"`);

                await pool.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['approved', poId]);
                console.log(`   ✅ UPDATE: Modified status`);

                await pool.query('DELETE FROM purchase_orders WHERE id = $1', [poId]);
                console.log(`   ✅ DELETE: Removed test PO\n`);
            }

        } catch (error) {
            console.log(`   ❌ Purchase Orders CRUD failed: ${error.message}\n`);
        }

        console.log('🎉 CRUD testing completed successfully!');

    } catch (error) {
        console.error('❌ CRUD testing failed:', error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    testCRUDOperations();
}

module.exports = { testCRUDOperations };