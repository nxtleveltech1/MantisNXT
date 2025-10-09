const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://nxtdb_admin:P@33w0rd-1@62.169.20.53:6600/nxtprod-db_001',
  ssl: false
});

async function analyzeSchemas() {
  try {
    console.log('🔍 SCHEMA BRIDGE ANALYSIS\n');
    console.log('='.repeat(80));

    // 1. Check what schemas exist
    console.log('\n📂 AVAILABLE SCHEMAS:');
    const schemas = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name IN ('public', 'core')
      ORDER BY schema_name
    `);
    schemas.rows.forEach(row => console.log(`  - ${row.schema_name}`));

    // 2. Check if tables/views exist in public
    console.log('\n📊 PUBLIC SCHEMA OBJECTS:');
    const publicObjects = await pool.query(`
      SELECT
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('suppliers', 'inventory_items', 'products', 'stock_movements')
      ORDER BY table_name
    `);
    publicObjects.rows.forEach(row => {
      console.log(`  - ${row.table_name.padEnd(20)} (${row.table_type})`);
    });

    // 3. Analyze public.suppliers structure (if it exists)
    console.log('\n🏢 PUBLIC.SUPPLIERS STRUCTURE:');
    console.log('-'.repeat(80));
    const suppliersExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'suppliers'
      )
    `);

    if (suppliersExists.rows[0].exists) {
      const suppliersColumns = await pool.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'suppliers'
        ORDER BY ordinal_position
      `);

      suppliersColumns.rows.forEach(col => {
        const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`  ${col.column_name.padEnd(25)} ${col.data_type}${maxLen.padEnd(15)} ${nullable}`);
      });

      // Sample data
      const sampleData = await pool.query('SELECT * FROM public.suppliers LIMIT 1');
      if (sampleData.rows.length > 0) {
        console.log('\n  📌 SAMPLE ROW (columns present):');
        Object.keys(sampleData.rows[0]).forEach(key => {
          console.log(`    - ${key}`);
        });
      }
    } else {
      console.log('  ❌ Table/view does not exist');
    }

    // 4. Analyze core.supplier structure
    console.log('\n🏢 CORE.SUPPLIER STRUCTURE:');
    console.log('-'.repeat(80));
    const coreSupplierExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'core'
        AND table_name = 'supplier'
      )
    `);

    if (coreSupplierExists.rows[0].exists) {
      const coreSupplierColumns = await pool.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'core'
        AND table_name = 'supplier'
        ORDER BY ordinal_position
      `);

      coreSupplierColumns.rows.forEach(col => {
        const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`  ${col.column_name.padEnd(25)} ${col.data_type}${maxLen.padEnd(15)} ${nullable}`);
      });

      // Check row count
      const coreCount = await pool.query('SELECT COUNT(*) FROM core.supplier');
      console.log(`\n  📊 Row count: ${coreCount.rows[0].count}`);
    } else {
      console.log('  ❌ Table does not exist');
    }

    // 5. Identify column mismatches
    console.log('\n⚠️  COLUMN MISMATCH ANALYSIS:');
    console.log('-'.repeat(80));

    if (suppliersExists.rows[0].exists && coreSupplierExists.rows[0].exists) {
      // Get columns from both
      const publicCols = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'suppliers'
        ORDER BY column_name
      `);

      const coreCols = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'core' AND table_name = 'supplier'
        ORDER BY column_name
      `);

      const publicColNames = new Set(publicCols.rows.map(r => r.column_name));
      const coreColNames = new Set(coreCols.rows.map(r => r.column_name));

      console.log('\n  📌 Columns in PUBLIC.SUPPLIERS but not in CORE.SUPPLIER:');
      publicCols.rows.forEach(row => {
        if (!coreColNames.has(row.column_name)) {
          console.log(`    - ${row.column_name}`);
        }
      });

      console.log('\n  📌 Columns in CORE.SUPPLIER but not in PUBLIC.SUPPLIERS:');
      coreCols.rows.forEach(row => {
        if (!publicColNames.has(row.column_name)) {
          console.log(`    - ${row.column_name}`);
        }
      });

      // Check view definition if public.suppliers is a view
      const isView = await pool.query(`
        SELECT table_type
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'suppliers'
      `);

      if (isView.rows[0]?.table_type === 'VIEW') {
        console.log('\n  📋 VIEW DEFINITION:');
        const viewDef = await pool.query(`
          SELECT definition
          FROM pg_views
          WHERE schemaname = 'public' AND viewname = 'suppliers'
        `);
        if (viewDef.rows[0]) {
          console.log('    ' + viewDef.rows[0].definition.split('\n').join('\n    '));
        }
      }
    }

    // 6. Check stock_on_hand and supplier_product
    console.log('\n\n📦 INVENTORY DATA STRUCTURE:');
    console.log('-'.repeat(80));

    const inventoryTables = ['stock_on_hand', 'supplier_product', 'stock_location'];
    for (const tableName of inventoryTables) {
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'core' AND table_name = $1
        )
      `, [tableName]);

      if (exists.rows[0].exists) {
        const count = await pool.query(`SELECT COUNT(*) FROM core.${tableName}`);
        console.log(`  core.${tableName.padEnd(20)} ${count.rows[0].count.padStart(6)} rows`);
      }
    }

    console.log('\n✅ Analysis complete\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

analyzeSchemas();
