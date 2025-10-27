/**
 * Schema Bridge Verification Test Suite
 *
 * Tests the schema bridge architecture between public.* and core.*
 * Validates view functionality, column mapping, and data integrity
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://nxtdb_admin:P@33w0rd-1@62.169.20.53:6600/nxtprod-db_001',
  ssl: false
});

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, passed, message, severity = 'error') {
  const status = passed ? '✅ PASS' : (severity === 'warning' ? '⚠️  WARN' : '❌ FAIL');
  console.log(`${status} - ${name}`);
  if (message) {
    console.log(`       ${message}`);
  }

  results.tests.push({ name, passed, message, severity });

  if (passed) {
    results.passed++;
  } else if (severity === 'warning') {
    results.warnings++;
  } else {
    results.failed++;
  }
}

async function test01_SchemasExist() {
  console.log('\n📂 TEST SUITE 1: Schema Existence');
  console.log('='.repeat(80));

  try {
    const result = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name IN ('public', 'core')
      ORDER BY schema_name
    `);

    const schemas = result.rows.map(r => r.schema_name);

    logTest(
      'Both public and core schemas exist',
      schemas.length === 2 && schemas.includes('public') && schemas.includes('core'),
      `Found schemas: ${schemas.join(', ')}`
    );
  } catch (error) {
    logTest('Schema existence check', false, error.message);
  }
}

async function test02_ViewsExist() {
  console.log('\n👁️  TEST SUITE 2: View Existence');
  console.log('='.repeat(80));

  const expectedViews = [
    { schema: 'core', name: 'supplier', type: 'VIEW' },
    { schema: 'core', name: 'supplier_product', type: 'VIEW' },
    { schema: 'core', name: 'stock_on_hand', type: 'VIEW' },
    { schema: 'core', name: 'stock_movement', type: 'VIEW' },
    { schema: 'core', name: 'supplier_view', type: 'VIEW' },
    { schema: 'core', name: 'supplier_product_view', type: 'VIEW' },
    { schema: 'core', name: 'stock_on_hand_view', type: 'VIEW' }
  ];

  for (const expected of expectedViews) {
    try {
      const result = await pool.query(`
        SELECT table_type
        FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2
      `, [expected.schema, expected.name]);

      logTest(
        `View ${expected.schema}.${expected.name} exists`,
        result.rows.length > 0 && result.rows[0].table_type === expected.type,
        result.rows.length > 0 ? `Type: ${result.rows[0].table_type}` : 'Not found'
      );
    } catch (error) {
      logTest(`Check ${expected.schema}.${expected.name}`, false, error.message);
    }
  }
}

async function test03_RowCounts() {
  console.log('\n📊 TEST SUITE 3: Row Count Validation');
  console.log('='.repeat(80));

  try {
    // Test that views return the same counts as source tables
    const publicSuppliers = await pool.query('SELECT COUNT(*) FROM public.suppliers');
    const coreSupplier = await pool.query('SELECT COUNT(*) FROM core.supplier');
    const coreSupplierView = await pool.query('SELECT COUNT(*) FROM core.supplier_view');

    const publicCount = parseInt(publicSuppliers.rows[0].count);
    const coreCount = parseInt(coreSupplier.rows[0].count);
    const coreViewCount = parseInt(coreSupplierView.rows[0].count);

    console.log(`  public.suppliers: ${publicCount}`);
    console.log(`  core.supplier: ${coreCount}`);
    console.log(`  core.supplier_view: ${coreViewCount}`);

    logTest(
      'core.supplier row count matches public.suppliers',
      coreCount === publicCount,
      `Expected ${publicCount}, got ${coreCount}`
    );

    logTest(
      'core.supplier_view row count matches public.suppliers',
      coreViewCount === publicCount,
      `Expected ${publicCount}, got ${coreViewCount}`
    );

    // Test supplier_product views
    const inventoryItems = await pool.query('SELECT COUNT(*) FROM public.inventory_items');
    const supplierProduct = await pool.query('SELECT COUNT(*) FROM core.supplier_product');
    const supplierProductView = await pool.query('SELECT COUNT(*) FROM core.supplier_product_view');

    const invCount = parseInt(inventoryItems.rows[0].count);
    const spCount = parseInt(supplierProduct.rows[0].count);
    const spViewCount = parseInt(supplierProductView.rows[0].count);

    console.log(`\n  public.inventory_items: ${invCount}`);
    console.log(`  core.supplier_product: ${spCount}`);
    console.log(`  core.supplier_product_view: ${spViewCount}`);

    logTest(
      'core.supplier_product row count reasonable',
      spCount > 0 && spCount <= invCount,
      `Supplier products: ${spCount}, Inventory items: ${invCount}`
    );

  } catch (error) {
    logTest('Row count validation', false, error.message);
  }
}

async function test04_ColumnMapping() {
  console.log('\n🔀 TEST SUITE 4: Column Mapping Validation');
  console.log('='.repeat(80));

  try {
    // Test critical column mappings in core.supplier view
    const result = await pool.query(`
      SELECT
        supplier_id,
        name,
        code,
        active,
        default_currency,
        payment_terms,
        tax_number,
        contact_email,
        contact_phone
      FROM core.supplier
      LIMIT 1
    `);

    logTest(
      'core.supplier returns expected columns',
      result.rows.length > 0 && result.rows[0].supplier_id !== undefined,
      `Sample row has ${Object.keys(result.rows[0] || {}).length} columns`
    );

    // Test boolean conversion
    if (result.rows.length > 0) {
      const row = result.rows[0];

      logTest(
        'active field is boolean',
        typeof row.active === 'boolean',
        `Type: ${typeof row.active}, Value: ${row.active}`
      );

      logTest(
        'supplier_id is UUID format',
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.supplier_id),
        `Value: ${row.supplier_id}`
      );
    }

    // Test contact_info JSONB in supplier_view
    const viewResult = await pool.query(`
      SELECT contact_info
      FROM core.supplier_view
      WHERE contact_info IS NOT NULL
      LIMIT 1
    `);

    if (viewResult.rows.length > 0) {
      const contactInfo = viewResult.rows[0].contact_info;

      logTest(
        'contact_info is valid JSONB',
        typeof contactInfo === 'object' && contactInfo !== null,
        `Keys: ${Object.keys(contactInfo).join(', ')}`
      );

      logTest(
        'contact_info contains email field',
        'email' in contactInfo,
        `Email: ${contactInfo.email || 'NULL'}`
      );
    }

  } catch (error) {
    logTest('Column mapping validation', false, error.message);
  }
}

async function test05_DataIntegrity() {
  console.log('\n🔒 TEST SUITE 5: Data Integrity');
  console.log('='.repeat(80));

  try {
    // Test for NULL critical fields
    const nullCheck = await pool.query(`
      SELECT COUNT(*) as null_count
      FROM core.supplier
      WHERE supplier_id IS NULL OR name IS NULL
    `);

    logTest(
      'No NULL values in critical fields (supplier_id, name)',
      parseInt(nullCheck.rows[0].null_count) === 0,
      `Found ${nullCheck.rows[0].null_count} rows with NULLs`
    );

    // Test for duplicate supplier names
    const dupCheck = await pool.query(`
      SELECT name, COUNT(*) as dup_count
      FROM core.supplier
      GROUP BY name
      HAVING COUNT(*) > 1
    `);

    logTest(
      'No duplicate supplier names',
      dupCheck.rows.length === 0,
      dupCheck.rows.length > 0
        ? `Found duplicates: ${dupCheck.rows.map(r => `${r.name} (${r.dup_count})`).join(', ')}`
        : 'All names unique'
    );

    // Test foreign key integrity (supplier_product -> supplier)
    const fkCheck = await pool.query(`
      SELECT COUNT(*) as orphan_count
      FROM core.supplier_product sp
      LEFT JOIN core.supplier s ON sp.supplier_id = s.supplier_id
      WHERE s.supplier_id IS NULL
    `);

    logTest(
      'Foreign key integrity (supplier_product → supplier)',
      parseInt(fkCheck.rows[0].orphan_count) === 0,
      `Found ${fkCheck.rows[0].orphan_count} orphaned records`
    );

  } catch (error) {
    logTest('Data integrity check', false, error.message);
  }
}

async function test06_QueryPerformance() {
  console.log('\n⚡ TEST SUITE 6: Query Performance');
  console.log('='.repeat(80));

  try {
    // Test query performance on view
    const start1 = Date.now();
    await pool.query('SELECT * FROM core.supplier WHERE active = true');
    const time1 = Date.now() - start1;

    console.log(`  Query time (core.supplier): ${time1}ms`);

    logTest(
      'Query performance acceptable (<500ms)',
      time1 < 500,
      `Query took ${time1}ms`,
      time1 < 1000 ? 'warning' : 'error'
    );

    // Test complex join query
    const start2 = Date.now();
    await pool.query(`
      SELECT
        s.name,
        s.code,
        COUNT(sp.supplier_product_id) as product_count
      FROM core.supplier s
      LEFT JOIN core.supplier_product sp ON s.supplier_id = sp.supplier_id
      GROUP BY s.supplier_id, s.name, s.code
      LIMIT 10
    `);
    const time2 = Date.now() - start2;

    console.log(`  Join query time: ${time2}ms`);

    logTest(
      'Join query performance acceptable (<1000ms)',
      time2 < 1000,
      `Join query took ${time2}ms`,
      time2 < 2000 ? 'warning' : 'error'
    );

  } catch (error) {
    logTest('Query performance test', false, error.message);
  }
}

async function test07_ViewDefinitions() {
  console.log('\n📋 TEST SUITE 7: View Definition Validation');
  console.log('='.repeat(80));

  try {
    // Check that views have proper definitions
    const viewDefs = await pool.query(`
      SELECT
        schemaname,
        viewname,
        LENGTH(definition) as def_length
      FROM pg_views
      WHERE schemaname = 'core'
      AND viewname IN ('supplier', 'supplier_view', 'supplier_product', 'supplier_product_view')
      ORDER BY viewname
    `);

    console.log(`  Found ${viewDefs.rows.length} view definitions`);

    logTest(
      'All expected views have definitions',
      viewDefs.rows.length >= 4,
      `Found ${viewDefs.rows.length} out of 4+ expected views`
    );

    viewDefs.rows.forEach(row => {
      logTest(
        `View ${row.viewname} has non-empty definition`,
        row.def_length > 0,
        `Definition length: ${row.def_length} characters`
      );
    });

  } catch (error) {
    logTest('View definition validation', false, error.message);
  }
}

async function test08_MaterializedView() {
  console.log('\n🔄 TEST SUITE 8: Materialized View');
  console.log('='.repeat(80));

  try {
    // Check if materialized view exists
    const mvExists = await pool.query(`
      SELECT schemaname, matviewname
      FROM pg_matviews
      WHERE schemaname = 'core'
      AND matviewname = 'supplier_summary'
    `);

    if (mvExists.rows.length > 0) {
      logTest('Materialized view core.supplier_summary exists', true);

      // Check if it has data
      const mvData = await pool.query('SELECT COUNT(*) FROM core.supplier_summary');
      const mvCount = parseInt(mvData.rows[0].count);

      logTest(
        'Materialized view has data',
        mvCount > 0,
        `Row count: ${mvCount}`,
        'warning'
      );

      // Test refresh function exists
      const refreshFnExists = await pool.query(`
        SELECT proname
        FROM pg_proc
        WHERE proname = 'refresh_all_materialized_views'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'core')
      `);

      logTest(
        'Refresh function exists',
        refreshFnExists.rows.length > 0,
        'Function core.refresh_all_materialized_views()'
      );

    } else {
      logTest(
        'Materialized view core.supplier_summary exists',
        false,
        'Materialized view not found',
        'warning'
      );
    }

  } catch (error) {
    logTest('Materialized view check', false, error.message, 'warning');
  }
}

async function test09_MigrationReadiness() {
  console.log('\n🎯 TEST SUITE 9: Migration Readiness');
  console.log('='.repeat(80));

  try {
    // Check if migration readiness function exists
    const fnExists = await pool.query(`
      SELECT proname
      FROM pg_proc
      WHERE proname = 'check_migration_readiness'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'core')
    `);

    if (fnExists.rows.length > 0) {
      logTest('Migration readiness function exists', true);

      // Call the function
      const readiness = await pool.query('SELECT * FROM core.check_migration_readiness()');

      console.log('\n  Migration Readiness Status:');
      readiness.rows.forEach(row => {
        console.log(`    ${row.object_name.padEnd(20)} ${row.object_type.padEnd(10)} ${row.is_ready ? '✅' : '⏳'} Ready: ${row.is_ready}`);
        console.log(`    ${' '.repeat(32)} Rows: ${row.row_count}, ${row.notes}`);
      });

      const allReady = readiness.rows.every(row => row.is_ready);

      logTest(
        'System ready for Phase 2 migration',
        !allReady,  // Should NOT be ready yet (views, not tables)
        allReady ? 'Already migrated' : 'Views active, tables empty (expected state)'
      );

    } else {
      logTest(
        'Migration readiness function exists',
        false,
        'Function not found',
        'warning'
      );
    }

  } catch (error) {
    logTest('Migration readiness check', false, error.message);
  }
}

async function test10_CompatibilityCheck() {
  console.log('\n🔗 TEST SUITE 10: API Compatibility');
  console.log('='.repeat(80));

  try {
    // Test that both query patterns work
    const query1 = await pool.query('SELECT COUNT(*) FROM core.supplier');
    const query2 = await pool.query('SELECT COUNT(*) FROM core.supplier_view');

    const count1 = parseInt(query1.rows[0].count);
    const count2 = parseInt(query2.rows[0].count);

    logTest(
      'Both query patterns return data',
      count1 > 0 && count2 > 0,
      `core.supplier: ${count1}, core.supplier_view: ${count2}`
    );

    // Test JOIN compatibility
    const joinQuery = await pool.query(`
      SELECT
        s.supplier_id,
        s.name,
        COUNT(sp.supplier_product_id) as product_count
      FROM core.supplier s
      LEFT JOIN core.supplier_product sp ON s.supplier_id = sp.supplier_id
      GROUP BY s.supplier_id, s.name
      LIMIT 5
    `);

    logTest(
      'JOIN queries work across views',
      joinQuery.rows.length > 0,
      `Returned ${joinQuery.rows.length} suppliers with product counts`
    );

    // Display sample JOIN result
    if (joinQuery.rows.length > 0) {
      console.log('\n  Sample JOIN result:');
      joinQuery.rows.forEach(row => {
        console.log(`    ${row.name.padEnd(30)} Products: ${row.product_count}`);
      });
    }

  } catch (error) {
    logTest('API compatibility check', false, error.message);
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║           SCHEMA BRIDGE VERIFICATION TEST SUITE                       ║');
  console.log('║           MantisNXT - Public ↔ Core Schema Bridge                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');

  try {
    await test01_SchemasExist();
    await test02_ViewsExist();
    await test03_RowCounts();
    await test04_ColumnMapping();
    await test05_DataIntegrity();
    await test06_QueryPerformance();
    await test07_ViewDefinitions();
    await test08_MaterializedView();
    await test09_MigrationReadiness();
    await test10_CompatibilityCheck();

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed:   ${results.passed}`);
  console.log(`❌ Failed:   ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`📝 Total:    ${results.tests.length}`);

  const passRate = (results.passed / results.tests.length * 100).toFixed(1);
  console.log(`\n🎯 Pass Rate: ${passRate}%`);

  if (results.failed === 0) {
    console.log('\n✨ ALL CRITICAL TESTS PASSED - Schema bridge is functional');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Review failures before proceeding');
  }

  if (results.warnings > 0) {
    console.log(`⚠️  ${results.warnings} warnings detected - Review recommended but not blocking`);
  }

  console.log('\n');

  await pool.end();

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();
