const { Client } = require('pg')

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function checkPOItems() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Check purchase order related tables
    const poTables = ['purchase_order_items', 'purchase_order_item']

    for (const tableName of poTables) {
      console.log(`\n🔍 ANALYZING TABLE: ${tableName}`)
      console.log('='.repeat(60))

      try {
        // Get table schema
        const schemaResult = await client.query(`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position;
        `, [tableName])

        if (schemaResult.rows.length === 0) {
          console.log(`   ❌ Table '${tableName}' not found`)
          continue
        }

        console.log('   COLUMNS:')
        schemaResult.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
          console.log(`     ${col.column_name.padEnd(25)} ${col.data_type} ${nullable}${defaultVal}`)
        })

        // Get row count
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`)
        console.log(`   📊 Total rows: ${countResult.rows[0].count}`)

        // Get sample data
        const sampleResult = await client.query(`SELECT * FROM ${tableName} LIMIT 2`)
        if (sampleResult.rows.length > 0) {
          console.log('   📋 SAMPLE DATA:')
          sampleResult.rows.forEach((row, index) => {
            console.log(`     Row ${index + 1}:`, JSON.stringify(row, null, 2))
          })
        }

      } catch (error) {
        console.log(`   ❌ Error analyzing ${tableName}:`, error.message)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
  }
}

checkPOItems()