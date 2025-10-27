/**
 * Check Database Schema ID Types
 * Identify UUID vs BIGINT migration issues
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchemaTypes() {
  console.log('🔍 Checking database schema ID types...\n');

  try {
    // Check core tables
    const tables = ['supplier', 'supplier_product', 'product', 'stock_on_hand', 'inventory_items'];

    for (const table of tables) {
      console.log(`\n📋 Table: ${table}`);
      console.log('─'.repeat(60));

      // Check in both public and core schemas
      for (const schema of ['public', 'core']) {
        const result = await pool.query(`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          AND table_schema = $2
          AND column_name LIKE '%id%'
          ORDER BY ordinal_position
        `, [table, schema]);

        if (result.rows.length > 0) {
          console.log(`\n  Schema: ${schema}`);
          result.rows.forEach(col => {
            const typeIndicator =
              col.data_type === 'bigint' ? '✓ BIGINT' :
              col.data_type === 'uuid' ? '⚠ UUID' :
              `⚠ ${col.data_type}`;

            console.log(`    ${col.column_name.padEnd(30)} ${typeIndicator}`);
          });
        }
      }
    }

    // Check foreign key relationships
    console.log('\n\n🔗 Foreign Key Relationships:');
    console.log('─'.repeat(60));

    const fkResult = await pool.query(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (tc.table_schema = 'core' OR tc.table_schema = 'public')
        AND tc.table_name IN ('supplier', 'supplier_product', 'product', 'stock_on_hand', 'inventory_items')
      ORDER BY tc.table_schema, tc.table_name, kcu.column_name
    `);

    fkResult.rows.forEach(fk => {
      console.log(`  ${fk.table_schema}.${fk.table_name}.${fk.column_name}`);
      console.log(`    → ${fk.foreign_table_schema}.${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // Check record counts
    console.log('\n\n📊 Record Counts:');
    console.log('─'.repeat(60));

    for (const table of tables) {
      for (const schema of ['public', 'core']) {
        try {
          const countResult = await pool.query(`
            SELECT COUNT(*) as count FROM ${schema}.${table}
          `);
          if (countResult.rows[0].count > 0) {
            console.log(`  ${schema}.${table.padEnd(30)} ${countResult.rows[0].count.toLocaleString()} records`);
          }
        } catch (e) {
          // Table doesn't exist in this schema
        }
      }
    }

    // Check for UUID usage in queries (sample data)
    console.log('\n\n🔬 Sample ID Values:');
    console.log('─'.repeat(60));

    try {
      const sampleSupplier = await pool.query('SELECT id, name FROM core.supplier LIMIT 1');
      if (sampleSupplier.rows.length > 0) {
        console.log(`  Supplier ID: ${sampleSupplier.rows[0].id} (${typeof sampleSupplier.rows[0].id})`);
        console.log(`  Name: ${sampleSupplier.rows[0].name}`);
      }
    } catch (e) {
      console.error(`  Error sampling supplier: ${e.message}`);
    }

    try {
      const sampleProduct = await pool.query('SELECT id, sku FROM core.product LIMIT 1');
      if (sampleProduct.rows.length > 0) {
        console.log(`  Product ID: ${sampleProduct.rows[0].id} (${typeof sampleProduct.rows[0].id})`);
        console.log(`  SKU: ${sampleProduct.rows[0].sku}`);
      }
    } catch (e) {
      console.error(`  Error sampling product: ${e.message}`);
    }

    try {
      const sampleInventory = await pool.query('SELECT id, sku, supplier_id FROM public.inventory_items LIMIT 1');
      if (sampleInventory.rows.length > 0) {
        console.log(`  Inventory ID: ${sampleInventory.rows[0].id} (${typeof sampleInventory.rows[0].id})`);
        console.log(`  Supplier ID: ${sampleInventory.rows[0].supplier_id} (${typeof sampleInventory.rows[0].supplier_id})`);
        console.log(`  SKU: ${sampleInventory.rows[0].sku}`);
      }
    } catch (e) {
      console.error(`  Error sampling inventory: ${e.message}`);
    }

  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkSchemaTypes().catch(console.error);
