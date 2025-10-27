/**
 * Neon Query Diagnostics & Optimization Script
 * Analyzes schema, queries, indexes, and performance bottlenecks
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 5
});

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`  ${title}`, 'bold');
  log('='.repeat(80), 'cyan');
}

async function checkTableSchema(tableName) {
  section(`Schema Analysis: ${tableName}`);

  const schemaQuery = `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = $1
    ORDER BY ordinal_position;
  `;

  const result = await pool.query(schemaQuery, [tableName]);

  log(`\nColumns in core.${tableName}:`, 'green');
  console.table(result.rows);

  return result.rows;
}

async function checkIndexes(tableName) {
  section(`Index Analysis: core.${tableName}`);

  const indexQuery = `
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'core'
      AND tablename = $1;
  `;

  const result = await pool.query(indexQuery, [tableName]);

  if (result.rows.length === 0) {
    log('⚠️  NO INDEXES FOUND - Critical Performance Issue!', 'red');
  } else {
    log(`\nIndexes (${result.rows.length} found):`, 'green');
    result.rows.forEach((idx, i) => {
      log(`\n${i + 1}. ${idx.indexname}`, 'cyan');
      log(`   ${idx.indexdef}`, 'yellow');
    });
  }

  return result.rows;
}

async function checkConstraints(tableName) {
  section(`Constraint Analysis: core.${tableName}`);

  const constraintQuery = `
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    LEFT JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'core'
      AND tc.table_name = $1;
  `;

  const result = await pool.query(constraintQuery, [tableName]);

  log(`\nConstraints (${result.rows.length} found):`, 'green');
  console.table(result.rows);

  return result.rows;
}

async function testCriticalQuery(name, query, params = []) {
  section(`Query Test: ${name}`);

  log(`\nSQL:\n${query}`, 'yellow');
  log(`\nParams: ${JSON.stringify(params)}`, 'cyan');

  const startTime = Date.now();

  try {
    const result = await pool.query(query, params);
    const duration = Date.now() - startTime;

    log(`\n✅ SUCCESS`, 'green');
    log(`   Rows: ${result.rows.length}`, 'cyan');
    log(`   Duration: ${duration}ms`, duration > 1000 ? 'red' : 'green');

    if (result.rows.length > 0) {
      log(`\nSample Row:`, 'cyan');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }

    return { success: true, rows: result.rows.length, duration };
  } catch (error) {
    const duration = Date.now() - startTime;

    log(`\n❌ FAILURE`, 'red');
    log(`   Error: ${error.message}`, 'red');
    log(`   Duration: ${duration}ms`, 'red');

    return { success: false, error: error.message, duration };
  }
}

async function analyzeQueryPlan(name, query, params = []) {
  section(`Query Plan Analysis: ${name}`);

  log(`\nSQL:\n${query}`, 'yellow');

  const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE) ${query}`;

  try {
    const result = await pool.query(explainQuery, params);

    log(`\nExecution Plan:`, 'green');
    result.rows.forEach(row => {
      log(row['QUERY PLAN'], 'yellow');
    });

    return result.rows;
  } catch (error) {
    log(`\n❌ Plan Analysis Failed: ${error.message}`, 'red');
    return null;
  }
}

async function checkDataQuality(tableName, idColumn = 'id') {
  section(`Data Quality Check: core.${tableName}`);

  // Check for NULLs in critical columns
  const columns = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'core' AND table_name = $1
  `, [tableName]);

  log(`\nNull Value Analysis:`, 'cyan');

  for (const col of columns.rows) {
    if (col.is_nullable === 'NO') continue;

    const nullCount = await pool.query(`
      SELECT COUNT(*) as null_count
      FROM core.${tableName}
      WHERE ${col.column_name} IS NULL
    `);

    if (parseInt(nullCount.rows[0].null_count) > 0) {
      log(`  ⚠️  ${col.column_name}: ${nullCount.rows[0].null_count} NULL values`, 'yellow');
    }
  }

  // Check total row count
  const countResult = await pool.query(`SELECT COUNT(*) as total FROM core.${tableName}`);
  log(`\nTotal Rows: ${countResult.rows[0].total}`, 'green');

  return countResult.rows[0].total;
}

async function findSlowQueries() {
  section('Slow Query Analysis (pg_stat_statements)');

  // Check if pg_stat_statements is enabled
  const extensionCheck = await pool.query(`
    SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements'
  `);

  if (extensionCheck.rows.length === 0) {
    log('⚠️  pg_stat_statements extension not enabled', 'yellow');
    log('   Run: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;', 'cyan');
    return;
  }

  const slowQueries = await pool.query(`
    SELECT
      query,
      calls,
      total_exec_time,
      mean_exec_time,
      max_exec_time
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat_statements%'
    ORDER BY mean_exec_time DESC
    LIMIT 10
  `);

  log(`\nTop 10 Slowest Queries:`, 'green');
  console.table(slowQueries.rows);
}

async function suggestIndexes() {
  section('Index Suggestions');

  const suggestions = [];

  // Check stock_on_hand indexes
  const sohIndexes = await pool.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'core' AND tablename = 'stock_on_hand'
  `);

  const sohIndexNames = sohIndexes.rows.map(r => r.indexname);

  if (!sohIndexNames.some(n => n.includes('supplier_product_id'))) {
    suggestions.push({
      table: 'stock_on_hand',
      column: 'supplier_product_id',
      reason: 'Foreign key joins with supplier_product',
      sql: 'CREATE INDEX idx_soh_supplier_product_id ON core.stock_on_hand(supplier_product_id);'
    });
  }

  if (!sohIndexNames.some(n => n.includes('location_id'))) {
    suggestions.push({
      table: 'stock_on_hand',
      column: 'location_id',
      reason: 'Filtering by warehouse location',
      sql: 'CREATE INDEX idx_soh_location_id ON core.stock_on_hand(location_id);'
    });
  }

  // Check supplier_product indexes
  const spIndexes = await pool.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'core' AND tablename = 'supplier_product'
  `);

  const spIndexNames = spIndexes.rows.map(r => r.indexname);

  if (!spIndexNames.some(n => n.includes('supplier_id'))) {
    suggestions.push({
      table: 'supplier_product',
      column: 'supplier_id',
      reason: 'Foreign key joins with supplier',
      sql: 'CREATE INDEX idx_sp_supplier_id ON core.supplier_product(supplier_id);'
    });
  }

  if (!spIndexNames.some(n => n.includes('product_id'))) {
    suggestions.push({
      table: 'supplier_product',
      column: 'product_id',
      reason: 'Foreign key joins with products',
      sql: 'CREATE INDEX idx_sp_product_id ON core.supplier_product(product_id);'
    });
  }

  // Check supplier indexes
  const supplierIndexes = await pool.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'core' AND tablename = 'supplier'
  `);

  const supplierIndexNames = supplierIndexes.rows.map(r => r.indexname);

  if (!supplierIndexNames.some(n => n.includes('active'))) {
    suggestions.push({
      table: 'supplier',
      column: 'active',
      reason: 'Filtering by active status',
      sql: 'CREATE INDEX idx_supplier_active ON core.supplier(active) WHERE active = true;'
    });
  }

  if (suggestions.length === 0) {
    log('✅ All recommended indexes are present', 'green');
  } else {
    log(`\n⚠️  ${suggestions.length} Missing Indexes Found:`, 'yellow');
    console.table(suggestions);

    log(`\nSQL to create missing indexes:`, 'cyan');
    suggestions.forEach(s => {
      log(`\n-- ${s.table}.${s.column}: ${s.reason}`, 'yellow');
      log(s.sql, 'green');
    });
  }

  return suggestions;
}

async function runDiagnostics() {
  log('\n🔍 Neon Database Query Diagnostics - MantisNXT', 'bold');
  log('Project: proud-mud-50346856 (NXT-SPP)', 'cyan');

  try {
    // Test connection
    section('Connection Test');
    await pool.query('SELECT NOW() as current_time, version() as pg_version');
    log('✅ Database connection successful', 'green');

    // 1. Schema Analysis
    const sohSchema = await checkTableSchema('stock_on_hand');
    const spSchema = await checkTableSchema('supplier_product');
    const supplierSchema = await checkTableSchema('supplier');
    const productSchema = await checkTableSchema('products');

    // 2. Index Analysis
    await checkIndexes('stock_on_hand');
    await checkIndexes('supplier_product');
    await checkIndexes('supplier');
    await checkIndexes('products');

    // 3. Constraint Analysis
    await checkConstraints('stock_on_hand');
    await checkConstraints('supplier_product');
    await checkConstraints('supplier');

    // 4. Data Quality Checks
    await checkDataQuality('stock_on_hand');
    await checkDataQuality('supplier_product');
    await checkDataQuality('supplier');
    await checkDataQuality('products');

    // 5. Critical Query Tests
    section('Critical Query Testing');

    const queryResults = [];

    // Test 1: Inventory with suppliers (the main failing query)
    queryResults.push(await testCriticalQuery(
      'Inventory with Suppliers (LIMIT 100)',
      `
      SELECT
        soh.id,
        soh.qty,
        soh.total_value,
        sp.supplier_product_id,
        sp.supplier_id,
        s.supplier_name,
        s.active as supplier_active,
        p.product_name,
        p.sku
      FROM core.stock_on_hand soh
      JOIN core.supplier_product sp ON soh.supplier_product_id = sp.supplier_product_id
      JOIN core.supplier s ON sp.supplier_id = s.supplier_id
      JOIN core.products p ON sp.product_id = p.product_id
      WHERE soh.location_id = 1
      LIMIT 100
      `
    ));

    // Test 2: Active suppliers filter
    queryResults.push(await testCriticalQuery(
      'Active Suppliers Filter',
      `
      SELECT supplier_id, supplier_name, active, contact_email
      FROM core.supplier
      WHERE active = true
      LIMIT 100
      `
    ));

    // Test 3: Analytics aggregations
    queryResults.push(await testCriticalQuery(
      'Analytics Dashboard Aggregations',
      `
      SELECT
        COUNT(*) as total_items,
        SUM(qty) as total_qty,
        SUM(total_value) as total_value,
        AVG(total_value) as avg_value
      FROM core.stock_on_hand
      WHERE location_id = 1
      `
    ));

    // Test 4: Supplier product counts
    queryResults.push(await testCriticalQuery(
      'Supplier Product Counts',
      `
      SELECT
        s.supplier_id,
        s.supplier_name,
        COUNT(sp.supplier_product_id) as product_count
      FROM core.supplier s
      LEFT JOIN core.supplier_product sp ON s.supplier_id = sp.supplier_id
      GROUP BY s.supplier_id, s.supplier_name
      ORDER BY product_count DESC
      LIMIT 100
      `
    ));

    // Test 5: Stock movements (if table exists)
    queryResults.push(await testCriticalQuery(
      'Recent Stock Movements',
      `
      SELECT COUNT(*) as movement_count
      FROM core.stock_movements
      WHERE created_at > NOW() - INTERVAL '7 days'
      `
    ));

    // 6. Query Plan Analysis (for slow queries)
    const slowQueries = queryResults.filter(r => r.duration > 1000);
    if (slowQueries.length > 0) {
      log(`\n⚠️  ${slowQueries.length} queries exceeded 1 second`, 'yellow');
    }

    // 7. Slow Query Analysis
    await findSlowQueries();

    // 8. Index Suggestions
    const indexSuggestions = await suggestIndexes();

    // Final Summary
    section('Diagnostic Summary');

    const totalQueries = queryResults.length;
    const successfulQueries = queryResults.filter(r => r.success).length;
    const failedQueries = queryResults.filter(r => !r.success).length;
    const avgDuration = queryResults.reduce((sum, r) => sum + r.duration, 0) / totalQueries;

    log(`\nQuery Performance:`, 'cyan');
    log(`  Total Queries: ${totalQueries}`, 'white');
    log(`  Successful: ${successfulQueries}`, successfulQueries === totalQueries ? 'green' : 'yellow');
    log(`  Failed: ${failedQueries}`, failedQueries > 0 ? 'red' : 'green');
    log(`  Avg Duration: ${avgDuration.toFixed(2)}ms`, avgDuration > 1000 ? 'red' : 'green');

    log(`\nRecommendations:`, 'bold');
    if (indexSuggestions.length > 0) {
      log(`  1. Create ${indexSuggestions.length} missing indexes (see SQL above)`, 'yellow');
    }
    if (slowQueries.length > 0) {
      log(`  2. Optimize ${slowQueries.length} slow queries (>1s)`, 'yellow');
    }
    if (failedQueries > 0) {
      log(`  3. Fix ${failedQueries} failing queries (see errors above)`, 'red');
    }
    if (indexSuggestions.length === 0 && slowQueries.length === 0 && failedQueries === 0) {
      log(`  ✅ Database is well-optimized!`, 'green');
    }

  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await pool.end();
    log(`\n✅ Diagnostic complete. Pool closed.`, 'green');
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);
