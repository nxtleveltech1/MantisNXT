const { Client } = require('pg')

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function populateProductsFromInventory() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Get existing inventory items to convert to products
    const inventoryItems = await client.query(`
      SELECT
        i.name,
        i.sku,
        i.description,
        i.cost_price,
        i.supplier_id,
        i.category,
        s.name as supplier_name
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.status = 'active'
      LIMIT 10
    `)

    console.log(`\n📦 Found ${inventoryItems.rows.length} inventory items to convert to products`)

    // Insert these into Product table
    let insertedCount = 0

    for (const item of inventoryItems.rows) {
      try {
        const insertQuery = `
          INSERT INTO "Product" (
            id, sku, name, description, "basePrice", currency, "supplierId", active, "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, 'ZAR', $5, true, NOW(), NOW()
          )
          ON CONFLICT (sku) DO NOTHING
        `

        await client.query(insertQuery, [
          item.sku,
          item.name,
          item.description || `${item.name} - Quality product from ${item.supplier_name}`,
          parseFloat(item.cost_price),
          item.supplier_id
        ])

        console.log(`✅ Added product: ${item.name} (${item.sku})`)
        insertedCount++

      } catch (itemError) {
        console.error(`❌ Error adding ${item.name}:`, itemError.message)
      }
    }

    // Get final count
    const productCount = await client.query('SELECT COUNT(*) FROM "Product"')

    console.log(`\n📊 PRODUCT TABLE SUMMARY:`)
    console.log(`✅ Successfully inserted ${insertedCount} products`)
    console.log(`📋 Total products in Product table: ${productCount.rows[0].count}`)

    // Show sample of what's now in Product table
    const sampleProducts = await client.query(`
      SELECT p.name, p.sku, p."basePrice", s.name as supplier_name
      FROM "Product" p
      LEFT JOIN suppliers s ON p."supplierId" = s.id
      LIMIT 5
    `)

    console.log('\n📋 SAMPLE PRODUCTS:')
    sampleProducts.rows.forEach(row => {
      console.log(`   ${row.name} | ${row.sku} | R${row.basePrice} | ${row.supplier_name}`)
    })

    console.log('\n🎉 Product table populated! Dashboard should now work.')
    console.log('💡 Next: Build supplier price list upload system to add more products.')

  } catch (error) {
    console.error('❌ Error populating products:', error)
  } finally {
    await client.end()
  }
}

populateProductsFromInventory()