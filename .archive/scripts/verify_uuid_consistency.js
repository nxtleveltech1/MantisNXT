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

async function verifyUuidConsistency() {
  const client = await pool.connect();

  try {
    console.log('🆔 VERIFYING UUID CONSISTENCY');
    console.log('='.repeat(50));

    // Get all UUID columns
    const uuidQuery = `
      SELECT
        table_name,
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE data_type LIKE '%uuid%' OR udt_name LIKE '%uuid%'
      ORDER BY table_name, column_name;
    `;

    const uuidColumns = await client.query(uuidQuery);
    console.log(`📊 Found ${uuidColumns.rows.length} UUID columns`);

    // Group by table
    const tableGroups = {};
    uuidColumns.rows.forEach(col => {
      if (!tableGroups[col.table_name]) {
        tableGroups[col.table_name] = [];
      }
      tableGroups[col.table_name].push(col);
    });

    // Check each table
    for (const [tableName, columns] of Object.entries(tableGroups)) {
      console.log(`\n📄 Table: ${tableName}`);

      for (const col of columns) {
        console.log(`  🆔 ${col.column_name}: ${col.data_type} (${col.udt_name}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        if (col.column_default) {
          console.log(`     Default: ${col.column_default}`);
        }
      }

      // Test for invalid UUID values
      for (const col of columns) {
        try {
          const testQuery = `
            SELECT COUNT(*) as invalid_count
            FROM ${tableName}
            WHERE ${col.column_name} IS NOT NULL
              AND NOT (${col.column_name}::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
          `;

          const result = await client.query(testQuery);
          const invalidCount = result.rows[0].invalid_count;

          if (invalidCount > 0) {
            console.log(`    ❌ ${col.column_name}: ${invalidCount} invalid UUID values`);

            // Show sample invalid values
            const sampleQuery = `
              SELECT ${col.column_name}
              FROM ${tableName}
              WHERE ${col.column_name} IS NOT NULL
                AND NOT (${col.column_name}::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
              LIMIT 3
            `;

            const samples = await client.query(sampleQuery);
            console.log(`    📋 Sample invalid values:`);
            samples.rows.forEach(row => {
              console.log(`      • ${row[col.column_name]}`);
            });
          } else {
            console.log(`    ✅ ${col.column_name}: All UUIDs valid`);
          }
        } catch (error) {
          console.log(`    ⚠️  ${col.column_name}: Error checking - ${error.message}`);
        }
      }

      // Check for record count
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`  📊 Records: ${countResult.rows[0].count}`);
      } catch (error) {
        console.log(`  ❌ Error getting count: ${error.message}`);
      }
    }

    // Check for foreign key UUID mismatches
    console.log('\n🔗 CHECKING FOREIGN KEY UUID CONSISTENCY:');

    const fkQuery = `
      SELECT
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name LIKE '%_id'
      ORDER BY tc.table_name, kcu.column_name;
    `;

    const foreignKeys = await client.query(fkQuery);
    console.log(`🔗 Checking ${foreignKeys.rows.length} foreign key relationships:`);

    for (const fk of foreignKeys.rows) {
      try {
        // Check for orphaned records
        const orphanQuery = `
          SELECT COUNT(*) as orphan_count
          FROM ${fk.source_table} s
          WHERE s.${fk.source_column} IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM ${fk.target_table} t
              WHERE t.${fk.target_column} = s.${fk.source_column}
            )
        `;

        const orphanResult = await client.query(orphanQuery);
        const orphanCount = orphanResult.rows[0].orphan_count;

        if (orphanCount > 0) {
          console.log(`  ❌ ${fk.source_table}.${fk.source_column} → ${fk.target_table}.${fk.target_column}: ${orphanCount} orphaned records`);
        } else {
          console.log(`  ✅ ${fk.source_table}.${fk.source_column} → ${fk.target_table}.${fk.target_column}: No orphans`);
        }
      } catch (error) {
        console.log(`  ⚠️  ${fk.source_table}.${fk.source_column} → ${fk.target_table}.${fk.target_column}: Error - ${error.message}`);
      }
    }

    // Check for common UUID issues
    console.log('\n🔍 COMMON UUID ISSUES CHECK:');

    // Check for nil UUIDs
    const nilUuidCheck = `
      SELECT
        table_name,
        column_name
      FROM information_schema.columns
      WHERE (data_type LIKE '%uuid%' OR udt_name LIKE '%uuid%')
        AND table_schema = 'public'
    `;

    const uuidCols = await client.query(nilUuidCheck);

    for (const col of uuidCols.rows) {
      try {
        const nilQuery = `
          SELECT COUNT(*) as nil_count
          FROM ${col.table_name}
          WHERE ${col.column_name}::text = '00000000-0000-0000-0000-000000000000'
        `;

        const nilResult = await client.query(nilQuery);
        const nilCount = nilResult.rows[0].nil_count;

        if (nilCount > 0) {
          console.log(`  ⚠️  ${col.table_name}.${col.column_name}: ${nilCount} nil UUIDs found`);
        }
      } catch (error) {
        // Skip if table doesn't exist or other errors
      }
    }

    // Performance check for UUID operations
    console.log('\n⚡ UUID PERFORMANCE CHECK:');

    const performanceTests = [
      {
        name: 'suppliers lookup by id',
        query: `EXPLAIN ANALYZE SELECT * FROM suppliers WHERE id = (SELECT id FROM suppliers LIMIT 1)`
      },
      {
        name: 'inventory_items join with suppliers',
        query: `EXPLAIN ANALYZE SELECT COUNT(*) FROM inventory_items i JOIN suppliers s ON i.supplier_id = s.id LIMIT 100`
      }
    ];

    for (const test of performanceTests) {
      try {
        const result = await client.query(test.query);
        const executionTime = result.rows.find(row => row['QUERY PLAN'].includes('Execution Time'));
        if (executionTime) {
          console.log(`  ⚡ ${test.name}: ${executionTime['QUERY PLAN']}`);
        }
      } catch (error) {
        console.log(`  ⚠️  ${test.name}: Error - ${error.message}`);
      }
    }

    console.log('\n✅ UUID CONSISTENCY VERIFICATION COMPLETE');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error verifying UUID consistency:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the verification
verifyUuidConsistency().catch(console.error);