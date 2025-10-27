#!/usr/bin/env node

const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function executeSchemas() {
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
        console.log('✅ Connected to database for Agent 3 schema execution');

        // Execute Purchase Orders and Contracts Schema
        console.log('\n📝 Executing Purchase Orders and Contracts Schema...');
        try {
            const poSchema = fs.readFileSync('scripts/create_purchase_orders_and_contracts_schema.sql', 'utf8');
            await client.query(poSchema);
            console.log('✅ Purchase Orders and Contracts schema executed successfully');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  Purchase Orders schema components already exist');
            } else {
                console.error('❌ Purchase Orders schema failed:', error.message);
            }
        }

        // Execute Invoice and Financial Schema
        console.log('\n📝 Executing Invoice and Financial Schema...');
        try {
            const invoiceSchema = fs.readFileSync('scripts/create_invoice_and_financial_schema.sql', 'utf8');
            await client.query(invoiceSchema);
            console.log('✅ Invoice and Financial schema executed successfully');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  Invoice and Financial schema components already exist');
            } else {
                console.error('❌ Invoice and Financial schema failed:', error.message);
            }
        }

        // Execute Contract Templates and Terms if exists
        console.log('\n📝 Executing Contract Templates and Terms Schema...');
        try {
            if (fs.existsSync('scripts/create_contract_templates_and_terms.sql')) {
                const contractSchema = fs.readFileSync('scripts/create_contract_templates_and_terms.sql', 'utf8');
                await client.query(contractSchema);
                console.log('✅ Contract Templates and Terms schema executed successfully');
            } else {
                console.log('ℹ️  Contract Templates schema file not found, skipping');
            }
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  Contract Templates schema components already exist');
            } else {
                console.error('❌ Contract Templates schema failed:', error.message);
            }
        }

        // Validate schema execution
        console.log('\n🔍 Validating schema execution...');
        
        const tables = await client.query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'purchase_orders_enhanced',
                'purchase_order_items_enhanced', 
                'supplier_contracts',
                'contract_amendments',
                'purchase_order_approvals',
                'purchase_order_receipts',
                'purchase_order_receipt_items',
                'invoices',
                'invoice_line_items',
                'payments',
                'accounts_payable',
                'general_ledger_entries',
                'general_ledger_lines',
                'three_way_matching',
                'matching_exceptions',
                'contract_performance_metrics'
            )
            ORDER BY table_name;
        `);

        console.log('\n📊 Schema Validation Results:');
        const expectedTables = [
            'purchase_orders_enhanced',
            'purchase_order_items_enhanced',
            'supplier_contracts', 
            'contract_amendments',
            'purchase_order_approvals',
            'purchase_order_receipts',
            'purchase_order_receipt_items',
            'invoices',
            'invoice_line_items', 
            'payments',
            'accounts_payable',
            'general_ledger_entries',
            'general_ledger_lines',
            'three_way_matching',
            'matching_exceptions',
            'contract_performance_metrics'
        ];

        const existingTables = tables.rows.map(row => row.table_name);
        
        expectedTables.forEach(tableName => {
            if (existingTables.includes(tableName)) {
                console.log(`✅ ${tableName}`);
            } else {
                console.log(`❌ ${tableName} - MISSING`);
            }
        });

        // Check indexes
        console.log('\n🔍 Checking key indexes...');
        const indexes = await client.query(`
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename IN ('purchase_orders_enhanced', 'invoices', 'payments')
            ORDER BY tablename, indexname;
        `);

        console.log('📊 Key Indexes:');
        indexes.rows.forEach(row => {
            console.log(`  ✅ ${row.tablename}.${row.indexname}`);
        });

        // Check foreign key constraints
        console.log('\n🔗 Checking foreign key constraints...');
        const fks = await client.query(`
            SELECT 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name IN ('purchase_orders_enhanced', 'invoices', 'payments')
            ORDER BY tc.table_name, kcu.column_name;
        `);

        console.log('🔗 Foreign Key Constraints:');
        fks.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
        });

        console.log('\n🎉 Agent 3 Schema Execution and Validation Complete!');
        
    } catch (error) {
        console.error('❌ Schema execution failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

executeSchemas().catch(console.error);