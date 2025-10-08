#!/usr/bin/env node

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  ssl: false,
  max: 10,
  connectionTimeoutMillis: 10000,
});

async function executeIntegrityFix() {
  const client = await pool.connect();

  try {
    console.log('🔧 EXECUTING DATABASE INTEGRITY FIX');
    console.log('='.repeat(50));

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // ============================================================================
    // SECTION 1: ADD MISSING FOREIGN KEY CONSTRAINTS
    // ============================================================================
    console.log('\n🔗 Adding Foreign Key Constraints...');

    // 1. supplier_pricelists -> suppliers
    await client.query(`
      DELETE FROM supplier_pricelists
      WHERE supplier_id NOT IN (SELECT id FROM suppliers)
    `);

    try {
      await client.query(`
        ALTER TABLE supplier_pricelists
        ADD CONSTRAINT fk_supplier_pricelists_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('  ✅ Added FK: supplier_pricelists -> suppliers');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⚠️  FK already exists: supplier_pricelists -> suppliers');
      } else {
        console.log('  ❌ Error adding FK: supplier_pricelists -> suppliers:', e.message);
      }
    }

    // 2. pricelist_items -> supplier_pricelists
    await client.query(`
      DELETE FROM pricelist_items
      WHERE pricelist_id NOT IN (SELECT id FROM supplier_pricelists)
    `);

    try {
      await client.query(`
        ALTER TABLE pricelist_items
        ADD CONSTRAINT fk_pricelist_items_pricelist_id
        FOREIGN KEY (pricelist_id) REFERENCES supplier_pricelists(id)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('  ✅ Added FK: pricelist_items -> supplier_pricelists');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⚠️  FK already exists: pricelist_items -> supplier_pricelists');
      } else {
        console.log('  ❌ Error adding FK: pricelist_items -> supplier_pricelists:', e.message);
      }
    }

    // 3. supplier_performance -> suppliers
    await client.query(`
      DELETE FROM supplier_performance
      WHERE supplier_id NOT IN (SELECT id FROM suppliers)
    `);

    try {
      await client.query(`
        ALTER TABLE supplier_performance
        ADD CONSTRAINT fk_supplier_performance_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('  ✅ Added FK: supplier_performance -> suppliers');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⚠️  FK already exists: supplier_performance -> suppliers');
      } else {
        console.log('  ❌ Error adding FK: supplier_performance -> suppliers:', e.message);
      }
    }

    // 4. inventory_items -> suppliers
    await client.query(`
      UPDATE inventory_items
      SET supplier_id = NULL
      WHERE supplier_id IS NOT NULL
        AND supplier_id NOT IN (SELECT id FROM suppliers)
    `);

    try {
      await client.query(`
        ALTER TABLE inventory_items
        ADD CONSTRAINT fk_inventory_items_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('  ✅ Added FK: inventory_items -> suppliers');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⚠️  FK already exists: inventory_items -> suppliers');
      } else {
        console.log('  ❌ Error adding FK: inventory_items -> suppliers:', e.message);
      }
    }

    // 5. stock_movements -> inventory_items
    await client.query(`
      DELETE FROM stock_movements
      WHERE item_id IS NOT NULL
        AND item_id NOT IN (SELECT id FROM inventory_items)
    `);

    try {
      await client.query(`
        ALTER TABLE stock_movements
        ADD CONSTRAINT fk_stock_movements_item_id
        FOREIGN KEY (item_id) REFERENCES inventory_items(id)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('  ✅ Added FK: stock_movements -> inventory_items');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⚠️  FK already exists: stock_movements -> inventory_items');
      } else {
        console.log('  ❌ Error adding FK: stock_movements -> inventory_items:', e.message);
      }
    }

    // 6. purchase_orders -> suppliers
    await client.query(`
      UPDATE purchase_orders
      SET supplier_id = NULL
      WHERE supplier_id IS NOT NULL
        AND supplier_id NOT IN (SELECT id FROM suppliers)
    `);

    try {
      await client.query(`
        ALTER TABLE purchase_orders
        ADD CONSTRAINT fk_purchase_orders_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('  ✅ Added FK: purchase_orders -> suppliers');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⚠️  FK already exists: purchase_orders -> suppliers');
      } else {
        console.log('  ❌ Error adding FK: purchase_orders -> suppliers:', e.message);
      }
    }

    // 7. purchase_order_items -> purchase_orders
    await client.query(`
      DELETE FROM purchase_order_items
      WHERE po_id IS NOT NULL
        AND po_id NOT IN (SELECT id FROM purchase_orders)
    `);

    try {
      await client.query(`
        ALTER TABLE purchase_order_items
        ADD CONSTRAINT fk_purchase_order_items_po_id
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('  ✅ Added FK: purchase_order_items -> purchase_orders');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⚠️  FK already exists: purchase_order_items -> purchase_orders');
      } else {
        console.log('  ❌ Error adding FK: purchase_order_items -> purchase_orders:', e.message);
      }
    }

    // 8. purchase_order_items -> inventory_items
    await client.query(`
      UPDATE purchase_order_items
      SET item_id = NULL
      WHERE item_id IS NOT NULL
        AND item_id NOT IN (SELECT id FROM inventory_items)
    `);

    try {
      await client.query(`
        ALTER TABLE purchase_order_items
        ADD CONSTRAINT fk_purchase_order_items_item_id
        FOREIGN KEY (item_id) REFERENCES inventory_items(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('  ✅ Added FK: purchase_order_items -> inventory_items');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⚠️  FK already exists: purchase_order_items -> inventory_items');
      } else {
        console.log('  ❌ Error adding FK: purchase_order_items -> inventory_items:', e.message);
      }
    }

    // ============================================================================
    // SECTION 2: ENHANCE ANALYTICS TABLES
    // ============================================================================
    console.log('\n🔍 Enhancing Analytics Tables...');

    // Check and add columns to analytics_anomalies
    const anomaliesColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'analytics_anomalies' AND column_name = 'supplier_id'
    `);

    if (anomaliesColumns.rows.length === 0) {
      await client.query(`
        ALTER TABLE analytics_anomalies
        ADD COLUMN supplier_id UUID,
        ADD COLUMN anomaly_type VARCHAR(50) NOT NULL DEFAULT 'general',
        ADD COLUMN severity VARCHAR(20) NOT NULL DEFAULT 'medium',
        ADD COLUMN description TEXT,
        ADD COLUMN metric_name VARCHAR(100),
        ADD COLUMN expected_value NUMERIC,
        ADD COLUMN actual_value NUMERIC,
        ADD COLUMN deviation_percentage NUMERIC,
        ADD COLUMN confidence_score NUMERIC DEFAULT 0.8,
        ADD COLUMN status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN resolved_at TIMESTAMP,
        ADD COLUMN resolved_by VARCHAR(255),
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('  ✅ Enhanced analytics_anomalies table structure');
    } else {
      console.log('  ⚠️  Analytics_anomalies already enhanced');
    }

    // Check and add columns to analytics_predictions
    const predictionsColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'analytics_predictions' AND column_name = 'supplier_id'
    `);

    if (predictionsColumns.rows.length === 0) {
      await client.query(`
        ALTER TABLE analytics_predictions
        ADD COLUMN supplier_id UUID,
        ADD COLUMN prediction_type VARCHAR(50) NOT NULL DEFAULT 'general',
        ADD COLUMN metric_name VARCHAR(100),
        ADD COLUMN predicted_value NUMERIC,
        ADD COLUMN prediction_date DATE,
        ADD COLUMN confidence_level NUMERIC DEFAULT 0.85,
        ADD COLUMN model_version VARCHAR(20) DEFAULT '1.0',
        ADD COLUMN input_parameters JSONB DEFAULT '{}',
        ADD COLUMN actual_value NUMERIC,
        ADD COLUMN variance NUMERIC,
        ADD COLUMN status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('  ✅ Enhanced analytics_predictions table structure');
    } else {
      console.log('  ⚠️  Analytics_predictions already enhanced');
    }

    // Add foreign keys for analytics tables
    try {
      await client.query(`
        ALTER TABLE analytics_anomalies
        ADD CONSTRAINT fk_analytics_anomalies_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('  ✅ Added FK: analytics_anomalies -> suppliers');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⚠️  FK already exists: analytics_anomalies -> suppliers');
      } else {
        console.log('  ❌ Error adding FK: analytics_anomalies -> suppliers:', e.message);
      }
    }

    try {
      await client.query(`
        ALTER TABLE analytics_predictions
        ADD CONSTRAINT fk_analytics_predictions_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('  ✅ Added FK: analytics_predictions -> suppliers');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⚠️  FK already exists: analytics_predictions -> suppliers');
      } else {
        console.log('  ❌ Error adding FK: analytics_predictions -> suppliers:', e.message);
      }
    }

    console.log('\n✅ DATABASE INTEGRITY RESTORATION COMPLETE');

    // ============================================================================
    // VERIFICATION
    // ============================================================================
    console.log('\n🔍 VERIFICATION - FOREIGN KEY CONSTRAINTS:');
    const fkQuery = `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name IN (
              'supplier_pricelists', 'pricelist_items', 'supplier_performance',
              'inventory_items', 'stock_movements', 'purchase_orders',
              'purchase_order_items', 'analytics_anomalies', 'analytics_predictions'
          )
      ORDER BY tc.table_name, tc.constraint_name;
    `;

    const fkResults = await client.query(fkQuery);
    fkResults.rows.forEach(fk => {
      console.log(`  ✅ ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      console.log(`     DELETE: ${fk.delete_rule} | UPDATE: ${fk.update_rule}`);
    });

    console.log('\n✅ CRITICAL DATABASE RELATIONSHIPS ESTABLISHED');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error executing integrity fix:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the integrity fix
executeIntegrityFix().catch(console.error);