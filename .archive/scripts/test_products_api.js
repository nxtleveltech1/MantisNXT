const { Client } = require('pg')

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function testProductsQuery() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Test the corrected products query
    console.log('\n🔍 TESTING PRODUCTS QUERY (Fixed):')
    console.log('='.repeat(50))

    const query = `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.description,
        p.category,
        p.brand,
        p.cost_price as price,
        p.retail_price as sale_price,
        0 as stock,
        COALESCE(p.minimum_stock, 10) as reorder_point,
        p.status,
        p.unit_of_measure as unit,
        COALESCE(s.name, 'Unknown') as supplier_name,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.status = 'active'
      ORDER BY p.name ASC
      LIMIT 5
    `

    const result = await client.query(query)
    console.log(`Found ${result.rows.length} products`)

    result.rows.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`)
      console.log(`   SKU: ${product.sku}`)
      console.log(`   Category: ${product.category}`)
      console.log(`   Brand: ${product.brand}`)
      console.log(`   Price: ${product.price} ZAR`)
      console.log(`   Supplier: ${product.supplier_name}`)
    })

    // Test supplier inventory query
    console.log('\n\n🔍 TESTING SUPPLIER INVENTORY QUERY (Fixed):')
    console.log('='.repeat(50))

    const supplierInventoryQuery = `
      SELECT
        i.id,
        i.sku,
        i.name as inventory_name,
        i.stock_qty,
        p.name as product_name,
        s.name as supplier_name
      FROM inventory_items i
      LEFT JOIN products p ON i.sku = p.sku
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE s.id IS NOT NULL
      LIMIT 5
    `

    const inventoryResult = await client.query(supplierInventoryQuery)
    console.log(`Found ${inventoryResult.rows.length} inventory items with supplier data`)

    inventoryResult.rows.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.inventory_name || item.product_name}`)
      console.log(`   SKU: ${item.sku}`)
      console.log(`   Stock: ${item.stock_qty}`)
      console.log(`   Supplier: ${item.supplier_name}`)
    })

    // Test count queries
    console.log('\n\n📊 DATABASE COUNTS:')
    console.log('='.repeat(50))

    const counts = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM products WHERE status = \'active\''),
      client.query('SELECT COUNT(*) as count FROM suppliers WHERE status = \'active\''),
      client.query('SELECT COUNT(*) as count FROM inventory_items WHERE status = \'active\''),
    ])

    console.log(`Active Products: ${counts[0].rows[0].count}`)
    console.log(`Active Suppliers: ${counts[1].rows[0].count}`)
    console.log(`Active Inventory Items: ${counts[2].rows[0].count}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
  }
}

testProductsQuery()