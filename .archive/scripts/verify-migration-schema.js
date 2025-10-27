#!/usr/bin/env node
/**
 * Migration Schema Verification Script
 *
 * Purpose: Validates database schema before/after migrations
 * ADR Reference: ADR-1 (Migration File Rewrite - BIGINT Strategy)
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const mode = process.argv[2] || '--help';

async function validatePreMigration() {
  console.log('\n🔍 PRE-MIGRATION VALIDATION');
  console.log('='.repeat(60));

  try {
    // Check core schema exists
    const schemaResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata
        WHERE schema_name = 'core'
      ) as exists;
    `);

    if (schemaResult.rows[0].exists) {
      console.log('✅ Core schema exists');
    } else {
      console.log('❌ Core schema DOES NOT exist');
      return false;
    }

    // Check if migration tables already exist
    const tables = ['supplier_pricelists', 'pricelist_items', 'supplier_performance',
                    'analytics_anomalies', 'analytics_predictions', 'purchase_orders'];

    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'core' AND table_name = $1
        ) as exists;
      `, [table]);

      if (result.rows[0].exists) {
        console.log(`⚠️  Table core.${table} already exists (migration may have run)`);
      } else {
        console.log(`ℹ️  Table core.${table} does not exist (expected for new migration)`);
      }
    }

    console.log('\n✅ Pre-migration validation complete');
    return true;
  } catch (error) {
    console.error('\n❌ Pre-migration validation failed:', error.message);
    return false;
  }
}

async function validate001() {
  console.log('\n🔍 VALIDATING MIGRATION 001 (Pricelist Tables)');
  console.log('='.repeat(60));

  try {
    let passed = 0;
    let failed = 0;

    // Check supplier_pricelists table
    const pricelistsCheck = await pool.query(`
      SELECT
        c.column_name,
        c.data_type,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'core'
      AND c.table_name = 'supplier_pricelists'
      AND c.column_name = 'pricelist_id';
    `);

    if (pricelistsCheck.rows.length > 0) {
      const col = pricelistsCheck.rows[0];
      if (col.data_type === 'bigint' && col.column_default?.includes('nextval')) {
        console.log('✅ supplier_pricelists.pricelist_id is BIGINT with identity');
        passed++;
      } else {
        console.log(`❌ supplier_pricelists.pricelist_id type incorrect: ${col.data_type}`);
        failed++;
      }
    } else {
      console.log('❌ supplier_pricelists table or pricelist_id column not found');
      failed++;
    }

    // Check pricelist_items table
    const itemsCheck = await pool.query(`
      SELECT
        c.column_name,
        c.data_type,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'core'
      AND c.table_name = 'pricelist_items'
      AND c.column_name = 'pricelist_item_id';
    `);

    if (itemsCheck.rows.length > 0) {
      const col = itemsCheck.rows[0];
      if (col.data_type === 'bigint' && col.column_default?.includes('nextval')) {
        console.log('✅ pricelist_items.pricelist_item_id is BIGINT with identity');
        passed++;
      } else {
        console.log(`❌ pricelist_items.pricelist_item_id type incorrect: ${col.data_type}`);
        failed++;
      }
    } else {
      console.log('❌ pricelist_items table or pricelist_item_id column not found');
      failed++;
    }

    // Check foreign key constraints
    const fkCheck = await pool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'core'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('supplier_pricelists', 'pricelist_items');
    `);

    if (fkCheck.rows.length >= 2) {
      console.log(`✅ Foreign key constraints found: ${fkCheck.rows.length}`);
      passed++;
    } else {
      console.log(`⚠️  Expected at least 2 foreign keys, found: ${fkCheck.rows.length}`);
      failed++;
    }

    // Check indexes
    const indexCheck = await pool.query(`
      SELECT count(*) as index_count
      FROM pg_indexes
      WHERE schemaname = 'core'
      AND tablename IN ('supplier_pricelists', 'pricelist_items');
    `);

    if (parseInt(indexCheck.rows[0].index_count) >= 6) {
      console.log(`✅ Indexes created: ${indexCheck.rows[0].index_count}`);
      passed++;
    } else {
      console.log(`⚠️  Expected at least 6 indexes, found: ${indexCheck.rows[0].index_count}`);
      failed++;
    }

    console.log(`\n📊 Validation Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
  } catch (error) {
    console.error('\n❌ Migration 001 validation failed:', error.message);
    return false;
  }
}

async function validate002() {
  console.log('\n🔍 VALIDATING MIGRATION 002 (Analytics Tables)');
  console.log('='.repeat(60));

  try {
    const expectedTables = [
      { name: 'supplier_performance', idColumn: 'performance_id' },
      { name: 'stock_movements', idColumn: 'movement_id' },
      { name: 'analytics_anomalies', idColumn: 'anomaly_id' },
      { name: 'analytics_predictions', idColumn: 'prediction_id' },
      { name: 'analytics_dashboard_config', idColumn: 'organization_id' },
      { name: 'purchase_orders', idColumn: 'purchase_order_id' },
      { name: 'purchase_order_items', idColumn: 'po_item_id' }
    ];

    let passed = 0;
    let failed = 0;

    for (const table of expectedTables) {
      const result = await pool.query(`
        SELECT
          c.column_name,
          c.data_type,
          c.column_default
        FROM information_schema.columns c
        WHERE c.table_schema = 'core'
        AND c.table_name = $1
        AND c.column_name = $2;
      `, [table.name, table.idColumn]);

      if (result.rows.length > 0) {
        const col = result.rows[0];
        const isBigint = col.data_type === 'bigint';
        const hasIdentity = col.column_default?.includes('nextval') || table.idColumn === 'organization_id';

        if (isBigint && (hasIdentity || table.idColumn === 'organization_id')) {
          console.log(`✅ ${table.name}.${table.idColumn} is BIGINT`);
          passed++;
        } else {
          console.log(`❌ ${table.name}.${table.idColumn} type incorrect: ${col.data_type}`);
          failed++;
        }
      } else {
        console.log(`❌ Table ${table.name} or column ${table.idColumn} not found`);
        failed++;
      }
    }

    console.log(`\n📊 Validation Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
  } catch (error) {
    console.error('\n❌ Migration 002 validation failed:', error.message);
    return false;
  }
}

async function validatePostRollback() {
  console.log('\n🔍 POST-ROLLBACK VALIDATION');
  console.log('='.repeat(60));

  try {
    const tables = [
      'supplier_pricelists', 'pricelist_items', 'supplier_performance',
      'stock_movements', 'analytics_anomalies', 'analytics_predictions',
      'analytics_dashboard_config', 'purchase_orders', 'purchase_order_items'
    ];

    let allDropped = true;

    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'core' AND table_name = $1
        ) as exists;
      `, [table]);

      if (result.rows[0].exists) {
        console.log(`❌ Table core.${table} still exists (rollback incomplete)`);
        allDropped = false;
      } else {
        console.log(`✅ Table core.${table} successfully dropped`);
      }
    }

    if (allDropped) {
      console.log('\n✅ All migration tables successfully rolled back');
      return true;
    } else {
      console.log('\n❌ Rollback incomplete - some tables still exist');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Post-rollback validation failed:', error.message);
    return false;
  }
}

async function validateFinal() {
  console.log('\n🔍 FINAL COMPREHENSIVE VALIDATION');
  console.log('='.repeat(60));

  try {
    const val001 = await validate001();
    const val002 = await validate002();

    if (val001 && val002) {
      console.log('\n✅ ALL MIGRATIONS VALIDATED SUCCESSFULLY');
      console.log('🎉 Database schema is ready for production use');
      return true;
    } else {
      console.log('\n❌ VALIDATION FAILED');
      console.log('⚠️  Review errors above and correct before deployment');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Final validation failed:', error.message);
    return false;
  }
}

async function showHelp() {
  console.log(`
Migration Schema Verification Tool
===================================

Usage: node scripts/verify-migration-schema.js [mode]

Modes:
  --pre-migration    Validate schema before running migrations
  --validate-001     Validate migration 001 (pricelist tables)
  --validate-002     Validate migration 002 (analytics tables)
  --post-rollback    Validate rollback completed successfully
  --final            Run comprehensive validation (all migrations)
  --help             Show this help message

Examples:
  node scripts/verify-migration-schema.js --pre-migration
  node scripts/verify-migration-schema.js --validate-001
  node scripts/verify-migration-schema.js --final

Environment Variables:
  DATABASE_URL       PostgreSQL connection string (required)
`);
}

async function main() {
  console.log('Migration Schema Verification Tool');
  console.log('ADR: ADR-1 (Migration File Rewrite - BIGINT Strategy)');

  if (!process.env.DATABASE_URL) {
    console.error('\n❌ ERROR: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  let success = false;

  switch (mode) {
    case '--pre-migration':
      success = await validatePreMigration();
      break;
    case '--validate-001':
      success = await validate001();
      break;
    case '--validate-002':
      success = await validate002();
      break;
    case '--post-rollback':
      success = await validatePostRollback();
      break;
    case '--final':
      success = await validateFinal();
      break;
    case '--help':
      await showHelp();
      success = true;
      break;
    default:
      console.error(`\n❌ Unknown mode: ${mode}`);
      await showHelp();
      success = false;
  }

  await pool.end();
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  pool.end();
  process.exit(1);
});
