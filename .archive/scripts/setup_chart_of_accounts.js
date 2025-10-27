#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupChartOfAccounts() {
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
        console.log('✅ Setting up Chart of Accounts...');

        // Get organization ID
        const orgData = await client.query('SELECT id FROM organization LIMIT 1');
        const defaultOrgId = orgData.rows[0].id;
        console.log(`📊 Using Organization ID: ${defaultOrgId}`);

        // Check current chart of accounts
        const currentCOA = await client.query('SELECT COUNT(*) as count FROM chart_of_accounts');
        console.log(`📊 Current COA entries: ${currentCOA.rows[0].count}`);

        if (currentCOA.rows[0].count === '0') {
            console.log('📝 Adding default chart of accounts...');
            
            const accounts = [
                ['2000', 'Accounts Payable', 'liability', 'credit', 'Current Liabilities'],
                ['2100', 'VAT Payable', 'liability', 'credit', 'Current Liabilities'],
                ['5000', 'Cost of Goods Sold', 'expense', 'debit', 'Cost of Sales'],
                ['5100', 'Raw Materials', 'expense', 'debit', 'Cost of Sales'],
                ['5200', 'Equipment Purchases', 'expense', 'debit', 'Operating Expenses'],
                ['1500', 'Inventory - Raw Materials', 'asset', 'debit', 'Current Assets'],
                ['1510', 'Inventory - Components', 'asset', 'debit', 'Current Assets'],
                ['1700', 'Equipment and Machinery', 'asset', 'debit', 'Fixed Assets']
            ];

            for (const account of accounts) {
                try {
                    await client.query(`
                        INSERT INTO chart_of_accounts (
                            org_id, account_code, account_name, account_type, 
                            normal_balance, financial_statement_category
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                    `, [defaultOrgId, ...account]);
                    console.log(`✅ Added account: ${account[0]} - ${account[1]}`);
                } catch (error) {
                    if (error.message.includes('duplicate key')) {
                        console.log(`⚠️  Account ${account[0]} already exists`);
                    } else {
                        console.error(`❌ Error adding account ${account[0]}:`, error.message);
                    }
                }
            }
            
            console.log('✅ Default chart of accounts created');
        } else {
            console.log('⚠️  Chart of accounts already populated');
        }

        // Final validation
        const finalCOA = await client.query('SELECT COUNT(*) as count FROM chart_of_accounts');
        console.log(`📊 Final COA entries: ${finalCOA.rows[0].count}`);

        console.log('\n🎉 Chart of Accounts setup complete!');
        
    } catch (error) {
        console.error('❌ COA setup error:', error.message);
    } finally {
        await client.end();
    }
}

setupChartOfAccounts().catch(console.error);