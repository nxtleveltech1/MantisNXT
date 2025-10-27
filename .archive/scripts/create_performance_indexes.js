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

async function createPerformanceIndexes() {
  const client = await pool.connect();

  try {
    console.log('📊 CREATING PERFORMANCE INDEXES');
    console.log('='.repeat(50));

    const indexes = [
      // Supplier system indexes
      {
        name: 'idx_suppliers_status',
        table: 'suppliers',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_status ON suppliers(status)'
      },
      {
        name: 'idx_suppliers_performance_tier',
        table: 'suppliers',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_performance_tier ON suppliers(performance_tier)'
      },
      {
        name: 'idx_suppliers_primary_category',
        table: 'suppliers',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_primary_category ON suppliers(primary_category)'
      },
      {
        name: 'idx_suppliers_organization_id',
        table: 'suppliers',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_organization_id ON suppliers(organization_id)'
      },

      // Supplier pricelists indexes
      {
        name: 'idx_supplier_pricelists_supplier_id',
        table: 'supplier_pricelists',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_pricelists_supplier_id ON supplier_pricelists(supplier_id)'
      },
      {
        name: 'idx_supplier_pricelists_active',
        table: 'supplier_pricelists',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_pricelists_active ON supplier_pricelists(is_active, effective_from, effective_to)'
      },
      {
        name: 'idx_supplier_pricelists_dates',
        table: 'supplier_pricelists',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_pricelists_dates ON supplier_pricelists(effective_from, effective_to)'
      },

      // Pricelist items indexes
      {
        name: 'idx_pricelist_items_pricelist_id',
        table: 'pricelist_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pricelist_items_pricelist_id ON pricelist_items(pricelist_id)'
      },
      {
        name: 'idx_pricelist_items_sku',
        table: 'pricelist_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pricelist_items_sku ON pricelist_items(sku)'
      },
      {
        name: 'idx_pricelist_items_supplier_sku',
        table: 'pricelist_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pricelist_items_supplier_sku ON pricelist_items(supplier_sku)'
      },

      // Inventory indexes
      {
        name: 'idx_inventory_items_supplier_id',
        table: 'inventory_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_supplier_id ON inventory_items(supplier_id)'
      },
      {
        name: 'idx_inventory_items_sku',
        table: 'inventory_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku)'
      },
      {
        name: 'idx_inventory_items_status',
        table: 'inventory_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_status ON inventory_items(status)'
      },
      {
        name: 'idx_inventory_items_category',
        table: 'inventory_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_category ON inventory_items(category)'
      },
      {
        name: 'idx_inventory_items_stock_levels',
        table: 'inventory_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_stock_levels ON inventory_items(stock_qty, reorder_point)'
      },

      // Stock movements indexes
      {
        name: 'idx_stock_movements_item_id',
        table: 'stock_movements',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id)'
      },
      {
        name: 'idx_stock_movements_type_date',
        table: 'stock_movements',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(movement_type, created_at)'
      },
      {
        name: 'idx_stock_movements_created_at',
        table: 'stock_movements',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC)'
      },

      // Purchase orders indexes
      {
        name: 'idx_purchase_orders_supplier_id',
        table: 'purchase_orders',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id)'
      },
      {
        name: 'idx_purchase_orders_status',
        table: 'purchase_orders',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status)'
      },
      {
        name: 'idx_purchase_orders_dates',
        table: 'purchase_orders',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_dates ON purchase_orders(order_date, required_date)'
      },
      {
        name: 'idx_purchase_orders_po_number',
        table: 'purchase_orders',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number)'
      },

      // Purchase order items indexes
      {
        name: 'idx_purchase_order_items_po_id',
        table: 'purchase_order_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(po_id)'
      },
      {
        name: 'idx_purchase_order_items_item_id',
        table: 'purchase_order_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_order_items_item_id ON purchase_order_items(item_id)'
      },

      // Supplier performance indexes
      {
        name: 'idx_supplier_performance_supplier_id',
        table: 'supplier_performance',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_performance_supplier_id ON supplier_performance(supplier_id)'
      },
      {
        name: 'idx_supplier_performance_period',
        table: 'supplier_performance',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_performance_period ON supplier_performance(period_start, period_end)'
      },
      {
        name: 'idx_supplier_performance_tier',
        table: 'supplier_performance',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_performance_tier ON supplier_performance(performance_tier)'
      },

      // Analytics indexes
      {
        name: 'idx_analytics_anomalies_supplier_id',
        table: 'analytics_anomalies',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_anomalies_supplier_id ON analytics_anomalies(supplier_id)'
      },
      {
        name: 'idx_analytics_anomalies_type_severity',
        table: 'analytics_anomalies',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_anomalies_type_severity ON analytics_anomalies(anomaly_type, severity)'
      },
      {
        name: 'idx_analytics_anomalies_detected_at',
        table: 'analytics_anomalies',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_anomalies_detected_at ON analytics_anomalies(detected_at DESC)'
      },
      {
        name: 'idx_analytics_anomalies_status',
        table: 'analytics_anomalies',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_anomalies_status ON analytics_anomalies(status)'
      },

      {
        name: 'idx_analytics_predictions_supplier_id',
        table: 'analytics_predictions',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_predictions_supplier_id ON analytics_predictions(supplier_id)'
      },
      {
        name: 'idx_analytics_predictions_type',
        table: 'analytics_predictions',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_predictions_type ON analytics_predictions(prediction_type)'
      },
      {
        name: 'idx_analytics_predictions_date',
        table: 'analytics_predictions',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_predictions_date ON analytics_predictions(prediction_date)'
      },
      {
        name: 'idx_analytics_predictions_accuracy',
        table: 'analytics_predictions',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_predictions_accuracy ON analytics_predictions(accuracy DESC)'
      },

      // Composite indexes for common query patterns
      {
        name: 'idx_supplier_pricelists_composite',
        table: 'supplier_pricelists',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_pricelists_composite ON supplier_pricelists(supplier_id, is_active, effective_from, effective_to)'
      },
      {
        name: 'idx_inventory_supplier_category',
        table: 'inventory_items',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_supplier_category ON inventory_items(supplier_id, category, status)'
      },
      {
        name: 'idx_purchase_orders_supplier_status',
        table: 'purchase_orders',
        definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_supplier_status ON purchase_orders(supplier_id, status, order_date)'
      }
    ];

    let createdCount = 0;
    let existingCount = 0;

    for (const index of indexes) {
      try {
        await client.query(index.definition);
        console.log(`  ✅ Created: ${index.name} on ${index.table}`);
        createdCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  Exists: ${index.name} on ${index.table}`);
          existingCount++;
        } else {
          console.log(`  ❌ Failed: ${index.name} on ${index.table} - ${error.message}`);
        }
      }
    }

    console.log('\n📊 INDEX CREATION SUMMARY:');
    console.log(`  ✅ Created: ${createdCount} indexes`);
    console.log(`  ⚠️  Existing: ${existingCount} indexes`);
    console.log(`  📊 Total: ${createdCount + existingCount} indexes`);

    // Verify created indexes
    console.log('\n🔍 VERIFYING CREATED INDEXES:');
    const indexQuery = `
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
          AND tablename IN (
              'suppliers', 'supplier_pricelists', 'pricelist_items',
              'inventory_items', 'stock_movements', 'purchase_orders',
              'purchase_order_items', 'supplier_performance',
              'analytics_anomalies', 'analytics_predictions'
          )
          AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;

    const indexResults = await client.query(indexQuery);
    let currentTable = '';
    indexResults.rows.forEach(idx => {
      if (idx.tablename !== currentTable) {
        console.log(`\n  📊 ${idx.tablename}:`);
        currentTable = idx.tablename;
      }
      console.log(`    ✅ ${idx.indexname}`);
    });

    console.log('\n✅ PERFORMANCE INDEXES CREATION COMPLETE');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the index creation
createPerformanceIndexes().catch(console.error);