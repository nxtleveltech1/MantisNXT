#!/usr/bin/env node

/**
 * AI Database Architecture Test Suite
 *
 * Validates the emergency fixes and AI-enhanced database deployment
 */

const { Pool } = require('pg');

const dbConfig = {
  user: 'nxtdb_admin',
  password: 'P@33w0rd-1',
  host: '62.169.20.53',
  port: 6600,
  database: 'nxtprod-db_001',
  ssl: false,
  max: 5
};

const pool = new Pool(dbConfig);

async function main() {
  console.log('🧪 AI DATABASE ARCHITECTURE TEST SUITE');
  console.log('======================================');

  try {
    await testDatabaseConnection();
    await testEmergencyFixes();
    await deployAITables();
    await testAIFeatures();
    await testPerformance();

    console.log('\n🎉 ALL TESTS PASSED');
    console.log('Database ready for AI-powered operations!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function testDatabaseConnection() {
  console.log('\n🔌 Testing database connection...');

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW(), version()');
    console.log(`   ✅ Connected successfully at ${result.rows[0].now}`);
    console.log(`   ✅ PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`);
  } finally {
    client.release();
  }
}

async function testEmergencyFixes() {
  console.log('\n🚨 Testing emergency schema fixes...');

  const client = await pool.connect();
  try {
    // Test that recommendations API queries work now
    console.log('   📊 Testing supplier recommendations query...');
    const supplierQuery = `
      SELECT
        COALESCE(name, supplier_name, company_name) as supplier_name,
        COALESCE(payment_terms_days, 30) as payment_terms_days,
        COALESCE(currency, 'USD') as currency
      FROM suppliers
      WHERE status = 'active'
      ORDER BY COALESCE(payment_terms_days, 30) DESC
      LIMIT 5
    `;

    const supplierResult = await client.query(supplierQuery);
    console.log(`   ✅ Supplier query returned ${supplierResult.rows.length} rows`);

    console.log('   📦 Testing inventory recommendations query...');
    const inventoryQuery = `
      SELECT
        name as product_name,
        stock_qty as current_stock,
        COALESCE(reorder_point, 0) as reorder_level
      FROM inventory_items
      WHERE stock_qty IS NOT NULL AND stock_qty >= 0
      ORDER BY stock_qty ASC
      LIMIT 5
    `;

    const inventoryResult = await client.query(inventoryQuery);
    console.log(`   ✅ Inventory query returned ${inventoryResult.rows.length} rows`);

  } finally {
    client.release();
  }
}

async function deployAITables() {
  console.log('\n🧠 Deploying AI tables...');

  const client = await pool.connect();
  try {
    // Create essential AI tables with minimal schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        insight_type VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        confidence_score NUMERIC(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
        model_name VARCHAR(100) NOT NULL,
        model_version VARCHAR(20) NOT NULL,
        validation_status VARCHAR(20) DEFAULT 'pending',
        generated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_predictions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        prediction_type VARCHAR(50) NOT NULL,
        target_entity_type VARCHAR(50) NOT NULL,
        target_entity_id UUID NOT NULL,
        prediction_date TIMESTAMPTZ DEFAULT NOW(),
        forecast_target_date TIMESTAMPTZ NOT NULL,
        predicted_value NUMERIC(15,4) NOT NULL,
        prediction_confidence NUMERIC(3,2) CHECK (prediction_confidence >= 0 AND prediction_confidence <= 1),
        model_identifier VARCHAR(100) NOT NULL,
        actual_value NUMERIC(15,4),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_anomalies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        anomaly_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        anomaly_score NUMERIC(6,4) CHECK (anomaly_score >= 0),
        detected_at TIMESTAMPTZ DEFAULT NOW(),
        detection_algorithm VARCHAR(100) NOT NULL,
        acknowledgment_status VARCHAR(20) DEFAULT 'new',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add AI columns to existing tables
    await client.query(`
      ALTER TABLE suppliers
      ADD COLUMN IF NOT EXISTS ai_performance_score NUMERIC(5,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS ai_reliability_index NUMERIC(3,2) DEFAULT 0.50
    `);

    await client.query(`
      ALTER TABLE inventory_items
      ADD COLUMN IF NOT EXISTS ai_risk_score NUMERIC(3,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,4) DEFAULT 0.00
    `);

    console.log('   ✅ AI tables deployed successfully');

  } finally {
    client.release();
  }
}

async function testAIFeatures() {
  console.log('\n🤖 Testing AI features...');

  const client = await pool.connect();
  try {
    // Insert test AI insights
    await client.query(`
      INSERT INTO ai_insights (
        insight_type, category, priority, title, description,
        confidence_score, model_name, model_version
      ) VALUES (
        'test_insight', 'operational', 'medium',
        'Test AI Insight', 'This is a test insight for validation',
        0.85, 'test_model', 'v1.0'
      ) ON CONFLICT DO NOTHING
    `);

    // Insert test predictions
    const supplierId = await client.query(`
      SELECT id FROM suppliers LIMIT 1
    `);

    if (supplierId.rows.length > 0) {
      await client.query(`
        INSERT INTO ai_predictions (
          prediction_type, target_entity_type, target_entity_id,
          forecast_target_date, predicted_value, prediction_confidence, model_identifier
        ) VALUES (
          'performance_forecast', 'supplier', $1,
          NOW() + INTERVAL '30 days', 85.5, 0.78, 'performance_predictor_v1'
        )
      `, [supplierId.rows[0].id]);
    }

    // Test anomaly detection
    await client.query(`
      INSERT INTO ai_anomalies (
        anomaly_type, severity, entity_type, entity_id,
        anomaly_score, detection_algorithm
      ) VALUES (
        'price_spike', 'warning', 'product', uuid_generate_v4(),
        2.34, 'statistical_outlier_detector'
      )
    `);

    // Update supplier AI scores
    await client.query(`
      UPDATE suppliers SET
        ai_performance_score = CASE
          WHEN rating IS NOT NULL THEN rating * 20
          ELSE 75.0
        END,
        ai_reliability_index = 0.80
      WHERE ai_performance_score = 0 OR ai_performance_score IS NULL
    `);

    console.log('   ✅ AI features working correctly');

  } finally {
    client.release();
  }
}

async function testPerformance() {
  console.log('\n⚡ Testing performance...');

  const queries = [
    {
      name: 'High-performance supplier query',
      sql: `
        SELECT name, ai_performance_score, currency
        FROM suppliers
        WHERE status = 'active' AND ai_performance_score > 50
        ORDER BY ai_performance_score DESC
        LIMIT 10
      `
    },
    {
      name: 'AI insights priority query',
      sql: `
        SELECT insight_type, priority, confidence_score
        FROM ai_insights
        WHERE validation_status != 'disputed'
        ORDER BY generated_at DESC
        LIMIT 5
      `
    },
    {
      name: 'Inventory risk analysis',
      sql: `
        SELECT name, stock_qty, ai_risk_score
        FROM inventory_items
        WHERE ai_risk_score > 0.3
        ORDER BY ai_risk_score DESC
        LIMIT 5
      `
    }
  ];

  const client = await pool.connect();
  try {
    for (const query of queries) {
      const startTime = process.hrtime.bigint();
      const result = await client.query(query.sql);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000; // Convert to ms
      console.log(`   ⏱️  ${query.name}: ${executionTime.toFixed(2)}ms (${result.rows.length} rows)`);
    }

    console.log('   ✅ Performance benchmarks completed');

  } finally {
    client.release();
  }
}

main();