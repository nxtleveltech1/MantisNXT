#!/usr/bin/env node
/**
 * Schema Inspector
 * Analyzes actual table structures to understand current schema
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

async function inspectSchema() {
    const pool = new Pool(dbConfig);

    try {
        console.log('🔍 Inspecting Database Schema...\n');

        // Key tables to inspect
        const tables = ['suppliers', 'inventory_items', 'users', 'purchase_orders', 'customers', 'sales_orders'];

        for (const tableName of tables) {
            console.log(`📊 Table: ${tableName}`);

            try {
                // Get column information
                const columnsQuery = `
                    SELECT
                        column_name,
                        data_type,
                        is_nullable,
                        column_default,
                        character_maximum_length
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = $1
                    ORDER BY ordinal_position;
                `;

                const columns = await pool.query(columnsQuery, [tableName]);

                if (columns.rows.length === 0) {
                    console.log(`   ❌ Table not found\n`);
                    continue;
                }

                console.log(`   Columns (${columns.rows.length}):`);
                columns.rows.forEach(col => {
                    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                    const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
                    console.log(`   - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}`);
                });

                // Get record count
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
                console.log(`   Records: ${countResult.rows[0].count}\n`);

            } catch (error) {
                console.log(`   ❌ Error inspecting ${tableName}: ${error.message}\n`);
            }
        }

        // Check for foreign key relationships
        console.log('🔗 Foreign Key Relationships:');
        const fkQuery = `
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
            ORDER BY tc.table_name, kcu.column_name;
        `;

        const foreignKeys = await pool.query(fkQuery);
        foreignKeys.rows.forEach(fk => {
            console.log(`   ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });

        console.log(`\n✅ Schema inspection complete!`);

    } catch (error) {
        console.error('❌ Schema inspection failed:', error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    inspectSchema();
}

module.exports = { inspectSchema };