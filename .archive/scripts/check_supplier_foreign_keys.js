const { Client } = require('pg')

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function checkSupplierForeignKeys() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Check Supplier vs suppliers table structures
    console.log('\n📋 SUPPLIER TABLE COMPARISON:')
    console.log('='.repeat(60))

    const supplierBig = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Supplier'
      ORDER BY ordinal_position
    `)

    const suppliersSmall = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'suppliers'
      ORDER BY ordinal_position
    `)

    console.log('Supplier table (capitalized):')
    supplierBig.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`)
    })

    console.log('\nsuppliers table (lowercase):')
    suppliersSmall.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`)
    })

    // Check what data is in each
    const supplierBigCount = await client.query('SELECT COUNT(*) FROM "Supplier"')
    const suppliersSmallCount = await client.query('SELECT COUNT(*) FROM suppliers')

    console.log('\n📊 DATA COUNTS:')
    console.log(`   Supplier (capitalized): ${supplierBigCount.rows[0].count} rows`)
    console.log(`   suppliers (lowercase): ${suppliersSmallCount.rows[0].count} rows`)

    // Check Product table foreign key constraints
    console.log('\n🔗 PRODUCT TABLE FOREIGN KEY CONSTRAINTS:')
    const constraints = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'Product'
    `)

    constraints.rows.forEach(row => {
      console.log(`   ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`)
    })

    // Sample some supplier IDs from inventory_items
    console.log('\n📋 INVENTORY_ITEMS SUPPLIER IDs:')
    const inventorySuppliers = await client.query(`
      SELECT DISTINCT supplier_id, COUNT(*) as items
      FROM inventory_items
      WHERE supplier_id IS NOT NULL
      GROUP BY supplier_id
      LIMIT 5
    `)

    inventorySuppliers.rows.forEach(row => {
      console.log(`   ${row.supplier_id} (${row.items} items)`)
    })

    // Check if these IDs exist in Supplier table
    console.log('\n🔍 CHECKING SUPPLIER ID EXISTENCE:')
    for (const row of inventorySuppliers.rows) {
      const existsInBig = await client.query('SELECT COUNT(*) FROM "Supplier" WHERE id = $1', [row.supplier_id])
      const existsInSmall = await client.query('SELECT COUNT(*) FROM suppliers WHERE id = $1', [row.supplier_id])

      console.log(`   ${row.supplier_id}:`)
      console.log(`     - In Supplier: ${existsInBig.rows[0].count > 0 ? 'YES' : 'NO'}`)
      console.log(`     - In suppliers: ${existsInSmall.rows[0].count > 0 ? 'YES' : 'NO'}`)
    }

  } catch (error) {
    console.error('❌ Error checking foreign keys:', error)
  } finally {
    await client.end()
  }
}

checkSupplierForeignKeys()