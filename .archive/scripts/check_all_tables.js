const { Client } = require('pg')

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function checkAllTables() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Check all tables in the database
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `)

    console.log('\n📋 ALL TABLES IN DATABASE:')
    console.log('='.repeat(40))
    result.rows.forEach(row => {
      console.log(`   ${row.table_name}`)
    })

    console.log(`\n   Total tables: ${result.rows.length}`)

    // Check which tables we think we need vs what exists
    const expectedTables = ['suppliers', 'purchase_orders', 'products', 'inventory_items']
    console.log('\n📊 EXPECTED vs ACTUAL:')
    console.log('='.repeat(40))

    for (const table of expectedTables) {
      const exists = result.rows.some(row => row.table_name === table)
      console.log(`   ${table.padEnd(20)}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`)
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error)
  } finally {
    await client.end()
  }
}

checkAllTables()