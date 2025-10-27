const { Client } = require('pg')

const client = new Client({
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
})

async function analyzeSchema() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL database')

    // Key tables to analyze
    const keyTables = [
      'suppliers',
      'products',
      'inventory_items',
      'purchase_orders',
      'supplier_pricelists',
      'pricelist_items',
      'PricelistItem',
      'Product',
      'Supplier',
      'Pricelist'
    ]

    for (const tableName of keyTables) {
      console.log(`\n🔍 ANALYZING TABLE: ${tableName}`)
      console.log('='.repeat(60))

      try {
        // Get table schema
        const schemaResult = await client.query(`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
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
          const length = col.character_maximum_length ? `(${col.character_maximum_length})` : ''
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
          console.log(`     ${col.column_name.padEnd(25)} ${col.data_type}${length} ${nullable}${defaultVal}`)
        })

        // Get row count
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`)
        console.log(`   📊 Total rows: ${countResult.rows[0].count}`)

        // Get sample data (first 2 rows)
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

    // Check for foreign key relationships
    console.log(`\n🔗 FOREIGN KEY RELATIONSHIPS:`)
    console.log('='.repeat(60))

    const fkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('suppliers', 'products', 'inventory_items', 'purchase_orders', 'supplier_pricelists', 'pricelist_items')
      ORDER BY tc.table_name;
    `)

    fkResult.rows.forEach(fk => {
      console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
  }
}

analyzeSchema()