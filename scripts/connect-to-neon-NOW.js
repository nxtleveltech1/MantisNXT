#!/usr/bin/env node
/**
 * EMERGENCY NEON CONNECTION SCRIPT
 * Connects directly to Neon database to verify migration
 */

const { Client } = require('pg');

async function connectToNeon() {
  console.log('🔄 Connecting to Neon database...\n');

  // Try both possible connection strings
  const connections = [
    {
      name: 'Current .env.local',
      config: {
        host: '62.169.20.53',
        port: 6600,
        database: 'nxtprod-db_001',
        user: 'nxtdb_admin',
        password: 'P@33w0rd-1',
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Neon direct connection',
      config: {
        host: 'proud-mud-50346856.us-east-2.aws.neon.tech',
        database: 'nxt-spp-supplier-inventory-portfolio',
        user: 'nxtdb_admin',
        password: 'P@33w0rd-1',
        ssl: { rejectUnauthorized: false }
      }
    }
  ];

  for (const conn of connections) {
    try {
      console.log(`\n📡 Trying ${conn.name}...`);
      console.log(`   Host: ${conn.config.host}`);

      const client = new Client(conn.config);
      await client.connect();

      // Test connection
      const versionResult = await client.query('SELECT version()');
      console.log('✅ CONNECTED!');
      console.log(`   PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}\n`);

      // Check if it's Neon
      const isNeon = versionResult.rows[0].version.includes('neon') ||
                     conn.config.host.includes('neon.tech');
      console.log(`   Is Neon: ${isNeon ? '✅ YES' : '❌ NO'}\n`);

      // Get data counts
      console.log('📊 Data Verification:');

      const schemas = await client.query(`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name IN ('public', 'core', 'spp', 'serve')
        ORDER BY schema_name
      `);
      console.log(`   Schemas: ${schemas.rows.map(r => r.schema_name).join(', ')}`);

      const supplierCount = await client.query('SELECT COUNT(*) FROM public.suppliers');
      console.log(`   Suppliers: ${supplierCount.rows[0].count}`);

      const inventoryCount = await client.query('SELECT COUNT(*) FROM public.inventory_items');
      console.log(`   Inventory Items: ${inventoryCount.rows[0].count}`);

      // Check for core schema tables
      const coreTables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'core'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      console.log(`   Core Tables: ${coreTables.rows.length}`);
      if (coreTables.rows.length > 0) {
        console.log(`   - ${coreTables.rows.map(r => r.table_name).slice(0, 5).join(', ')}${coreTables.rows.length > 5 ? '...' : ''}`);
      }

      await client.end();

      console.log('\n✅ SUCCESS - Database is accessible!');
      console.log(`\n📝 Use this connection: ${conn.name}`);

      return conn;

    } catch (error) {
      console.log(`❌ FAILED: ${error.message}\n`);
    }
  }

  console.log('\n❌ Could not connect to any database!');
  process.exit(1);
}

connectToNeon().catch(console.error);
