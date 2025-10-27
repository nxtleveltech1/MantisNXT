const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false,
  max: 5,
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 30000
};

const pool = new Pool(dbConfig);

async function analyzeDatabaseStructure() {
  try {
    console.log('🔍 ANALYZING EXISTING DATABASE STRUCTURE FOR PRICE LISTS\n');

    // Focus on price list related tables
    const relevantTables = ['suppliers', 'products', 'inventory_items', 'supplier_price_lists', 'supplier_price_list_items', 'price_list', 'price_list_item'];

    for (const tableName of relevantTables) {
      console.log(`🏗️  ${tableName.toUpperCase()} TABLE:`);
      console.log('='.repeat(50));

      // Check if table exists
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `;

      const tableExists = await pool.query(tableExistsQuery, [tableName]);

      if (tableExists.rows[0].exists) {
        // Get table structure
        const schemaQuery = `
          SELECT
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default,
            ordinal_position
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position;
        `;

        const schema = await pool.query(schemaQuery, [tableName]);

        schema.rows.forEach(col => {
          const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
          console.log(`  ${col.ordinal_position.toString().padStart(2)}. ${col.column_name.padEnd(30)} ${col.data_type}${length} ${nullable} ${defaultVal}`);
        });

        // Sample data (first 3 rows)
        try {
          const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3`;
          const sample = await pool.query(sampleQuery);
          if (sample.rows.length > 0) {
            console.log('\n  📊 SAMPLE DATA:');
            console.log('  ' + '-'.repeat(40));
            sample.rows.forEach((row, idx) => {
              console.log(`  Row ${idx + 1}:`);
              Object.keys(row).slice(0, 5).forEach(key => {
                const value = row[key];
                const displayValue = value !== null ? String(value).substring(0, 50) : 'NULL';
                console.log(`    ${key}: ${displayValue}`);
              });
              console.log('');
            });
          }
        } catch (error) {
          console.log('  ⚠️  Could not retrieve sample data');
        }

        console.log('\n');
      } else {
        console.log(`❌ TABLE NOT FOUND\n`);
      }
    }

    // Check data volumes
    console.log('📈 DATA VOLUMES:');
    console.log('================');
    for (const tableName of relevantTables) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
        const count = await pool.query(countQuery);
        console.log(`${tableName.padEnd(30)} ${count.rows[0].count.padStart(10)} rows`);
      } catch (error) {
        console.log(`${tableName.padEnd(30)}          N/A`);
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing database:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeDatabaseStructure();