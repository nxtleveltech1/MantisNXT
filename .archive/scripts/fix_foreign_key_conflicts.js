#!/usr/bin/env node

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  ssl: false,
  max: 10,
  connectionTimeoutMillis: 10000,
});

async function fixForeignKeyConflicts() {
  const client = await pool.connect();

  try {
    console.log('🔧 FIXING FOREIGN KEY CONFLICTS');
    console.log('='.repeat(50));

    // Remove the incorrect foreign key constraint pointing to empty 'supplier' table
    console.log('🗑️  Removing incorrect foreign key constraint...');
    try {
      await client.query(`
        ALTER TABLE supplier_performance
        DROP CONSTRAINT IF EXISTS supplier_performance_supplier_id_fkey;
      `);
      console.log('  ✅ Removed incorrect FK: supplier_performance -> supplier');
    } catch (error) {
      console.log(`  ⚠️  Error removing constraint: ${error.message}`);
    }

    // Check remaining constraints
    const constraintQuery = `
      SELECT
        tc.constraint_name,
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
          AND tc.table_name = 'supplier_performance'
          AND kcu.column_name = 'supplier_id'
      ORDER BY tc.constraint_name;
    `;

    const constraints = await client.query(constraintQuery);
    console.log('\n🔗 Remaining FK constraints on supplier_performance.supplier_id:');
    constraints.rows.forEach(fk => {
      console.log(`  ✅ ${fk.constraint_name}: → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // Also check other tables that might have the same issue
    console.log('\n🔍 Checking other tables for similar conflicts...');

    const allFkQuery = `
      SELECT DISTINCT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name IN ('supplier', 'suppliers')
      ORDER BY tc.table_name, kcu.column_name;
    `;

    const allFks = await client.query(allFkQuery);
    console.log('\n📋 All Foreign Keys to supplier/suppliers tables:');
    allFks.rows.forEach(fk => {
      console.log(`  🔗 ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}`);
    });

    // Clean up any references to empty 'supplier' table
    console.log('\n🧹 Cleaning up references to empty supplier table...');

    // Remove FK constraints pointing to empty 'supplier' table
    const badConstraintsQuery = `
      SELECT
        tc.constraint_name,
        tc.table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'supplier'
          AND tc.table_name != 'supplier'
      ORDER BY tc.table_name;
    `;

    const badConstraints = await client.query(badConstraintsQuery);

    for (const constraint of badConstraints.rows) {
      try {
        await client.query(`
          ALTER TABLE ${constraint.table_name}
          DROP CONSTRAINT IF EXISTS ${constraint.constraint_name};
        `);
        console.log(`  ✅ Removed: ${constraint.table_name}.${constraint.constraint_name}`);
      } catch (error) {
        console.log(`  ❌ Failed to remove: ${constraint.constraint_name} - ${error.message}`);
      }
    }

    console.log('\n✅ FOREIGN KEY CONFLICTS FIXED');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error fixing foreign key conflicts:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixForeignKeyConflicts().catch(console.error);