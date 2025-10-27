#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixPurchaseOrdersColumns() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectionTimeoutMillis: 30000,
        query_timeout: 90000,
    });

    try {
        await client.connect();
        console.log('✅ Connected to fix purchase orders columns');

        // Check current structure of purchase_orders_enhanced
        console.log('\n🔍 Checking current purchase_orders_enhanced structure...');
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'purchase_orders_enhanced' 
            ORDER BY ordinal_position;
        `);

        console.log('📊 Current purchase_orders_enhanced columns:');
        columns.rows.forEach(row => {
            console.log(`  📝 ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Add missing columns
        console.log('\n📝 Adding missing columns to purchase_orders_enhanced...');
        const missingColumns = [
            "ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255)",
            "ADD COLUMN IF NOT EXISTS department VARCHAR(100)",
            "ADD COLUMN IF NOT EXISTS budget_code VARCHAR(100)",
            "ADD COLUMN IF NOT EXISTS cost_center VARCHAR(100)",
            "ADD COLUMN IF NOT EXISTS delivery_location TEXT",
            "ADD COLUMN IF NOT EXISTS delivery_instructions TEXT",
            "ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100)",
            "ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'pending_approval'",
            "ADD COLUMN IF NOT EXISTS approval_level_required INTEGER DEFAULT 1",
            "ADD COLUMN IF NOT EXISTS current_approval_level INTEGER DEFAULT 0",
            "ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255)",
            "ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP",
            "ADD COLUMN IF NOT EXISTS notes TEXT",
            "ADD COLUMN IF NOT EXISTS internal_notes TEXT"
        ];

        for (const columnDef of missingColumns) {
            try {
                await client.query(`ALTER TABLE purchase_orders_enhanced ${columnDef}`);
                console.log(`✅ Added: ${columnDef.split(' ')[4]}`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log(`⚠️  Column already exists: ${columnDef.split(' ')[4]}`);
                } else {
                    console.error(`❌ Error adding column: ${error.message}`);
                }
            }
        }

        // Update any records that might have NULL required fields
        console.log('\n🔄 Updating existing records with default values...');
        try {
            await client.query(`
                UPDATE purchase_orders_enhanced 
                SET 
                    requested_by = COALESCE(requested_by, 'System'),
                    department = COALESCE(department, 'General'),
                    delivery_location = COALESCE(delivery_location, 'Main Warehouse'),
                    payment_terms = COALESCE(payment_terms, 'Net 30')
                WHERE requested_by IS NULL OR department IS NULL OR delivery_location IS NULL OR payment_terms IS NULL;
            `);
            console.log('✅ Updated existing records with default values');
        } catch (error) {
            console.log('⚠️  No existing records to update or update not needed');
        }

        // Check final structure
        console.log('\n🔍 Final structure verification...');
        const finalColumns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'purchase_orders_enhanced' 
            AND column_name IN ('approved_at', 'department', 'requested_by', 'delivery_location', 'payment_terms')
            ORDER BY column_name;
        `);

        console.log('📊 Critical columns verified:');
        finalColumns.rows.forEach(row => {
            console.log(`  ✅ ${row.column_name}: ${row.data_type}`);
        });

        console.log('\n🎉 Purchase Orders Enhanced table structure is now complete!');
        
    } catch (error) {
        console.error('❌ Error fixing purchase orders columns:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

fixPurchaseOrdersColumns().catch(console.error);