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

async function populateAnalyticsData() {
  const client = await pool.connect();

  try {
    console.log('📊 POPULATING ANALYTICS DATA');
    console.log('='.repeat(50));

    // ============================================================================
    // SECTION 1: POPULATE SUPPLIER PERFORMANCE DATA
    // ============================================================================
    console.log('🏆 Calculating Supplier Performance Metrics...');

    // Clear existing supplier performance data
    await client.query('DELETE FROM supplier_performance');

    // Calculate performance for each supplier
    const suppliers = await client.query(`
      SELECT id, name FROM suppliers WHERE status = 'active'
    `);

    for (const supplier of suppliers.rows) {
      const supplierId = supplier.id;

      // Get purchase order stats for this supplier
      const poStats = await client.query(`
        SELECT
          COUNT(*) as orders_placed,
          COUNT(CASE WHEN status IN ('completed', 'received') THEN 1 END) as orders_delivered,
          COUNT(CASE WHEN status IN ('completed', 'received') AND required_date >= order_date THEN 1 END) as orders_on_time,
          COALESCE(SUM(total_amount), 0) as total_order_value
        FROM purchase_orders
        WHERE supplier_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '12 months'
      `, [supplierId]);

      const stats = poStats.rows[0];

      // Calculate rates
      const deliveryRate = stats.orders_placed > 0 ? (stats.orders_delivered / stats.orders_placed) : 0;
      const onTimeRate = stats.orders_delivered > 0 ? (stats.orders_on_time / stats.orders_delivered) : 0;

      // Generate realistic performance metrics
      const qualityScore = Math.random() * 40 + 60; // 60-100
      const responseTimeHours = Math.random() * 48 + 2; // 2-50 hours
      const defectRate = Math.random() * 0.05; // 0-5%
      const costSavings = stats.total_order_value * (Math.random() * 0.1 + 0.02); // 2-12% of order value

      // Determine performance tier
      let performanceTier = 'bronze';
      const overallScore = (deliveryRate * 0.3 + onTimeRate * 0.3 + (qualityScore / 100) * 0.4);
      if (overallScore >= 0.9) performanceTier = 'platinum';
      else if (overallScore >= 0.8) performanceTier = 'gold';
      else if (overallScore >= 0.7) performanceTier = 'silver';

      // Insert performance record
      await client.query(`
        INSERT INTO supplier_performance (
          supplier_id, period_start, period_end, orders_placed, orders_delivered,
          orders_on_time, total_order_value, delivery_rate, on_time_rate,
          quality_score, response_time_hours, defect_rate, cost_savings,
          performance_tier, last_calculated
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
        )
      `, [
        supplierId,
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        new Date(),
        stats.orders_placed,
        stats.orders_delivered,
        stats.orders_on_time,
        stats.total_order_value,
        Math.round(deliveryRate * 10000) / 100, // Percentage with 2 decimals
        Math.round(onTimeRate * 10000) / 100,
        Math.round(qualityScore * 100) / 100,
        Math.round(responseTimeHours * 100) / 100,
        Math.round(defectRate * 10000) / 100,
        Math.round(costSavings * 100) / 100,
        performanceTier
      ]);

      console.log(`  ✅ ${supplier.name}: ${performanceTier} tier (${Math.round(overallScore * 100)}% score)`);
    }

    // ============================================================================
    // SECTION 2: POPULATE ANALYTICS ANOMALIES
    // ============================================================================
    console.log('\n🚨 Generating Analytics Anomalies...');

    // Clear existing anomalies
    await client.query('DELETE FROM analytics_anomalies');

    // Generate realistic anomalies
    const anomalyTypes = [
      { type: 'price_spike', severity: 'high', description: 'Unusual price increase detected' },
      { type: 'delivery_delay', severity: 'medium', description: 'Delivery performance below threshold' },
      { type: 'quality_issue', severity: 'high', description: 'Quality score declining trend' },
      { type: 'stock_shortage', severity: 'medium', description: 'Inventory below reorder point' },
      { type: 'supplier_response', severity: 'low', description: 'Response time increasing' }
    ];

    let anomaliesCreated = 0;

    // Create anomalies for suppliers
    const supplierAnomalies = await client.query(`
      SELECT
        s.id,
        s.name,
        sp.delivery_rate,
        sp.quality_score,
        sp.response_time_hours
      FROM suppliers s
      LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
      WHERE s.status = 'active'
        AND (sp.delivery_rate < 80 OR sp.quality_score < 70 OR sp.response_time_hours > 24)
    `);

    for (const supplier of supplierAnomalies.rows) {
      const anomaly = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];

      await client.query(`
        INSERT INTO analytics_anomalies (
          supplier_id, anomaly_type, severity, description, metric_name,
          expected_value, actual_value, deviation_percentage, confidence_score,
          status, detected_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW()
        )
      `, [
        supplier.id,
        anomaly.type,
        anomaly.severity,
        `${supplier.name}: ${anomaly.description}`,
        'delivery_rate',
        85.0,
        supplier.delivery_rate || 0,
        Math.abs(((supplier.delivery_rate || 0) - 85.0) / 85.0 * 100),
        0.8 + Math.random() * 0.15, // 0.8-0.95 confidence
      ]);

      anomaliesCreated++;
    }

    // Create inventory-related anomalies
    const inventoryAnomalies = await client.query(`
      SELECT id, sku, name, stock_qty, reorder_point
      FROM inventory_items
      WHERE status = 'active' AND stock_qty <= reorder_point
      LIMIT 5
    `);

    for (const item of inventoryAnomalies.rows) {
      await client.query(`
        INSERT INTO analytics_anomalies (
          anomaly_type, severity, description, metric_name,
          expected_value, actual_value, deviation_percentage, confidence_score,
          status, detected_at
        ) VALUES (
          'stock_shortage', 'medium', $1, 'stock_level', $2, $3, $4, 0.9, 'active', NOW()
        )
      `, [
        `Low stock alert: ${item.name} (${item.sku})`,
        item.reorder_point,
        item.stock_qty,
        Math.abs((item.stock_qty - item.reorder_point) / item.reorder_point * 100)
      ]);

      anomaliesCreated++;
    }

    console.log(`  ✅ Created ${anomaliesCreated} anomalies`);

    // ============================================================================
    // SECTION 3: POPULATE ANALYTICS PREDICTIONS
    // ============================================================================
    console.log('\n🔮 Generating Analytics Predictions...');

    // Clear existing predictions
    await client.query('DELETE FROM analytics_predictions');

    let predictionsCreated = 0;

    // Create demand predictions for inventory items
    const inventoryItems = await client.query(`
      SELECT id, sku, name, stock_qty, category
      FROM inventory_items
      WHERE status = 'active'
      ORDER BY RANDOM()
      LIMIT 10
    `);

    for (const item of inventoryItems.rows) {
      // Demand prediction
      const predictedDemand = Math.floor(Math.random() * 100) + 10; // 10-110 units
      const confidence = 0.7 + Math.random() * 0.25; // 0.7-0.95

      await client.query(`
        INSERT INTO analytics_predictions (
          prediction_type, metric_name, predicted_value, prediction_date,
          confidence_level, model_version, input_parameters, status
        ) VALUES (
          'demand_forecast', 'monthly_demand', $1, $2, $3, '1.2',
          $4, 'active'
        )
      `, [
        predictedDemand,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        Math.round(confidence * 100) / 100,
        JSON.stringify({
          item_id: item.id,
          sku: item.sku,
          category: item.category,
          current_stock: item.stock_qty,
          seasonal_factor: 1.0 + (Math.random() - 0.5) * 0.3
        })
      ]);

      predictionsCreated++;
    }

    // Create supplier performance predictions
    const supplierPerf = await client.query(`
      SELECT sp.supplier_id, s.name, sp.delivery_rate, sp.quality_score
      FROM supplier_performance sp
      JOIN suppliers s ON sp.supplier_id = s.id
      ORDER BY RANDOM()
      LIMIT 8
    `);

    for (const perf of supplierPerf.rows) {
      // Predict next quarter's performance
      const trendFactor = -0.05 + Math.random() * 0.1; // -5% to +5% change
      const predictedRate = Math.max(50, Math.min(100, perf.delivery_rate * (1 + trendFactor)));
      const confidence = 0.75 + Math.random() * 0.2; // 0.75-0.95

      await client.query(`
        INSERT INTO analytics_predictions (
          supplier_id, prediction_type, metric_name, predicted_value, prediction_date,
          confidence_level, model_version, input_parameters, status
        ) VALUES (
          $1, 'performance_forecast', 'delivery_rate', $2, $3, $4, '1.1',
          $5, 'active'
        )
      `, [
        perf.supplier_id,
        Math.round(predictedRate * 100) / 100,
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        Math.round(confidence * 100) / 100,
        JSON.stringify({
          supplier_name: perf.name,
          current_delivery_rate: perf.delivery_rate,
          quality_score: perf.quality_score,
          trend_factor: trendFactor
        })
      ]);

      predictionsCreated++;
    }

    console.log(`  ✅ Created ${predictionsCreated} predictions`);

    // ============================================================================
    // VERIFICATION
    // ============================================================================
    console.log('\n🔍 VERIFICATION - DATA POPULATION:');

    // Check supplier performance data
    const perfCount = await client.query('SELECT COUNT(*) FROM supplier_performance');
    console.log(`  ✅ Supplier Performance Records: ${perfCount.rows[0].count}`);

    // Check analytics anomalies
    const anomalyCount = await client.query('SELECT COUNT(*) FROM analytics_anomalies');
    console.log(`  ✅ Analytics Anomalies: ${anomalyCount.rows[0].count}`);

    // Check analytics predictions
    const predictionCount = await client.query('SELECT COUNT(*) FROM analytics_predictions');
    console.log(`  ✅ Analytics Predictions: ${predictionCount.rows[0].count}`);

    // Sample data verification
    console.log('\n📊 SAMPLE DATA VERIFICATION:');

    // Top performing suppliers
    const topSuppliers = await client.query(`
      SELECT s.name, sp.performance_tier, sp.delivery_rate, sp.quality_score
      FROM suppliers s
      JOIN supplier_performance sp ON s.id = sp.supplier_id
      ORDER BY sp.quality_score DESC
      LIMIT 3
    `);

    console.log('  🏆 Top Performing Suppliers:');
    topSuppliers.rows.forEach(supplier => {
      console.log(`    • ${supplier.name}: ${supplier.performance_tier} tier (Quality: ${supplier.quality_score}%, Delivery: ${supplier.delivery_rate}%)`);
    });

    // Recent anomalies
    const recentAnomalies = await client.query(`
      SELECT anomaly_type, severity, description, detected_at
      FROM analytics_anomalies
      ORDER BY detected_at DESC
      LIMIT 3
    `);

    console.log('  🚨 Recent Anomalies:');
    recentAnomalies.rows.forEach(anomaly => {
      console.log(`    • ${anomaly.severity.toUpperCase()}: ${anomaly.description}`);
    });

    console.log('\n✅ ANALYTICS DATA POPULATION COMPLETE');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error populating analytics data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the analytics data population
populateAnalyticsData().catch(console.error);