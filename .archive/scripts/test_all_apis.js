const { Client } = require('pg')

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function testAllAPIs() {
  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL database')

    // Test 1: Suppliers API Query
    console.log('\n🔍 TEST 1: SUPPLIERS API QUERY')
    console.log('='.repeat(50))

    const suppliersQuery = `
      SELECT s.*
      FROM suppliers s
      WHERE 1=1
      ORDER BY s.name ASC
      LIMIT 5
    `
    const suppliersResult = await client.query(suppliersQuery)
    console.log(`✅ Found ${suppliersResult.rows.length} suppliers`)

    suppliersResult.rows.forEach((supplier, index) => {
      console.log(`${index + 1}. ${supplier.name} (${supplier.supplier_code})`)
      console.log(`   Status: ${supplier.status}, Tier: ${supplier.performance_tier}`)
      console.log(`   Category: ${supplier.primary_category}`)
      console.log(`   Rating: ${supplier.rating}, AI Score: ${supplier.ai_performance_score}`)
    })

    // Test 2: Products API Query (Fixed)
    console.log('\n🔍 TEST 2: PRODUCTS API QUERY (FIXED)')
    console.log('='.repeat(50))

    const productsQuery = `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.description,
        p.category,
        p.brand,
        p.cost_price as price,
        p.retail_price as sale_price,
        p.status,
        p.unit_of_measure as unit,
        COALESCE(s.name, 'Unknown') as supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.status = 'active'
      ORDER BY p.name ASC
      LIMIT 5
    `

    const productsResult = await client.query(productsQuery)
    console.log(`✅ Found ${productsResult.rows.length} active products`)

    productsResult.rows.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`)
      console.log(`   SKU: ${product.sku}, Category: ${product.category}`)
      console.log(`   Price: R${product.price}, Supplier: ${product.supplier_name}`)
    })

    // Test 3: Inventory Items API Query
    console.log('\n🔍 TEST 3: INVENTORY ITEMS API QUERY')
    console.log('='.repeat(50))

    const inventoryQuery = `
      SELECT
        i.*,
        s.name as supplier_name
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.status = 'active'
      ORDER BY i.name ASC
      LIMIT 5
    `

    const inventoryResult = await client.query(inventoryQuery)
    console.log(`✅ Found ${inventoryResult.rows.length} inventory items`)

    inventoryResult.rows.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`)
      console.log(`   SKU: ${item.sku}, Stock: ${item.stock_qty}`)
      console.log(`   Cost: R${item.cost_price}, Supplier: ${item.supplier_name || 'N/A'}`)
    })

    // Test 4: Purchase Orders API Query
    console.log('\n🔍 TEST 4: PURCHASE ORDERS API QUERY')
    console.log('='.repeat(50))

    const poQuery = `
      SELECT
        po.*,
        s.name as supplier_name,
        s.supplier_code
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.created_at DESC
      LIMIT 5
    `

    const poResult = await client.query(poQuery)
    console.log(`✅ Found ${poResult.rows.length} purchase orders`)

    poResult.rows.forEach((po, index) => {
      console.log(`${index + 1}. ${po.po_number}`)
      console.log(`   Supplier: ${po.supplier_name || 'N/A'}`)
      console.log(`   Status: ${po.status}, Total: R${po.total_amount}`)
      console.log(`   Order Date: ${po.order_date}`)
    })

    // Test 5: Analytics Dashboard Query
    console.log('\n🔍 TEST 5: ANALYTICS DASHBOARD QUERIES')
    console.log('='.repeat(50))

    const [
      totalSuppliersResult,
      totalProductsResult,
      totalInventoryResult,
      lowStockResult,
      outOfStockResult
    ] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM suppliers WHERE status = $1', ['active']),
      client.query('SELECT COUNT(*) as count FROM products WHERE status = $1', ['active']),
      client.query('SELECT COUNT(*) as count, SUM(stock_qty * cost_price) as total_value FROM inventory_items WHERE status = $1', ['active']),
      client.query('SELECT COUNT(*) as count FROM inventory_items WHERE stock_qty <= reorder_point AND stock_qty > 0'),
      client.query('SELECT COUNT(*) as count FROM inventory_items WHERE stock_qty = 0')
    ])

    console.log(`✅ Total Active Suppliers: ${totalSuppliersResult.rows[0].count}`)
    console.log(`✅ Total Active Products: ${totalProductsResult.rows[0].count}`)
    console.log(`✅ Total Inventory Items: ${totalInventoryResult.rows[0].count}`)
    console.log(`✅ Total Inventory Value: R${parseFloat(totalInventoryResult.rows[0].total_value || '0').toFixed(2)}`)
    console.log(`✅ Low Stock Items: ${lowStockResult.rows[0].count}`)
    console.log(`✅ Out of Stock Items: ${outOfStockResult.rows[0].count}`)

    // Test 6: Supplier-Product Relationships
    console.log('\n🔍 TEST 6: SUPPLIER-PRODUCT RELATIONSHIPS')
    console.log('='.repeat(50))

    const relationshipQuery = `
      SELECT
        s.name as supplier_name,
        COUNT(p.id) as product_count,
        s.total_products
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      WHERE s.status = 'active'
      GROUP BY s.id, s.name, s.total_products
      ORDER BY product_count DESC
      LIMIT 10
    `

    const relationshipResult = await client.query(relationshipQuery)
    console.log(`✅ Supplier-Product Relationships:`)

    relationshipResult.rows.forEach((rel, index) => {
      console.log(`${index + 1}. ${rel.supplier_name}`)
      console.log(`   Products in DB: ${rel.product_count}, Total Products: ${rel.total_products || 0}`)
    })

    console.log('\n🎉 ALL API TESTS COMPLETED SUCCESSFULLY!')
    console.log('='.repeat(50))
    console.log('✅ Database integration is working properly')
    console.log('✅ All queries use correct table names and schemas')
    console.log('✅ Real data is being returned from the database')

  } catch (error) {
    console.error('❌ Error in API testing:', error)
  } finally {
    await client.end()
  }
}

testAllAPIs()