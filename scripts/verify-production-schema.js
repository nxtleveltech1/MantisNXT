#!/usr/bin/env node
/**
 * Production Schema Verification Script
 *
 * Purpose: Query the actual production database to understand current schema structure
 * Critical: This helps identify UUID vs BIGINT discrepancy
 *
 * ADR Reference: ADR-1 (Migration File Rewrite)
 */

const { Pool } = require('pg');

// Connect to Neon database (current production)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyProductionSchema() {
  console.log('='.repeat(80));
  console.log('PRODUCTION SCHEMA VERIFICATION');
  console.log('='.repeat(80));
  console.log(`Database: ${process.env.DB_NAME || 'neondb'}`);
  console.log(`Host: ${process.env.DB_HOST || 'unknown'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  try {
    // 1. Check schema existence
    console.log('\n[1] Checking schema existence...');
    const schemasResult = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name IN ('core', 'public')
      ORDER BY schema_name;
    `);
    console.log('Available schemas:', schemasResult.rows.map(r => r.schema_name).join(', '));

    // 2. List all tables in core schema
    console.log('\n[2] Listing tables in core schema...');
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'core'
      ORDER BY table_name;
    `);

    if (tablesResult.rows.length === 0) {
      console.log('⚠️  WARNING: No tables found in core schema!');
      console.log('Checking public schema instead...');

      const publicTablesResult = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      console.log('Public schema tables:', publicTablesResult.rows.map(r => r.table_name).join(', '));
    } else {
      console.log('Core schema tables:', tablesResult.rows.map(r => r.table_name).join(', '));
    }

    // 3. Check critical table structures (UUID vs BIGINT)
    console.log('\n[3] Analyzing ID column types for critical tables...');

    const criticalTables = [
      'inventory_items',
      'product',
      'supplier',
      'supplier_product',
      'stock_movement',
      'stock_on_hand',
      'warehouses',
      'analytics_anomalies',
      'analytics_predictions'
    ];

    for (const tableName of criticalTables) {
      try {
        const columnResult = await pool.query(`
          SELECT
            c.table_schema,
            c.table_name,
            c.column_name,
            c.data_type,
            c.column_default,
            c.is_nullable,
            c.udt_name
          FROM information_schema.columns c
          WHERE c.table_name = $1
          AND c.column_name LIKE '%id'
          ORDER BY c.ordinal_position;
        `, [tableName]);

        if (columnResult.rows.length > 0) {
          console.log(`\n   Table: ${columnResult.rows[0].table_schema}.${tableName}`);
          columnResult.rows.forEach(col => {
            const idType = col.data_type === 'bigint' ? '🔢 BIGINT' :
                          col.data_type === 'uuid' ? '🆔 UUID' :
                          `❓ ${col.data_type}`;
            console.log(`     - ${col.column_name}: ${idType} (${col.udt_name})`);
            if (col.column_default) {
              console.log(`       Default: ${col.column_default}`);
            }
          });
        } else {
          console.log(`   ⚠️  Table '${tableName}' not found`);
        }
      } catch (err) {
        console.log(`   ❌ Error checking table '${tableName}':`, err.message);
      }
    }

    // 4. Check for foreign key relationships
    console.log('\n[4] Checking foreign key constraints...');
    const fkResult = await pool.query(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'core'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    if (fkResult.rows.length > 0) {
      console.log(`Found ${fkResult.rows.length} foreign key constraints in core schema`);
      fkResult.rows.slice(0, 10).forEach(fk => {
        console.log(`   - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
      if (fkResult.rows.length > 10) {
        console.log(`   ... and ${fkResult.rows.length - 10} more`);
      }
    } else {
      console.log('   No foreign keys found in core schema');
    }

    // 5. Generate summary report
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY REPORT');
    console.log('='.repeat(80));

    const idTypeCount = await pool.query(`
      SELECT
        c.data_type,
        COUNT(*) as count
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON c.table_name = t.table_name
        AND c.table_schema = t.table_schema
      WHERE t.table_schema IN ('core', 'public')
      AND t.table_type = 'BASE TABLE'
      AND c.column_name LIKE '%id'
      GROUP BY c.data_type
      ORDER BY count DESC;
    `);

    console.log('\nID Column Type Distribution:');
    idTypeCount.rows.forEach(row => {
      const icon = row.data_type === 'bigint' ? '🔢' : row.data_type === 'uuid' ? '🆔' : '❓';
      console.log(`   ${icon} ${row.data_type}: ${row.count} columns`);
    });

    // Determine recommendation
    const bigintCount = idTypeCount.rows.find(r => r.data_type === 'bigint')?.count || 0;
    const uuidCount = idTypeCount.rows.find(r => r.data_type === 'uuid')?.count || 0;

    console.log('\nRecommendation:');
    if (bigintCount > uuidCount) {
      console.log('   ✅ Use BIGINT GENERATED ALWAYS AS IDENTITY for new migrations');
      console.log('   📊 Production database primarily uses BIGINT for ID columns');
    } else if (uuidCount > bigintCount) {
      console.log('   ✅ Use UUID DEFAULT gen_random_uuid() for new migrations');
      console.log('   📊 Production database primarily uses UUID for ID columns');
    } else {
      console.log('   ⚠️  MIXED: Database uses both BIGINT and UUID equally');
      console.log('   📊 Consider standardizing on one approach');
    }

    console.log('\n' + '='.repeat(80));
    console.log('Schema verification complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR during schema verification:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Execute verification
verifyProductionSchema().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
