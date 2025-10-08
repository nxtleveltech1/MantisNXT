const { Client } = require('pg')

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function understandSystemArchitecture() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Check supplier-related tables
    console.log('\n📋 SUPPLIER & PRODUCT RELATED TABLES:')
    console.log('='.repeat(60))

    const supplierTables = await client.query(`
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
             (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) as approx_row_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND (table_name ILIKE '%supplier%' OR table_name ILIKE '%product%' OR table_name ILIKE '%price%' OR table_name ILIKE '%brand%')
      ORDER BY table_name;
    `)

    supplierTables.rows.forEach(row => {
      console.log(`   ${row.table_name.padEnd(30)} | ${row.column_count.toString().padStart(3)} cols | ${row.approx_row_count?.toString()?.padStart(6) || '    ?'} rows`)
    })

    // Check suppliers table data
    console.log('\n📊 SUPPLIERS TABLE SAMPLE:')
    console.log('='.repeat(60))
    const suppliersData = await client.query('SELECT id, name, status, supplier_code FROM suppliers LIMIT 5')
    suppliersData.rows.forEach(row => {
      console.log(`   ${row.name} (${row.supplier_code}) - ${row.status}`)
    })
    console.log(`   ... and ${(await client.query('SELECT COUNT(*) FROM suppliers')).rows[0].count} total suppliers`)

    // Check Product table structure and sample
    console.log('\n📋 PRODUCT TABLE (CENTRALIZED):')
    console.log('='.repeat(60))
    const productCount = await client.query('SELECT COUNT(*) FROM "Product"')
    console.log(`   Rows: ${productCount.rows[0].count}`)

    if (productCount.rows[0].count > 0) {
      const productSample = await client.query('SELECT * FROM "Product" LIMIT 3')
      console.log('   Sample:', JSON.stringify(productSample.rows[0], null, 2))
    } else {
      console.log('   ❌ Product table is EMPTY - this explains the issues!')
    }

    // Check if there are any price list or supplier product tables
    console.log('\n📋 PRICE LIST & SUPPLIER PRODUCT TABLES:')
    console.log('='.repeat(60))

    const pricelistData = await client.query('SELECT COUNT(*) FROM "Pricelist"')
    console.log(`   Pricelist rows: ${pricelistData.rows[0].count}`)

    const pricelistItemData = await client.query('SELECT COUNT(*) FROM "PricelistItem"')
    console.log(`   PricelistItem rows: ${pricelistItemData.rows[0].count}`)

    if (pricelistItemData.rows[0].count > 0) {
      const pricelistSample = await client.query(`
        SELECT pi.*, p."name" as product_name, pl."name" as pricelist_name
        FROM "PricelistItem" pi
        LEFT JOIN "Product" p ON pi."productId" = p.id
        LEFT JOIN "Pricelist" pl ON pi."pricelistId" = pl.id
        LIMIT 3
      `)
      console.log('   Sample PricelistItem:', JSON.stringify(pricelistSample.rows[0], null, 2))
    }

    // Check inventory_items - is this working inventory or what?
    console.log('\n📋 INVENTORY_ITEMS TABLE (CURRENT WORKING STOCK):')
    console.log('='.repeat(60))
    const inventoryCount = await client.query('SELECT COUNT(*) FROM inventory_items')
    console.log(`   Rows: ${inventoryCount.rows[0].count}`)

    if (inventoryCount.rows[0].count > 0) {
      const inventorySample = await client.query('SELECT name, sku, stock_qty, cost_price, supplier_id FROM inventory_items LIMIT 3')
      console.log('   Sample inventory_items:')
      inventorySample.rows.forEach(row => {
        console.log(`     ${row.name} | SKU: ${row.sku} | Stock: ${row.stock_qty} | Cost: ${row.cost_price}`)
      })
    }

    console.log('\n🤔 SYSTEM ARCHITECTURE ANALYSIS:')
    console.log('='.repeat(60))
    console.log('   1. Suppliers table: ✅ Populated with your 22 suppliers')
    console.log(`   2. Product table: ${productCount.rows[0].count > 0 ? '✅' : '❌'} ${productCount.rows[0].count > 0 ? 'Has products' : 'EMPTY - needs supplier price list imports'}`)
    console.log(`   3. Pricelist/PricelistItem: ${pricelistItemData.rows[0].count > 0 ? '✅' : '❌'} ${pricelistItemData.rows[0].count > 0 ? 'Has price data' : 'EMPTY - needs supplier uploads'}`)
    console.log(`   4. inventory_items: ${inventoryCount.rows[0].count > 0 ? '✅' : '❌'} ${inventoryCount.rows[0].count > 0 ? 'Has current stock' : 'EMPTY'}`)

  } catch (error) {
    console.error('❌ Error analyzing architecture:', error)
  } finally {
    await client.end()
  }
}

understandSystemArchitecture()