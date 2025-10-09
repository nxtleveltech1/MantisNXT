#!/usr/bin/env node

/**
 * =============================================================================
 * MantisNXT Replication Health Check Script
 * =============================================================================
 * ADR: ADR-1 (Logical Replication Configuration)
 * Purpose: Automated monitoring of replication health between Neon and Postgres OLD
 * Author: Data Oracle
 * Date: 2025-10-09
 * =============================================================================
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Neon Primary (Publisher)
  publisher: {
    host: process.env.DB_HOST || 'ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'neondb',
    user: process.env.DB_USER || 'neondb_owner',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  },

  // Postgres OLD (Subscriber)
  subscriber: {
    host: process.env.OLD_DB_HOST || '62.169.20.53',
    port: parseInt(process.env.OLD_DB_PORT || '6600'),
    database: process.env.OLD_DB_NAME || 'nxtprod-db_001',
    user: process.env.OLD_DB_USER || 'nxtdb_admin',
    password: process.env.OLD_DB_PASSWORD || 'P@33w0rd-1',
    ssl: false
  },

  // Thresholds for alerting
  thresholds: {
    lagWarningSeconds: 5,
    lagCriticalSeconds: 10,
    lagWarningBytes: 10485760, // 10MB
    lagCriticalBytes: 104857600 // 100MB
  },

  // Monitoring settings
  monitoring: {
    logFile: path.join(__dirname, '..', 'logs', 'replication-health.log'),
    alertFile: path.join(__dirname, '..', 'logs', 'replication-alerts.log'),
    checkInterval: 60000, // 60 seconds
    retryAttempts: 3,
    retryDelay: 5000 // 5 seconds
  }
};

// =============================================================================
// Database Connection Pools
// =============================================================================

let publisherPool = null;
let subscriberPool = null;

async function initializeConnections() {
  try {
    publisherPool = new Pool({
      ...CONFIG.publisher,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    subscriberPool = new Pool({
      ...CONFIG.subscriber,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    // Test connections
    await publisherPool.query('SELECT 1');
    await subscriberPool.query('SELECT 1');

    console.log('✓ Database connections initialized');
    return true;
  } catch (error) {
    console.error('✗ Failed to initialize connections:', error.message);
    return false;
  }
}

async function closeConnections() {
  if (publisherPool) await publisherPool.end();
  if (subscriberPool) await subscriberPool.end();
}

// =============================================================================
// Health Check Functions
// =============================================================================

async function checkPublisherHealth() {
  const health = {
    timestamp: new Date().toISOString(),
    database: 'publisher',
    checks: {},
    status: 'OK',
    issues: []
  };

  try {
    // Check publication exists
    const pubResult = await publisherPool.query(`
      SELECT pubname, puballtables, pubinsert, pubupdate, pubdelete
      FROM pg_publication
      WHERE pubname = 'mantisnxt_core_replication'
    `);

    health.checks.publicationExists = pubResult.rows.length > 0;
    if (!health.checks.publicationExists) {
      health.issues.push('CRITICAL: Publication does not exist');
      health.status = 'CRITICAL';
    }

    // Check replication slots
    const slotResult = await publisherPool.query(`
      SELECT
        slot_name,
        active,
        pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
      FROM pg_replication_slots
      WHERE slot_name LIKE '%mantisnxt%'
    `);

    health.checks.replicationSlots = slotResult.rows;

    for (const slot of slotResult.rows) {
      if (!slot.active) {
        health.issues.push(`WARNING: Replication slot ${slot.slot_name} is inactive`);
        health.status = health.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
      }

      const lagBytes = parseInt(slot.lag_bytes);
      if (lagBytes > CONFIG.thresholds.lagCriticalBytes) {
        health.issues.push(`CRITICAL: Replication slot lag ${formatBytes(lagBytes)} exceeds threshold`);
        health.status = 'CRITICAL';
      } else if (lagBytes > CONFIG.thresholds.lagWarningBytes) {
        health.issues.push(`WARNING: Replication slot lag ${formatBytes(lagBytes)} approaching threshold`);
        health.status = health.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
      }
    }

    // Check WAL senders (active replication connections)
    const walSenderResult = await publisherPool.query(`
      SELECT
        application_name,
        state,
        pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
      FROM pg_stat_replication
    `);

    health.checks.activeSenders = walSenderResult.rows.length;
    health.checks.senderDetails = walSenderResult.rows;

  } catch (error) {
    health.status = 'ERROR';
    health.error = error.message;
    health.issues.push(`ERROR: Failed to check publisher health: ${error.message}`);
  }

  return health;
}

async function checkSubscriberHealth() {
  const health = {
    timestamp: new Date().toISOString(),
    database: 'subscriber',
    checks: {},
    status: 'OK',
    issues: []
  };

  try {
    // Check subscription exists and is enabled
    const subResult = await subscriberPool.query(`
      SELECT subname, subenabled, subpublications
      FROM pg_subscription
      WHERE subname = 'mantisnxt_from_neon'
    `);

    health.checks.subscriptionExists = subResult.rows.length > 0;

    if (!health.checks.subscriptionExists) {
      health.issues.push('CRITICAL: Subscription does not exist');
      health.status = 'CRITICAL';
      return health;
    }

    health.checks.subscriptionEnabled = subResult.rows[0].subenabled;

    if (!health.checks.subscriptionEnabled) {
      health.issues.push('CRITICAL: Subscription is disabled');
      health.status = 'CRITICAL';
    }

    // Check subscription worker status and lag
    const workerResult = await subscriberPool.query(`
      SELECT
        pid,
        received_lsn,
        latest_end_lsn,
        pg_wal_lsn_diff(latest_end_lsn, received_lsn) AS lag_bytes,
        EXTRACT(EPOCH FROM (NOW() - latest_end_time)) AS lag_seconds
      FROM pg_stat_subscription
      WHERE subname = 'mantisnxt_from_neon'
    `);

    if (workerResult.rows.length === 0) {
      health.issues.push('CRITICAL: No subscription worker status available');
      health.status = 'CRITICAL';
      return health;
    }

    const worker = workerResult.rows[0];
    health.checks.workerRunning = worker.pid !== null;
    health.checks.lagBytes = parseInt(worker.lag_bytes) || 0;
    health.checks.lagSeconds = parseFloat(worker.lag_seconds) || 0;

    if (!health.checks.workerRunning) {
      health.issues.push('CRITICAL: Subscription worker is not running');
      health.status = 'CRITICAL';
    }

    // Check lag thresholds
    if (health.checks.lagSeconds > CONFIG.thresholds.lagCriticalSeconds) {
      health.issues.push(`CRITICAL: Replication lag ${health.checks.lagSeconds.toFixed(2)}s exceeds ${CONFIG.thresholds.lagCriticalSeconds}s threshold`);
      health.status = 'CRITICAL';
    } else if (health.checks.lagSeconds > CONFIG.thresholds.lagWarningSeconds) {
      health.issues.push(`WARNING: Replication lag ${health.checks.lagSeconds.toFixed(2)}s exceeds ${CONFIG.thresholds.lagWarningSeconds}s threshold`);
      health.status = health.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
    }

    // Check table synchronization status
    const tableResult = await subscriberPool.query(`
      SELECT
        COUNT(*) AS total_tables,
        COUNT(*) FILTER (WHERE srsubstate = 'r') AS ready_tables
      FROM pg_subscription_rel srw
      JOIN pg_subscription s ON s.oid = srw.srsubid
      WHERE s.subname = 'mantisnxt_from_neon'
    `);

    if (tableResult.rows.length > 0) {
      const { total_tables, ready_tables } = tableResult.rows[0];
      health.checks.totalTables = parseInt(total_tables);
      health.checks.readyTables = parseInt(ready_tables);

      if (health.checks.readyTables < health.checks.totalTables) {
        health.issues.push(`WARNING: ${health.checks.totalTables - health.checks.readyTables} tables not in ready state`);
        health.status = health.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
      }
    }

  } catch (error) {
    health.status = 'ERROR';
    health.error = error.message;
    health.issues.push(`ERROR: Failed to check subscriber health: ${error.message}`);
  }

  return health;
}

async function verifyDataConsistency() {
  const consistency = {
    timestamp: new Date().toISOString(),
    tables: [],
    status: 'OK',
    issues: []
  };

  const tables = [
    'inventory_items', 'product', 'supplier', 'supplier_product',
    'stock_movement', 'stock_on_hand', 'stock_location',
    'analytics_events', 'brand', 'purchase_orders', 'purchase_order_items'
  ];

  try {
    for (const table of tables) {
      const publisherCount = await publisherPool.query(
        `SELECT COUNT(*) AS count FROM core.${table}`
      );

      const subscriberCount = await subscriberPool.query(
        `SELECT COUNT(*) AS count FROM core.${table}`
      );

      const pubCount = parseInt(publisherCount.rows[0].count);
      const subCount = parseInt(subscriberCount.rows[0].count);

      consistency.tables.push({
        name: table,
        publisherCount: pubCount,
        subscriberCount: subCount,
        match: pubCount === subCount,
        difference: pubCount - subCount
      });

      if (pubCount !== subCount) {
        consistency.issues.push(
          `WARNING: Table ${table} count mismatch - Publisher: ${pubCount}, Subscriber: ${subCount}`
        );
        consistency.status = 'WARNING';
      }
    }
  } catch (error) {
    consistency.status = 'ERROR';
    consistency.error = error.message;
    consistency.issues.push(`ERROR: Failed to verify consistency: ${error.message}`);
  }

  return consistency;
}

// =============================================================================
// Reporting and Logging
// =============================================================================

async function logResults(results) {
  const logDir = path.dirname(CONFIG.monitoring.logFile);

  try {
    await fs.mkdir(logDir, { recursive: true });

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...results
    };

    await fs.appendFile(
      CONFIG.monitoring.logFile,
      JSON.stringify(logEntry) + '\n'
    );

    // Log alerts separately if there are issues
    const allIssues = [
      ...(results.publisher?.issues || []),
      ...(results.subscriber?.issues || []),
      ...(results.consistency?.issues || [])
    ];

    if (allIssues.length > 0) {
      await fs.appendFile(
        CONFIG.monitoring.alertFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          issues: allIssues
        }) + '\n'
      );
    }
  } catch (error) {
    console.error('Failed to write log:', error.message);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function printResults(results) {
  console.log('\n' + '='.repeat(80));
  console.log('MANTISNXT REPLICATION HEALTH CHECK RESULTS');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Publisher Health
  console.log('PUBLISHER (Neon) HEALTH:');
  console.log(`  Status: ${results.publisher.status}`);
  console.log(`  Publication Exists: ${results.publisher.checks.publicationExists ? '✓' : '✗'}`);
  console.log(`  Active Senders: ${results.publisher.checks.activeSenders || 0}`);
  if (results.publisher.issues.length > 0) {
    console.log('  Issues:');
    results.publisher.issues.forEach(issue => console.log(`    - ${issue}`));
  }

  console.log('\nSUBSCRIBER (Postgres OLD) HEALTH:');
  console.log(`  Status: ${results.subscriber.status}`);
  console.log(`  Subscription Exists: ${results.subscriber.checks.subscriptionExists ? '✓' : '✗'}`);
  console.log(`  Worker Running: ${results.subscriber.checks.workerRunning ? '✓' : '✗'}`);
  console.log(`  Replication Lag: ${results.subscriber.checks.lagSeconds?.toFixed(2) || 'N/A'}s`);
  console.log(`  Lag Bytes: ${formatBytes(results.subscriber.checks.lagBytes || 0)}`);
  console.log(`  Tables Ready: ${results.subscriber.checks.readyTables || 0}/${results.subscriber.checks.totalTables || 0}`);
  if (results.subscriber.issues.length > 0) {
    console.log('  Issues:');
    results.subscriber.issues.forEach(issue => console.log(`    - ${issue}`));
  }

  console.log('\nDATA CONSISTENCY:');
  console.log(`  Status: ${results.consistency.status}`);
  console.log('  Table Counts:');
  results.consistency.tables.forEach(table => {
    const status = table.match ? '✓' : '✗';
    console.log(`    ${status} ${table.name}: Publisher=${table.publisherCount}, Subscriber=${table.subscriberCount}`);
  });
  if (results.consistency.issues.length > 0) {
    console.log('  Issues:');
    results.consistency.issues.forEach(issue => console.log(`    - ${issue}`));
  }

  console.log('\n' + '='.repeat(80));

  // Overall status
  const criticalIssues = [
    ...results.publisher.issues.filter(i => i.includes('CRITICAL')),
    ...results.subscriber.issues.filter(i => i.includes('CRITICAL')),
    ...results.consistency.issues.filter(i => i.includes('CRITICAL'))
  ];

  if (criticalIssues.length > 0) {
    console.log('OVERALL STATUS: CRITICAL ⚠️');
    process.exitCode = 2;
  } else {
    const warningIssues = [
      ...results.publisher.issues,
      ...results.subscriber.issues,
      ...results.consistency.issues
    ].filter(i => i.includes('WARNING'));

    if (warningIssues.length > 0) {
      console.log('OVERALL STATUS: WARNING ⚠');
      process.exitCode = 1;
    } else {
      console.log('OVERALL STATUS: HEALTHY ✓');
      process.exitCode = 0;
    }
  }

  console.log('='.repeat(80) + '\n');
}

// =============================================================================
// Main Execution
// =============================================================================

async function runHealthCheck() {
  console.log('Starting MantisNXT Replication Health Check...\n');

  if (!await initializeConnections()) {
    console.error('Failed to initialize database connections');
    process.exit(1);
  }

  try {
    const results = {
      publisher: await checkPublisherHealth(),
      subscriber: await checkSubscriberHealth(),
      consistency: await verifyDataConsistency()
    };

    printResults(results);
    await logResults(results);

  } catch (error) {
    console.error('Health check failed:', error);
    process.exit(1);
  } finally {
    await closeConnections();
  }
}

// Run if executed directly
if (require.main === module) {
  runHealthCheck().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runHealthCheck,
  checkPublisherHealth,
  checkSubscriberHealth,
  verifyDataConsistency
};
