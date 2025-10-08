/**
 * Critical Query Tests - Test all failing API queries
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 5
});

async function testQuery(name, sql, params = []) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${name}`);
  console.log('='.repeat(80));
  console.log(`SQL: ${sql}`);
  console.log(`Params: ${JSON.stringify(params)}`);

  const start = Date.now();

  try {
    const result = await pool.query(sql, params);
    const duration = Date.now() - start;

    console.log(`✅ SUCCESS (${duration}ms)`);
    console.log(`Rows returned: ${result.rows.length}`);

    if (result.rows.length > 0) {
      console.log('\nSample row:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }

    return { success: true, rows: result.rows.length, duration, data: result.rows };
  } catch (error) {
    const duration = Date.now() - start;

    console.log(`❌ FAILURE (${duration}ms)`);
    console.log(`Error: ${error.message}`);
    console.log(`Code: ${error.code}`);

    return { success: false, error: error.message, duration };
  }
}

async function main() {
  console.log('🔍 CRITICAL QUERY TESTS - Neon Database');
  console.log('Project: proud-mud-50346856');
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results = [];

  // 1. Check what tables exist
  results.push(await testQuery(
    'List all tables in core schema',
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'core'
    ORDER BY table_name
    `
  ));

  // 2. Check if product table exists (different name?)
  results.push(await testQuery(
    'Find product-related tables',
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'core'
      AND table_name LIKE '%product%'
    `
  ));

  // 3. Active suppliers (API failing with 400)
  results.push(await testQuery(
    'Active Suppliers Filter',
    `
    SELECT supplier_id, name, active, contact_email
    FROM core.supplier
    WHERE active = true
    LIMIT 100
    `
  ));

  // 4. Analytics aggregations
  results.push(await testQuery(
    'Analytics Dashboard Aggregations',
    `
    SELECT
      COUNT(*) as total_items,
      SUM(qty) as total_qty,
      COUNT(DISTINCT supplier_product_id) as unique_products,
      COUNT(DISTINCT location_id) as unique_locations
    FROM core.stock_on_hand
    `
  ));

  // 5. Supplier product counts
  results.push(await testQuery(
    'Supplier Product Counts',
    `
    SELECT
      s.supplier_id,
      s.name as supplier_name,
      s.active,
      COUNT(sp.supplier_product_id) as product_count
    FROM core.supplier s
    LEFT JOIN core.supplier_product sp ON s.supplier_id = sp.supplier_id
    GROUP BY s.supplier_id, s.name, s.active
    ORDER BY product_count DESC
    `
  ));

  // 6. Try inventory with suppliers WITHOUT products table
  results.push(await testQuery(
    'Inventory with Suppliers (No Products Join)',
    `
    SELECT
      soh.soh_id,
      soh.qty,
      soh.location_id,
      sp.supplier_product_id,
      sp.supplier_id,
      sp.supplier_sku,
      sp.name_from_supplier,
      sp.uom,
      sp.is_active,
      s.name as supplier_name,
      s.active as supplier_active
    FROM core.stock_on_hand soh
    JOIN core.supplier_product sp ON soh.supplier_product_id = sp.supplier_product_id
    JOIN core.supplier s ON sp.supplier_id = s.supplier_id
    WHERE soh.location_id = 1
    LIMIT 100
    `
  ));

  // 7. Check stock_movements table
  results.push(await testQuery(
    'Check if stock_movements exists',
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'core'
      AND table_name = 'stock_movements'
    `
  ));

  // 8. Test supplier_product data quality
  results.push(await testQuery(
    'Supplier Product Data Sample',
    `
    SELECT
      supplier_product_id,
      supplier_id,
      supplier_sku,
      name_from_supplier,
      product_id,
      is_active,
      is_new
    FROM core.supplier_product
    WHERE supplier_id = 1
    LIMIT 10
    `
  ));

  // 9. Check for missing stock (qty = 0)
  results.push(await testQuery(
    'Zero Quantity Stock Items',
    `
    SELECT COUNT(*) as zero_qty_count
    FROM core.stock_on_hand
    WHERE qty = 0
    `
  ));

  // 10. Check location data
  results.push(await testQuery(
    'Stock Locations',
    `
    SELECT location_id, COUNT(*) as item_count
    FROM core.stock_on_hand
    GROUP BY location_id
    ORDER BY location_id
    `
  ));

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total queries: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total duration: ${totalDuration}ms`);
  console.log(`Average duration: ${(totalDuration / results.length).toFixed(2)}ms`);

  await pool.end();
  console.log('\n✅ Tests complete');
}

main().catch(console.error);
