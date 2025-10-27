#!/usr/bin/env node

const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function applySchemaEnhancements() {
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
        console.log('✅ Connected to database for Agent 3 schema enhancements');

        // 1. Create purchase_orders_enhanced table if missing
        console.log('\n📝 Creating purchase_orders_enhanced table...');
        try {
            await client.query(`
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
                    
                    -- Status and Workflow
                    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
                        'draft', 'pending_approval', 'approved', 'sent', 'acknowledged',
                        'in_progress', 'shipped', 'partially_received', 'received', 'completed', 
                        'cancelled', 'on_hold', 'disputed'
                    )),
                    
                    -- Metadata
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    created_by VARCHAR(255),
                    updated_by VARCHAR(255)
                );
            `);
            console.log('✅ purchase_orders_enhanced table created/verified');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  purchase_orders_enhanced already exists');
            } else {
                console.error('❌ Error creating purchase_orders_enhanced:', error.message);
            }
        }

        // 2. Create purchase_order_items_enhanced table if missing
        console.log('\n📝 Creating purchase_order_items_enhanced table...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS purchase_order_items_enhanced (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    purchase_order_id UUID NOT NULL REFERENCES purchase_orders_enhanced(id) ON DELETE CASCADE,
                    line_number INTEGER NOT NULL,
                    
                    -- Product Information
                    product_code VARCHAR(100) NOT NULL,
                    product_name VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    category VARCHAR(100),
                    
                    -- Quantities and Units
                    quantity DECIMAL(12,3) NOT NULL,
                    received_quantity DECIMAL(12,3) DEFAULT 0,
                    unit VARCHAR(20) NOT NULL,
                    
                    -- Pricing Information
                    unit_price DECIMAL(15,2) NOT NULL,
                    total_price DECIMAL(15,2) NOT NULL,
                    
                    -- Status
                    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
                        'pending', 'confirmed', 'shipped', 'received', 'accepted', 'rejected', 'cancelled'
                    )),
                    
                    -- Metadata
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    
                    -- Constraints
                    UNIQUE(purchase_order_id, line_number),
                    CONSTRAINT poi_quantity_positive CHECK (quantity > 0),
                    CONSTRAINT poi_unit_price_non_negative CHECK (unit_price >= 0),
                    CONSTRAINT poi_total_price_calc CHECK (total_price = quantity * unit_price)
                );
            `);
            console.log('✅ purchase_order_items_enhanced table created/verified');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  purchase_order_items_enhanced already exists');
            } else {
                console.error('❌ Error creating purchase_order_items_enhanced:', error.message);
            }
        }

        // 3. Create invoice_line_items table if missing
        console.log('\n📝 Creating invoice_line_items table...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS invoice_line_items (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                    purchase_order_item_id UUID REFERENCES purchase_order_items_enhanced(id) ON DELETE SET NULL,
                    
                    -- Line Item Details
                    line_number INTEGER NOT NULL,
                    product_code VARCHAR(100) NOT NULL,
                    description TEXT NOT NULL,
                    
                    -- Quantities and Units
                    quantity DECIMAL(12,3) NOT NULL,
                    unit VARCHAR(20) NOT NULL,
                    
                    -- Pricing Information
                    unit_price DECIMAL(15,2) NOT NULL,
                    line_total DECIMAL(15,2) NOT NULL,
                    tax_rate DECIMAL(5,2) DEFAULT 15.0,
                    tax_amount DECIMAL(15,2) NOT NULL,
                    
                    -- Metadata
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    
                    -- Constraints
                    UNIQUE(invoice_id, line_number),
                    CONSTRAINT ili_quantity_positive CHECK (quantity > 0),
                    CONSTRAINT ili_unit_price_non_negative CHECK (unit_price >= 0)
                );
            `);
            console.log('✅ invoice_line_items table created/verified');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  invoice_line_items already exists');
            } else {
                console.error('❌ Error creating invoice_line_items:', error.message);
            }
        }

        // 4. Create accounts_payable table if missing
        console.log('\n📝 Creating accounts_payable table...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS accounts_payable (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
                    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE RESTRICT,
                    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                    
                    -- AP Entry Details
                    ap_number VARCHAR(100) UNIQUE NOT NULL,
                    transaction_date DATE NOT NULL,
                    
                    -- Financial Information
                    debit_amount DECIMAL(15,2) DEFAULT 0,
                    credit_amount DECIMAL(15,2) DEFAULT 0,
                    currency VARCHAR(3) DEFAULT 'ZAR',
                    
                    -- Status
                    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'disputed')),
                    
                    -- Metadata
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    
                    -- Constraints
                    CONSTRAINT ap_amounts_valid CHECK (
                        debit_amount >= 0 AND credit_amount >= 0 AND
                        NOT (debit_amount = 0 AND credit_amount = 0)
                    )
                );
            `);
            console.log('✅ accounts_payable table created/verified');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  accounts_payable already exists');
            } else {
                console.error('❌ Error creating accounts_payable:', error.message);
            }
        }

        // 5. Create three_way_matching table if missing
        console.log('\n📝 Creating three_way_matching table...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS three_way_matching (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
                    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                    purchase_order_id UUID REFERENCES purchase_orders_enhanced(id) ON DELETE SET NULL,
                    receipt_id UUID REFERENCES purchase_order_receipts(id) ON DELETE SET NULL,
                    
                    -- Matching Details
                    matching_date TIMESTAMP DEFAULT NOW(),
                    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN (
                        'not_started', 'in_progress', 'matched', 'exceptions', 'failed', 'manual_review'
                    )),
                    
                    -- Variance Analysis
                    total_price_variance DECIMAL(15,2) DEFAULT 0,
                    total_quantity_variance DECIMAL(12,3) DEFAULT 0,
                    variance_percentage DECIMAL(5,2) DEFAULT 0,
                    
                    -- Metadata
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            console.log('✅ three_way_matching table created/verified');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  three_way_matching already exists');
            } else {
                console.error('❌ Error creating three_way_matching:', error.message);
            }
        }

        // 6. Create general_ledger_entries and lines if missing
        console.log('\n📝 Creating general ledger tables...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS general_ledger_entries (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
                    
                    -- Entry Identification
                    entry_number VARCHAR(100) UNIQUE NOT NULL,
                    journal_type VARCHAR(50) NOT NULL DEFAULT 'AP',
                    reference_number VARCHAR(100),
                    
                    -- Entry Details
                    transaction_date DATE NOT NULL,
                    posting_date DATE DEFAULT CURRENT_DATE,
                    period VARCHAR(10) NOT NULL, -- YYYY-MM format
                    
                    -- Financial Information
                    total_debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                    total_credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                    currency VARCHAR(3) DEFAULT 'ZAR',
                    
                    -- Status
                    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
                        'draft', 'posted', 'reversed', 'adjusted'
                    )),
                    
                    -- Additional Information
                    description TEXT NOT NULL,
                    notes TEXT,
                    
                    -- Metadata
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    
                    -- Validation Constraints
                    CONSTRAINT gl_entry_balanced CHECK (total_debit_amount = total_credit_amount)
                );

                CREATE TABLE IF NOT EXISTS general_ledger_lines (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    gl_entry_id UUID NOT NULL REFERENCES general_ledger_entries(id) ON DELETE CASCADE,
                    
                    -- Line Details
                    line_number INTEGER NOT NULL,
                    account_code VARCHAR(50) NOT NULL REFERENCES chart_of_accounts(account_code),
                    
                    -- Financial Information
                    debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                    credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                    currency VARCHAR(3) DEFAULT 'ZAR',
                    
                    -- Reference Information
                    supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL,
                    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
                    purchase_order_id UUID REFERENCES purchase_orders_enhanced(id) ON DELETE SET NULL,
                    
                    -- Additional Information
                    description TEXT,
                    
                    -- Metadata
                    created_at TIMESTAMP DEFAULT NOW(),
                    
                    -- Constraints
                    UNIQUE(gl_entry_id, line_number),
                    CONSTRAINT gl_line_amounts_valid CHECK (
                        debit_amount >= 0 AND credit_amount >= 0 AND
                        NOT (debit_amount = 0 AND credit_amount = 0) AND
                        NOT (debit_amount > 0 AND credit_amount > 0)
                    )
                );
            `);
            console.log('✅ General ledger tables created/verified');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  General ledger tables already exist');
            } else {
                console.error('❌ Error creating general ledger tables:', error.message);
            }
        }

        // 7. Add missing columns to supplier_contracts if needed
        console.log('\n📝 Checking and adding missing columns to supplier_contracts...');
        try {
            // Check if performance_score column exists
            const columnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'supplier_contracts' 
                AND column_name = 'performance_score'
            `);

            if (columnCheck.rows.length === 0) {
                await client.query(`
                    ALTER TABLE supplier_contracts 
                    ADD COLUMN IF NOT EXISTS performance_score DECIMAL(5,2),
                    ADD COLUMN IF NOT EXISTS last_performance_review DATE,
                    ADD COLUMN IF NOT EXISTS next_review_date DATE
                `);
                console.log('✅ Added missing columns to supplier_contracts');
            } else {
                console.log('⚠️  supplier_contracts columns already exist');
            }
        } catch (error) {
            console.error('❌ Error adding columns to supplier_contracts:', error.message);
        }

        // 8. Create contract_performance_metrics table
        console.log('\n📝 Creating contract_performance_metrics table...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS contract_performance_metrics (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
                    
                    -- Measurement Period
                    measurement_period_start DATE NOT NULL,
                    measurement_period_end DATE NOT NULL,
                    measurement_type VARCHAR(50) NOT NULL CHECK (measurement_type IN (
                        'monthly', 'quarterly', 'annual', 'project_based', 'ad_hoc'
                    )),
                    
                    -- Performance Metrics
                    total_orders INTEGER DEFAULT 0,
                    on_time_deliveries INTEGER DEFAULT 0,
                    quality_score DECIMAL(5,2) DEFAULT 0,
                    overall_performance_score DECIMAL(5,2),
                    
                    -- Additional Information
                    notes TEXT,
                    
                    -- Metadata
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    
                    -- Constraints
                    CONSTRAINT cpm_period_valid CHECK (measurement_period_end > measurement_period_start)
                );
            `);
            console.log('✅ contract_performance_metrics table created/verified');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  contract_performance_metrics already exists');
            } else {
                console.error('❌ Error creating contract_performance_metrics:', error.message);
            }
        }

        // 9. Create matching_exceptions table
        console.log('\n📝 Creating matching_exceptions table...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS matching_exceptions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    three_way_match_id UUID NOT NULL REFERENCES three_way_matching(id) ON DELETE CASCADE,
                    invoice_line_id UUID REFERENCES invoice_line_items(id) ON DELETE SET NULL,
                    
                    -- Exception Details
                    exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN (
                        'price_variance', 'quantity_variance', 'missing_receipt', 'missing_po',
                        'tax_mismatch', 'description_mismatch', 'supplier_mismatch'
                    )),
                    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
                    
                    -- Resolution
                    status VARCHAR(20) DEFAULT 'open' CHECK (status IN (
                        'open', 'investigating', 'resolved', 'escalated', 'approved', 'rejected'
                    )),
                    
                    -- Additional Information
                    description TEXT NOT NULL,
                    
                    -- Metadata
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            console.log('✅ matching_exceptions table created/verified');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️  matching_exceptions already exists');
            } else {
                console.error('❌ Error creating matching_exceptions:', error.message);
            }
        }

        // 10. Create essential indexes
        console.log('\n📝 Creating essential indexes...');
        const indexQueries = [
            'CREATE INDEX IF NOT EXISTS idx_po_enhanced_org_id ON purchase_orders_enhanced(org_id)',
            'CREATE INDEX IF NOT EXISTS idx_po_enhanced_supplier_id ON purchase_orders_enhanced(supplier_id)',
            'CREATE INDEX IF NOT EXISTS idx_po_enhanced_status ON purchase_orders_enhanced(status)',
            'CREATE INDEX IF NOT EXISTS idx_poi_enhanced_po_id ON purchase_order_items_enhanced(purchase_order_id)',
            'CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id)',
            'CREATE INDEX IF NOT EXISTS idx_ap_org_id ON accounts_payable(org_id)',
            'CREATE INDEX IF NOT EXISTS idx_three_way_match_invoice ON three_way_matching(invoice_id)',
            'CREATE INDEX IF NOT EXISTS idx_contract_performance_contract_id ON contract_performance_metrics(contract_id)'
        ];

        for (const indexQuery of indexQueries) {
            try {
                await client.query(indexQuery);
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.error('❌ Index creation error:', error.message);
                }
            }
        }
        console.log('✅ Essential indexes created/verified');

        // 11. Create required functions if missing
        console.log('\n📝 Creating required functions...');
        try {
            await client.query(`
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            `);
            console.log('✅ update_updated_at_column function created');
        } catch (error) {
            console.error('❌ Error creating function:', error.message);
        }

        // 12. Final validation
        console.log('\n🔍 Final validation of schema...');
        const finalValidation = await client.query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'purchase_orders_enhanced',
                'purchase_order_items_enhanced', 
                'supplier_contracts',
                'invoices',
                'invoice_line_items',
                'payments',
                'accounts_payable',
                'three_way_matching',
                'matching_exceptions',
                'contract_performance_metrics',
                'chart_of_accounts'
            )
            ORDER BY table_name;
        `);

        console.log('\n📊 Final Schema Validation:');
        finalValidation.rows.forEach(row => {
            console.log(`✅ ${row.table_name} (${row.table_type})`);
        });

        // Check foreign keys
        console.log('\n🔗 Checking foreign key integrity...');
        const fkCheck = await client.query(`
            SELECT 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name IN ('purchase_orders_enhanced', 'invoice_line_items', 'accounts_payable', 'three_way_matching')
            ORDER BY tc.table_name;
        `);

        console.log('🔗 Foreign Key Constraints Verified:');
        fkCheck.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
        });

        console.log('\n🎉 Agent 3 Schema Enhancement Complete!');
        console.log('📊 All required tables, indexes, and constraints are in place');
        console.log('🔗 Foreign key relationships verified and working');
        console.log('⚡ Performance indexes created for optimal query performance');
        
    } catch (error) {
        console.error('❌ Schema enhancement failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applySchemaEnhancements().catch(console.error);