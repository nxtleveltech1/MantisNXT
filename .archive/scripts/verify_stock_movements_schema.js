#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600'),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  ssl: false
});

async function verifySchema() {
  try {
    console.log('Connected to PostgreSQL database\n');
    console.log('🔍 Verifying stock_movements table schema...\n');

    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'stock_movements'
      ORDER BY ordinal_position
    `;

    const { rows: columns } = await pool.query(columnsQuery);

    if (columns.length === 0) {
      console.error('❌ stock_movements table does NOT exist!');
      process.exit(1);
    }

    console.log('📋 STOCK_MOVEMENTS TABLE STRUCTURE:');
    console.log('='.repeat(80));
    console.log('Column Name'.padEnd(30), 'Data Type'.padEnd(20), 'Nullable', 'Default');
    console.log('='.repeat(80));

    columns.forEach(col => {
      console.log(
        col.column_name.padEnd(30),
        col.data_type.padEnd(20),
        col.is_nullable.padEnd(8),
        (col.column_default || 'NULL')
      );
    });

    console.log(`\nTotal columns: ${columns.length}\n`);

    const criticalColumns = ['id', 'item_id', 'movement_type', 'quantity', 'created_at'];
    const existingColumns = columns.map(c => c.column_name);

    console.log('🔍 CRITICAL COLUMN CHECK:');
    console.log('='.repeat(80));
    criticalColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`${exists ? '✅' : '❌'} ${col}${exists ? '' : ' - MISSING!'}`);
    });

    const { rows: sample } = await pool.query(
      'SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 3'
    );
    console.log('\n📊 SAMPLE DATA:');
    console.log('='.repeat(80));
    console.log(`Rows found: ${sample.length}`);
    if (sample.length > 0) {
      console.log('\nFirst row:');
      console.log(JSON.stringify(sample[0], null, 2));
    } else {
      console.log('⚠️  No data in stock_movements table');
    }

    console.log('\n✅ Schema verification complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifySchema();
