const { Client } = require('pg')
const fs = require('fs')
const csv = require('csv-parser')

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function uploadAlphaPricelist() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // First, check the structure of Pricelist and PricelistItem tables
    console.log('\n📋 CHECKING TABLE STRUCTURES:')
    console.log('='.repeat(60))

    const pricelistStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Pricelist'
      ORDER BY ordinal_position
    `)

    const pricelistItemStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'PricelistItem'
      ORDER BY ordinal_position
    `)

    console.log('Pricelist table:')
    pricelistStructure.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'required'})`)
    })

    console.log('\nPricelistItem table:')
    pricelistItemStructure.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'required'})`)
    })

    // Find Alpha Technologies supplier
    const alphaSupplier = await client.query(`
      SELECT id, name FROM suppliers WHERE name ILIKE '%alpha%'
    `)

    if (alphaSupplier.rows.length === 0) {
      console.error('❌ Alpha Technologies supplier not found!')
      return
    }

    const supplierId = alphaSupplier.rows[0].id
    console.log(`\n✅ Found supplier: ${alphaSupplier.rows[0].name} (${supplierId})`)

    // Create a new pricelist for Alpha Technologies
    const pricelistName = 'Alpha Technologies - August 2025 Alfatron Products'
    const pricelistInsert = await client.query(`
      INSERT INTO "Pricelist" (
        id, name, "supplierId", currency, "validFrom", "validTo", active, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'ZAR', NOW(), NULL, true, NOW(), NOW()
      ) RETURNING id, name
    `, [pricelistName, supplierId])

    const pricelistId = pricelistInsert.rows[0].id
    console.log(`✅ Created pricelist: ${pricelistInsert.rows[0].name} (${pricelistId})`)

    // Read and process the CSV file
    console.log('\n📂 READING CSV FILE:')
    const csvFilePath = 'C:\\Users\\garet\\Downloads\\Alpha-Technologies-Pricelist-August-2025- (2)_Alfatron_Display___UC__semantic_cleaned.csv'

    const products = []

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          // Clean up the data
          const product = {
            supplier_name: row.supplier_name?.trim(),
            brand: row.brand?.trim(),
            category: row.category?.trim(),
            sku: row.sku?.trim(),
            description: row.description?.trim(),
            price: parseFloat(row.price) || 0,
            vat_rate: parseFloat(row.vat_rate) || 0,
            stock_qty: parseInt(row.stock_qty) || 0
          }

          if (product.sku && product.description && product.price > 0) {
            products.push(product)
          }
        })
        .on('end', async () => {
          console.log(`📊 Parsed ${products.length} valid products from CSV`)

          // Insert products into PricelistItem table
          let insertedCount = 0
          let skippedCount = 0

          for (const product of products) {
            try {
              await client.query(`
                INSERT INTO "PricelistItem" (
                  id, "pricelistId", sku, name, description, price, "createdAt", "updatedAt"
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()
                ) ON CONFLICT (sku, "pricelistId") DO NOTHING
              `, [
                pricelistId,
                product.sku,
                `${product.brand} ${product.sku}`, // name
                product.description,
                product.price
              ])

              console.log(`✅ Added: ${product.sku} - ${product.brand} (R${product.price.toLocaleString()})`)
              insertedCount++

            } catch (itemError) {
              console.error(`❌ Error adding ${product.sku}:`, itemError.message)
              skippedCount++
            }
          }

          // Summary
          console.log('\n📊 UPLOAD SUMMARY:')
          console.log(`✅ Successfully uploaded ${insertedCount} products`)
          console.log(`⚠️  Skipped ${skippedCount} products`)

          // Check final counts
          const finalCount = await client.query(`
            SELECT COUNT(*) FROM "PricelistItem" WHERE "pricelistId" = $1
          `, [pricelistId])

          console.log(`📋 Total items in this pricelist: ${finalCount.rows[0].count}`)

          console.log('\n🎉 Alpha Technologies price list uploaded successfully!')
          console.log('💡 Next: Build interface to select products from this pricelist')

          await client.end()
          resolve()
        })
        .on('error', reject)
    })

  } catch (error) {
    console.error('❌ Error uploading pricelist:', error)
  }
}

// Install csv-parser if not installed
try {
  require('csv-parser')
} catch (e) {
  console.log('Installing csv-parser...')
  require('child_process').execSync('npm install csv-parser', { stdio: 'inherit' })
}

uploadAlphaPricelist()