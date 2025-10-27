const { Client } = require('pg')

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function checkInventorySchema() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Check inventory_items table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'inventory_items'
      ORDER BY ordinal_position;
    `)

    console.log('\n📋 INVENTORY_ITEMS TABLE STRUCTURE:')
    console.log('Column Name'.padEnd(30), 'Data Type'.padEnd(20), 'Nullable'.padEnd(10), 'Default')
    console.log('='.repeat(80))

    result.rows.forEach(row => {
      console.log(
        row.column_name.padEnd(30),
        row.data_type.padEnd(20),
        row.is_nullable.padEnd(10),
        row.column_default || 'NULL'
      )
    })

    console.log(`\nTotal columns: ${result.rows.length}`)

    // Check some sample data
    const sampleData = await client.query('SELECT * FROM inventory_items LIMIT 5')
    console.log('\n📊 SAMPLE DATA:')
    console.log('='.repeat(40))
    console.log(`Rows found: ${sampleData.rows.length}`)
    if (sampleData.rows.length > 0) {
      console.log('First row:', JSON.stringify(sampleData.rows[0], null, 2))
    }

  } catch (error) {
    console.error('❌ Error checking schema:', error)
  } finally {
    await client.end()
  }
}

checkInventorySchema()