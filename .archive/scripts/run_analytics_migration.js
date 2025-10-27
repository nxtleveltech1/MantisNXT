const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false,
});

async function runAnalyticsMigration() {
  const client = await pool.connect();

  try {
    console.log('🔧 Running analytics migration...');

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/002_minimal_analytics.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Analytics migration completed successfully');

    // Test the tables
    const performanceCount = await client.query('SELECT COUNT(*) FROM supplier_performance');
    const movementsCount = await client.query('SELECT COUNT(*) FROM stock_movements');
    const anomaliesCount = await client.query('SELECT COUNT(*) FROM analytics_anomalies');
    const predictionsCount = await client.query('SELECT COUNT(*) FROM analytics_predictions');

    console.log(`📊 Performance records: ${performanceCount.rows[0].count}`);
    console.log(`📦 Stock movements: ${movementsCount.rows[0].count}`);
    console.log(`🚨 Anomalies: ${anomaliesCount.rows[0].count}`);
    console.log(`🔮 Predictions: ${predictionsCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Analytics migration failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runAnalyticsMigration();