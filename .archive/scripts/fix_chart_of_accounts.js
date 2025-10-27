#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixChartOfAccounts() {
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
        console.log('✅ Connected to fix chart of accounts');
        
        // Check current structure
        const coaColumns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'chart_of_accounts' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Chart of Accounts columns:');
        coaColumns.rows.forEach(row => {
            console.log(`  📝 ${row.column_name}: ${row.data_type}`);
        });
        
        // Add org_id if missing
        const hasOrgId = coaColumns.rows.some(row => row.column_name === 'org_id');
        if (!hasOrgId) {
            console.log('\n📝 Adding org_id to chart_of_accounts...');
            await client.query('ALTER TABLE chart_of_accounts ADD COLUMN org_id UUID REFERENCES organization(id) ON DELETE CASCADE');
            console.log('✅ org_id column added');
        } else {
            console.log('✅ org_id column already exists');
        }
        
        // Get organization ID
        const orgData = await client.query('SELECT id FROM organization LIMIT 1');
        const defaultOrgId = orgData.rows[0].id;
        console.log(`📊 Using Organization ID: ${defaultOrgId}`);
        
        // Insert basic accounts
        console.log('\n📝 Adding basic chart of accounts...');
        const accounts = [
            ['2000', 'Accounts Payable', 'liability', 'credit'],
            ['5000', 'Cost of Goods Sold', 'expense', 'debit'],
            ['1500', 'Inventory', 'asset', 'debit']
        ];

        for (const account of accounts) {
            try {
                await client.query(`
                    INSERT INTO chart_of_accounts (
                        org_id, account_code, account_name, account_type, normal_balance
                    ) VALUES ($1, $2, $3, $4, $5) 
                    ON CONFLICT (account_code) DO NOTHING
                `, [defaultOrgId, ...account]);
                console.log(`✅ Added: ${account[1]}`);
            } catch (error) {
                if (error.message.includes('duplicate')) {
                    console.log(`⚠️  Account exists: ${account[1]}`);
                } else {
                    console.error(`❌ Error adding ${account[1]}:`, error.message);
                }
            }
        }
        
        const finalCount = await client.query('SELECT COUNT(*) as count FROM chart_of_accounts');
        console.log(`\n📊 Final COA count: ${finalCount.rows[0].count}`);
        console.log('🎉 Chart of Accounts setup complete!');
        
    } catch (error) {
        console.error('❌ Error fixing chart of accounts:', error.message);
    } finally {
        await client.end();
    }
}

fixChartOfAccounts().catch(console.error);