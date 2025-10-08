/**
 * Emergency Connection Pool Diagnostic Script
 * Direct database connection check bypassing application layer
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600'),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  ssl: false,
  max: 20,
  min: 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 60000,
});

async function checkPoolStatus() {
  console.log('\n🚨 EMERGENCY CONNECTION POOL DIAGNOSTIC');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check pool status
    const poolStatus = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      active: pool.totalCount - pool.idleCount
    };

    console.log('📊 CURRENT POOL STATUS:');
    console.log(`   Total connections: ${poolStatus.total}`);
    console.log(`   Active connections: ${poolStatus.active}`);
    console.log(`   Idle connections: ${poolStatus.idle}`);
    console.log(`   Waiting connections: ${poolStatus.waiting}`);
    console.log(`   Utilization: ${poolStatus.total > 0 ? ((poolStatus.active / poolStatus.total) * 100).toFixed(1) : 0}%\n`);

    // Test database connectivity
    console.log('🔍 TESTING DATABASE CONNECTIVITY...');
    const startTime = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version, current_database() as db_name');
    const responseTime = Date.now() - startTime;

    console.log(`✅ Database connection successful (${responseTime}ms)`);
    console.log(`   Database: ${result.rows[0].db_name}`);
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].pg_version.substring(0, 50)}...\n`);

    // Check active connections on database server
    console.log('🔍 CHECKING SERVER-SIDE CONNECTIONS...');
    const connectionsResult = await pool.query(`
      SELECT
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
        MAX(current_setting('max_connections')::int) as max_server_connections
      FROM pg_stat_activity
      WHERE pid != pg_backend_pid()
    `);

    const serverConnections = connectionsResult.rows[0];
    console.log(`   Total server connections: ${serverConnections.total_connections}`);
    console.log(`   Active: ${serverConnections.active_connections}`);
    console.log(`   Idle: ${serverConnections.idle_connections}`);
    console.log(`   Idle in transaction: ${serverConnections.idle_in_transaction}`);
    console.log(`   Max allowed: ${serverConnections.max_server_connections}\n`);

    // Check for long-running queries
    console.log('🔍 CHECKING FOR LONG-RUNNING QUERIES...');
    const longQueriesResult = await pool.query(`
      SELECT
        pid,
        usename,
        application_name,
        state,
        EXTRACT(EPOCH FROM (NOW() - query_start)) as duration_seconds,
        LEFT(query, 100) as query_preview
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND pid != pg_backend_pid()
        AND EXTRACT(EPOCH FROM (NOW() - query_start)) > 30
      ORDER BY query_start ASC
      LIMIT 10
    `);

    if (longQueriesResult.rows.length > 0) {
      console.log(`⚠️  Found ${longQueriesResult.rows.length} long-running queries:`);
      longQueriesResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. PID ${row.pid} (${row.state}) - ${Math.round(row.duration_seconds)}s`);
        console.log(`      Query: ${row.query_preview}...`);
      });
      console.log('');
    } else {
      console.log('✅ No long-running queries detected\n');
    }

    // Check for locks
    console.log('🔍 CHECKING FOR DATABASE LOCKS...');
    const locksResult = await pool.query(`
      SELECT
        COUNT(*) as total_locks,
        COUNT(*) FILTER (WHERE granted = false) as blocked_locks
      FROM pg_locks
    `);

    const locks = locksResult.rows[0];
    console.log(`   Total locks: ${locks.total_locks}`);
    console.log(`   Blocked locks: ${locks.blocked_locks}\n`);

    // Final assessment
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ASSESSMENT:');

    if (poolStatus.waiting > 0) {
      console.log(`⚠️  CRITICAL: ${poolStatus.waiting} connections waiting - possible pool exhaustion`);
    }

    if (poolStatus.active >= poolStatus.total * 0.9) {
      console.log(`⚠️  WARNING: Pool utilization at ${((poolStatus.active / poolStatus.total) * 100).toFixed(1)}%`);
    } else {
      console.log(`✅ Pool utilization normal at ${poolStatus.total > 0 ? ((poolStatus.active / poolStatus.total) * 100).toFixed(1) : 0}%`);
    }

    if (parseInt(serverConnections.idle_in_transaction) > 0) {
      console.log(`⚠️  ${serverConnections.idle_in_transaction} connections idle in transaction - potential leak`);
    }

    if (longQueriesResult.rows.length > 0) {
      console.log(`⚠️  ${longQueriesResult.rows.length} long-running queries may be blocking connections`);
    }

    if (parseInt(locks.blocked_locks) > 0) {
      console.log(`⚠️  ${locks.blocked_locks} blocked locks detected`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ DIAGNOSTIC FAILED:', error.message);
    console.error('\nError Details:', error);
  } finally {
    // Clean shutdown
    await pool.end();
    console.log('🔄 Pool connection closed\n');
  }
}

checkPoolStatus().catch(console.error);