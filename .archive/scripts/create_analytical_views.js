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

async function createAnalyticalViews() {
  const client = await pool.connect();

  try {
    console.log('👁️  CREATING ANALYTICAL VIEWS');
    console.log('='.repeat(50));

    // View 1: Supplier Performance Summary
    console.log('📊 Creating v_supplier_performance_summary...');
    await client.query(`
      CREATE OR REPLACE VIEW v_supplier_performance_summary AS
      SELECT
          s.id as supplier_id,
          s.name as supplier_name,
          s.performance_tier,
          s.spend_last_12_months,
          s.rating,
          s.status as supplier_status,
          s.primary_category,
          s.contact_person,
          s.email as supplier_email,
          s.phone as supplier_phone,
          COALESCE(sp.orders_placed, 0) as orders_placed,
          COALESCE(sp.orders_delivered, 0) as orders_delivered,
          COALESCE(sp.delivery_rate, 0) as delivery_rate,
          COALESCE(sp.on_time_rate, 0) as on_time_rate,
          COALESCE(sp.quality_score, 0) as quality_score,
          COALESCE(sp.response_time_hours, 0) as response_time_hours,
          COALESCE(sp.defect_rate, 0) as defect_rate,
          COALESCE(sp.cost_savings, 0) as cost_savings,
          sp.last_calculated as performance_last_updated,
          COUNT(DISTINCT po.id) as active_purchase_orders,
          COALESCE(SUM(CASE WHEN po.status IN ('pending', 'approved', 'sent') THEN po.total_amount ELSE 0 END), 0) as total_po_value,
          COUNT(DISTINCT ii.id) as inventory_items_count,
          COALESCE(AVG(ii.cost_price), 0) as avg_item_cost,
          COUNT(DISTINCT spl.id) as active_pricelists,
          s.created_at as supplier_created_at,
          s.updated_at as supplier_updated_at
      FROM suppliers s
      LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      LEFT JOIN inventory_items ii ON s.id = ii.supplier_id AND ii.status = 'active'
      LEFT JOIN supplier_pricelists spl ON s.id = spl.supplier_id AND spl.is_active = true
      WHERE s.status = 'active'
      GROUP BY
          s.id, s.name, s.performance_tier, s.spend_last_12_months, s.rating,
          s.status, s.primary_category, s.contact_person, s.email, s.phone,
          sp.orders_placed, sp.orders_delivered, sp.delivery_rate, sp.on_time_rate,
          sp.quality_score, sp.response_time_hours, sp.defect_rate, sp.cost_savings,
          sp.last_calculated, s.created_at, s.updated_at;
    `);
    console.log('  ✅ Created v_supplier_performance_summary');

    // View 2: Inventory Analytics
    console.log('📦 Creating v_inventory_analytics...');
    await client.query(`
      CREATE OR REPLACE VIEW v_inventory_analytics AS
      SELECT
          ii.id as item_id,
          ii.sku,
          ii.name as item_name,
          ii.description,
          ii.category,
          ii.brand,
          s.name as supplier_name,
          s.id as supplier_id,
          ii.stock_qty,
          ii.reserved_qty,
          ii.available_qty,
          ii.reorder_point,
          ii.max_stock,
          ii.cost_price,
          ii.sale_price,
          ii.currency,
          ii.unit,
          ii.location,
          CASE
              WHEN ii.stock_qty = 0 THEN 'out_of_stock'
              WHEN ii.stock_qty <= ii.reorder_point THEN 'low_stock'
              WHEN ii.max_stock IS NOT NULL AND ii.stock_qty > ii.max_stock THEN 'overstock'
              ELSE 'normal'
          END as stock_status,
          COALESCE(sm_in.total_in, 0) as total_stock_in,
          COALESCE(sm_out.total_out, 0) as total_stock_out,
          COALESCE(sm_in.total_in, 0) - COALESCE(sm_out.total_out, 0) as net_movement,
          COALESCE(recent_movements.movement_count, 0) as recent_movement_count,
          recent_movements.last_movement_date,
          ii.created_at as item_created_at,
          ii.updated_at as last_updated
      FROM inventory_items ii
      LEFT JOIN suppliers s ON ii.supplier_id = s.id
      LEFT JOIN (
          SELECT
              item_id,
              SUM(quantity) as total_in
          FROM stock_movements
          WHERE movement_type IN ('receipt', 'adjustment_in', 'return_in')
            AND created_at >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY item_id
      ) sm_in ON ii.id = sm_in.item_id
      LEFT JOIN (
          SELECT
              item_id,
              SUM(ABS(quantity)) as total_out
          FROM stock_movements
          WHERE movement_type IN ('shipment', 'adjustment_out', 'return_out', 'waste')
            AND created_at >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY item_id
      ) sm_out ON ii.id = sm_out.item_id
      LEFT JOIN (
          SELECT
              item_id,
              COUNT(*) as movement_count,
              MAX(created_at) as last_movement_date
          FROM stock_movements
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY item_id
      ) recent_movements ON ii.id = recent_movements.item_id
      WHERE ii.status = 'active';
    `);
    console.log('  ✅ Created v_inventory_analytics');

    // View 3: Supplier Pricelist Summary
    console.log('💰 Creating v_supplier_pricelist_summary...');
    await client.query(`
      CREATE OR REPLACE VIEW v_supplier_pricelist_summary AS
      SELECT
          s.id as supplier_id,
          s.name as supplier_name,
          sp.id as pricelist_id,
          sp.name as pricelist_name,
          sp.version,
          sp.currency,
          sp.effective_from,
          sp.effective_to,
          sp.is_active,
          sp.approval_status,
          sp.created_by,
          sp.approved_by,
          sp.approved_at,
          COUNT(pi.id) as item_count,
          COALESCE(MIN(pi.unit_price), 0) as min_price,
          COALESCE(MAX(pi.unit_price), 0) as max_price,
          COALESCE(AVG(pi.unit_price), 0) as avg_price,
          COALESCE(SUM(pi.unit_price * pi.minimum_quantity), 0) as total_minimum_value,
          COALESCE(AVG(pi.lead_time_days), 0) as avg_lead_time,
          sp.created_at as pricelist_created_at,
          sp.updated_at as pricelist_updated_at
      FROM suppliers s
      INNER JOIN supplier_pricelists sp ON s.id = sp.supplier_id
      LEFT JOIN pricelist_items pi ON sp.id = pi.pricelist_id
      GROUP BY
          s.id, s.name, sp.id, sp.name, sp.version, sp.currency,
          sp.effective_from, sp.effective_to, sp.is_active, sp.approval_status,
          sp.created_by, sp.approved_by, sp.approved_at, sp.created_at, sp.updated_at;
    `);
    console.log('  ✅ Created v_supplier_pricelist_summary');

    // View 4: Purchase Order Analytics
    console.log('📋 Creating v_purchase_order_analytics...');
    await client.query(`
      CREATE OR REPLACE VIEW v_purchase_order_analytics AS
      SELECT
          po.id as po_id,
          po.po_number,
          s.name as supplier_name,
          s.id as supplier_id,
          po.status,
          po.order_date,
          po.required_date,
          po.total_amount,
          po.currency,
          po.subtotal,
          po.tax_amount,
          COUNT(poi.id) as line_items,
          COALESCE(SUM(poi.quantity), 0) as total_quantity,
          COALESCE(SUM(poi.received_qty), 0) as total_received,
          COALESCE(AVG(poi.unit_cost), 0) as avg_unit_cost,
          CASE
              WHEN po.required_date < CURRENT_DATE AND po.status NOT IN ('completed', 'received', 'cancelled') THEN 'overdue'
              WHEN po.required_date <= CURRENT_DATE + INTERVAL '7 days' AND po.status NOT IN ('completed', 'received', 'cancelled') THEN 'due_soon'
              WHEN po.status = 'cancelled' THEN 'cancelled'
              ELSE 'on_track'
          END as delivery_status,
          CASE
              WHEN SUM(poi.quantity) > 0 THEN
                  ROUND((SUM(poi.received_qty)::NUMERIC / SUM(poi.quantity) * 100), 2)
              ELSE 0
          END as fulfillment_percentage,
          po.created_at as po_created_at,
          po.updated_at as po_updated_at
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
      GROUP BY
          po.id, po.po_number, s.name, s.id, po.status, po.order_date,
          po.required_date, po.total_amount, po.currency, po.subtotal, po.tax_amount,
          po.created_at, po.updated_at;
    `);
    console.log('  ✅ Created v_purchase_order_analytics');

    // View 5: Stock Movement Analytics
    console.log('📈 Creating v_stock_movement_analytics...');
    await client.query(`
      CREATE OR REPLACE VIEW v_stock_movement_analytics AS
      SELECT
          sm.id as movement_id,
          sm.item_id,
          ii.sku,
          ii.name as item_name,
          ii.category,
          s.name as supplier_name,
          sm.movement_type,
          sm.quantity,
          sm.cost,
          sm.reason,
          sm.reference,
          sm.location_from,
          sm.location_to,
          sm.created_at as movement_date,
          DATE_TRUNC('month', sm.created_at) as movement_month,
          DATE_TRUNC('week', sm.created_at) as movement_week,
          CASE
              WHEN sm.movement_type IN ('receipt', 'adjustment_in', 'return_in') THEN 'inbound'
              WHEN sm.movement_type IN ('shipment', 'adjustment_out', 'return_out', 'waste') THEN 'outbound'
              ELSE 'other'
          END as movement_direction,
          ABS(sm.quantity) as abs_quantity,
          COALESCE(sm.cost * ABS(sm.quantity), 0) as total_cost
      FROM stock_movements sm
      LEFT JOIN inventory_items ii ON sm.item_id = ii.id
      LEFT JOIN suppliers s ON ii.supplier_id = s.id
      WHERE sm.created_at >= CURRENT_DATE - INTERVAL '1 year'
      ORDER BY sm.created_at DESC;
    `);
    console.log('  ✅ Created v_stock_movement_analytics');

    // View 6: Supplier Category Performance
    console.log('🏷️  Creating v_supplier_category_performance...');
    await client.query(`
      CREATE OR REPLACE VIEW v_supplier_category_performance AS
      SELECT
          s.primary_category,
          COUNT(DISTINCT s.id) as supplier_count,
          COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_suppliers,
          COALESCE(AVG(s.rating), 0) as avg_rating,
          COALESCE(SUM(s.spend_last_12_months), 0) as total_spend,
          COALESCE(AVG(s.spend_last_12_months), 0) as avg_spend_per_supplier,
          COUNT(DISTINCT po.id) as total_purchase_orders,
          COALESCE(SUM(po.total_amount), 0) as total_po_value,
          COUNT(DISTINCT ii.id) as total_inventory_items,
          COALESCE(AVG(sp.delivery_rate), 0) as avg_delivery_rate,
          COALESCE(AVG(sp.on_time_rate), 0) as avg_on_time_rate,
          COALESCE(AVG(sp.quality_score), 0) as avg_quality_score,
          COALESCE(AVG(sp.defect_rate), 0) as avg_defect_rate
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      LEFT JOIN inventory_items ii ON s.id = ii.supplier_id AND ii.status = 'active'
      LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
      WHERE s.primary_category IS NOT NULL
      GROUP BY s.primary_category
      ORDER BY total_spend DESC;
    `);
    console.log('  ✅ Created v_supplier_category_performance');

    // Test all views
    console.log('\n🔍 TESTING ANALYTICAL VIEWS:');
    const testViews = [
      'v_supplier_performance_summary',
      'v_inventory_analytics',
      'v_supplier_pricelist_summary',
      'v_purchase_order_analytics',
      'v_stock_movement_analytics',
      'v_supplier_category_performance'
    ];

    for (const viewName of testViews) {
      try {
        const testResult = await client.query(`SELECT COUNT(*) as count FROM ${viewName}`);
        console.log(`  ✅ ${viewName}: ${testResult.rows[0].count} records`);
      } catch (error) {
        console.log(`  ❌ ${viewName}: Error - ${error.message}`);
      }
    }

    // Show all created views
    console.log('\n👁️  LISTING ALL ANALYTICAL VIEWS:');
    const viewQuery = `
      SELECT
        viewname,
        definition
      FROM pg_views
      WHERE schemaname = 'public'
        AND viewname LIKE 'v_%'
      ORDER BY viewname;
    `;

    const viewResults = await client.query(viewQuery);
    viewResults.rows.forEach(view => {
      console.log(`  👁️  ${view.viewname}`);
    });

    console.log('\n✅ ANALYTICAL VIEWS CREATION COMPLETE');
    console.log(`📊 Total Views Created: ${viewResults.rows.length}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error creating views:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the view creation
createAnalyticalViews().catch(console.error);