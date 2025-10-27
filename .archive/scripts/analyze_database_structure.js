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
    console.log('🔍 ANALYZING EXISTING DATABASE STRUCTURE\n');

    // Check if tables exist
    const tablesQuery = `
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tables = await pool.query(tablesQuery);

    console.log('📋 EXISTING TABLES:');
    console.log('==================');
    tables.rows.forEach(row => console.log(`• ${row.table_name}`));
    console.log(`\nTotal tables: ${tables.rows.length}\n`);

    // Analyze each relevant table
    const relevantTables = ['suppliers', 'products', 'inventory_items', 'price_lists', 'supplier_products'];

    for (const tableName of relevantTables) {
      const tableExists = tables.rows.find(t => t.table_name === tableName);

      if (tableExists) {
        console.log(`🏗️  ${tableName.toUpperCase()} TABLE STRUCTURE:`);
        console.log('='.repeat(40));

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
          console.log(`  ${col.ordinal_position.toString().padStart(2)}. ${col.column_name.padEnd(25)} ${col.data_type}${length} ${nullable} ${defaultVal}`);
        });

        // Check constraints and indexes
        const constraintsQuery = `
          SELECT constraint_name, constraint_type, column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = $1 AND tc.table_schema = 'public'
          ORDER BY constraint_type, constraint_name;
        `;

        const constraints = await pool.query(constraintsQuery, [tableName]);
        if (constraints.rows.length > 0) {
          console.log('\n  🔐 CONSTRAINTS:');
          constraints.rows.forEach(c => {
            console.log(`     ${c.constraint_type}: ${c.constraint_name} (${c.column_name})`);
          });
        }

        // Check indexes
        const indexQuery = `
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = $1 AND schemaname = 'public'
          ORDER BY indexname;
        `;

        const indexes = await pool.query(indexQuery, [tableName]);
        if (indexes.rows.length > 0) {
          console.log('\n  📊 INDEXES:');
          indexes.rows.forEach(idx => {
            console.log(`     ${idx.indexname}: ${idx.indexdef}`);
          });
        }

        console.log('\n');
      } else {
        console.log(`❌ ${tableName.toUpperCase()} TABLE: NOT FOUND\n`);
      }
    }

    // Check foreign key relationships
    console.log('🔗 FOREIGN KEY RELATIONSHIPS:');
    console.log('=============================');
    const fkQuery = `
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
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `;

    const fks = await pool.query(fkQuery);
    if (fks.rows.length > 0) {
      fks.rows.forEach(fk => {
        console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('  No foreign key relationships found.');
    }

  } catch (error) {
    console.error('❌ Error analyzing database:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeDatabaseStructure();