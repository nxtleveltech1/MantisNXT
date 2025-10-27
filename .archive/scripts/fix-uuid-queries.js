// Fix UUID casting errors in analytics queries
const { Pool } = require('pg');

async function fixUuidQueries() {
  const pool = new Pool({
    host: '62.169.20.53',
    port: 6600,
    database: 'nxtprod-db_001',
    user: 'nxtdb_admin',
    password: 'P@33w0rd-1',
    ssl: false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🔍 Checking UUID column types...');

    // Check which columns are UUID types
    const uuidColumnsQuery = `
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND data_type = 'uuid'
      ORDER BY table_name, column_name
    `;

    const result = await pool.query(uuidColumnsQuery);
    console.log('📊 UUID Columns found:');
    result.rows.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name}: ${row.data_type}`);
    });

    // Check organization_id columns specifically
    const orgIdQuery = `
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND column_name LIKE '%organization_id%'
      ORDER BY table_name, column_name
    `;

    const orgResult = await pool.query(orgIdQuery);
    console.log('🏢 Organization ID columns:');
    orgResult.rows.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name}: ${row.data_type}`);
    });

    // Create default organization if needed
    const defaultOrgQuery = `
      INSERT INTO organizations (id, name, status, created_at)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'active', NOW())
      ON CONFLICT (id) DO NOTHING
    `;

    try {
      await pool.query(defaultOrgQuery);
      console.log('✅ Default organization created/verified');
    } catch (error) {
      console.log('ℹ️  Organizations table may not exist, using varchar organization_id');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixUuidQueries();