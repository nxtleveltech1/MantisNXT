#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixInvoiceSchema() {
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
        console.log('✅ Connected to fix invoice schema');

        // Check current invoice table structure
        console.log('\n🔍 Checking current invoices table structure...');
        const invoiceColumns = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'invoices' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Current invoices table columns:');
        invoiceColumns.rows.forEach(row => {
            console.log(`  📝 ${row.column_name}: ${row.data_type}`);
        });

        // Check if org_id exists
        const orgIdExists = invoiceColumns.rows.some(row => row.column_name === 'org_id');
        
        if (!orgIdExists) {
            console.log('\n📝 Adding org_id column to invoices table...');
            await client.query('ALTER TABLE invoices ADD COLUMN org_id UUID REFERENCES organization(id) ON DELETE CASCADE');
            
            // Set org_id for existing records
            await client.query('UPDATE invoices SET org_id = (SELECT id FROM organization LIMIT 1) WHERE org_id IS NULL');
            console.log('✅ org_id column added and populated');
        } else {
            console.log('✅ org_id column already exists');
        }

        // Check if supplier_id exists and has correct reference
        const supplierIdExists = invoiceColumns.rows.some(row => row.column_name === 'supplier_id');
        if (!supplierIdExists) {
            console.log('\n📝 Adding supplier_id column to invoices table...');
            await client.query('ALTER TABLE invoices ADD COLUMN supplier_id UUID REFERENCES supplier(id) ON DELETE RESTRICT');
            console.log('✅ supplier_id column added');
        } else {
            console.log('✅ supplier_id column already exists');
        }

        // Check payment_terms column
        const paymentTermsExists = invoiceColumns.rows.some(row => row.column_name === 'payment_terms');
        if (!paymentTermsExists) {
            console.log('\n📝 Adding payment_terms column to invoices table...');
            await client.query(`ALTER TABLE invoices ADD COLUMN payment_terms VARCHAR(100) DEFAULT 'Net 30'`);
            console.log('✅ payment_terms column added');
        } else {
            console.log('✅ payment_terms column already exists');
        }

        // Add other essential columns if missing
        const essentialColumns = [
            { name: 'subtotal', type: 'DECIMAL(15,2) DEFAULT 0' },
            { name: 'tax_amount', type: 'DECIMAL(15,2) DEFAULT 0' },
            { name: 'total_amount', type: 'DECIMAL(15,2) DEFAULT 0' },
            { name: 'currency', type: `VARCHAR(3) DEFAULT 'ZAR'` },
            { name: 'supplier_invoice_number', type: 'VARCHAR(100)' }
        ];

        for (const col of essentialColumns) {
            const exists = invoiceColumns.rows.some(row => row.column_name === col.name);
            if (!exists) {
                try {
                    await client.query(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ Added column: ${col.name}`);
                } catch (error) {
                    if (!error.message.includes('already exists')) {
                        console.error(`❌ Error adding ${col.name}:`, error.message);
                    }
                }
            }
        }

        console.log('\n🎉 Invoice schema fixes completed successfully!');
        
        // Test the fixed schema
        console.log('\n🧪 Testing fixed invoice schema...');
        try {
            const testInvoice = await client.query(`
                INSERT INTO invoices (
                    organization_id, supplier_id, invoice_number, supplier_invoice_number,
                    invoice_date, due_date, subtotal, tax_amount, total_amount, payment_terms
                ) VALUES (
                    (SELECT id FROM organization LIMIT 1),
                    (SELECT id FROM supplier LIMIT 1),
                    'TEST-FIXED-' || EXTRACT(EPOCH FROM NOW())::text,
                    'SUPP-FIXED-001',
                    CURRENT_DATE,
                    CURRENT_DATE + INTERVAL '30 days',
                    1000.00,
                    150.00,
                    1150.00,
                    'Net 30'
                ) RETURNING id, invoice_number;
            `);
            console.log(`✅ Test Invoice Created: ${testInvoice.rows[0].invoice_number}`);

            // Clean up
            await client.query(`DELETE FROM invoices WHERE id = $1`, [testInvoice.rows[0].id]);
            console.log('✅ Test data cleaned up');
            
        } catch (error) {
            console.error('❌ Invoice test still failing:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error fixing invoice schema:', error.message);
    } finally {
        await client.end();
    }
}

fixInvoiceSchema().catch(console.error);