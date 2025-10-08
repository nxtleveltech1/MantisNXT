#!/usr/bin/env node

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false
};

async function createBasicProductsTable() {
  const pool = new Pool(dbConfig);
  let client;

  try {
    client = await pool.connect();
    console.log('✅ Connected to database');

    // First, enhance suppliers table
    console.log('📊 Enhancing suppliers table...');
    const supplierEnhancements = [
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pricelist_format VARCHAR(50) DEFAULT 'excel'`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS last_pricelist_update TIMESTAMPTZ`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pricelist_file_path TEXT`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pricelist_version VARCHAR(50)`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS sheet_mapping JSONB`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS column_mapping JSONB`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS import_status VARCHAR(50) DEFAULT 'pending'`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS total_products INTEGER DEFAULT 0`,
    ];

    for (const sql of supplierEnhancements) {
      try {
        await client.query(sql);
        console.log('✅ Added supplier column');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('⚠️ Column already exists, skipping');
        } else {
          console.error('❌ Error:', error.message);
        }
      }
    }

    // Create products table
    console.log('📊 Creating products table...');
    const createProductsSQL = `
      CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

          -- Core Product Identification
          sku VARCHAR(100) NOT NULL,
          supplier_sku VARCHAR(100),
          upc_barcode VARCHAR(50),
          ean_barcode VARCHAR(50),

          -- Product Information
          name VARCHAR(500) NOT NULL,
          description TEXT,
          short_description VARCHAR(500),
          brand VARCHAR(100),
          manufacturer VARCHAR(100),
          model VARCHAR(100),

          -- Categorization
          category VARCHAR(100),
          subcategory VARCHAR(100),
          product_type VARCHAR(100),

          -- Supplier Relations
          supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
          supplier_product_code VARCHAR(100),

          -- Pricing Information
          cost_price DECIMAL(15,4) NOT NULL DEFAULT 0,
          wholesale_price DECIMAL(15,4),
          retail_price DECIMAL(15,4),
          suggested_retail_price DECIMAL(15,4),
          currency VARCHAR(3) DEFAULT 'ZAR',

          -- Pricing Rules
          discount_percentage DECIMAL(5,2) DEFAULT 0,
          min_order_qty INTEGER DEFAULT 1,
          price_tier VARCHAR(50),

          -- Stock & Inventory
          stock_status VARCHAR(50) DEFAULT 'unknown',
          lead_time_days INTEGER,
          minimum_stock INTEGER DEFAULT 0,

          -- Technical Specifications
          weight DECIMAL(10,3),
          dimensions_l DECIMAL(10,2),
          dimensions_w DECIMAL(10,2),
          dimensions_h DECIMAL(10,2),
          unit_of_measure VARCHAR(20) DEFAULT 'each',

          -- Status & Lifecycle
          status VARCHAR(50) DEFAULT 'active',
          availability VARCHAR(50) DEFAULT 'available',
          discontinued BOOLEAN DEFAULT FALSE,
          new_product BOOLEAN DEFAULT FALSE,
          featured BOOLEAN DEFAULT FALSE,

          -- Data Source & Import Tracking
          source_file VARCHAR(255),
          source_sheet VARCHAR(255),
          source_row INTEGER,
          import_batch_id UUID,
          data_quality_score INTEGER DEFAULT 0,

          -- External Links & Media
          product_url TEXT,
          image_url TEXT,
          datasheet_url TEXT,

          -- Metadata
          tags TEXT[],
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),

          -- Constraints
          CONSTRAINT positive_prices CHECK (cost_price >= 0 AND retail_price >= 0),
          CONSTRAINT valid_currency CHECK (currency IN ('ZAR', 'USD', 'EUR', 'GBP'))
      );
    `;

    await client.query(createProductsSQL);
    console.log('✅ Products table created');

    // Create supporting tables
    console.log('📊 Creating supporting tables...');

    // Price History
    const priceHistorySQL = `
      CREATE TABLE IF NOT EXISTS price_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          price_type VARCHAR(50) NOT NULL,
          old_price DECIMAL(15,4),
          new_price DECIMAL(15,4) NOT NULL,
          change_percentage DECIMAL(8,4),
          effective_date TIMESTAMPTZ DEFAULT NOW(),
          reason VARCHAR(100),
          changed_by VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await client.query(priceHistorySQL);
    console.log('✅ Price history table created');

    // Import Batches
    const importBatchesSQL = `
      CREATE TABLE IF NOT EXISTS import_batches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          batch_name VARCHAR(255) NOT NULL,
          supplier_id UUID REFERENCES suppliers(id),
          source_file VARCHAR(255),
          total_records INTEGER DEFAULT 0,
          successful_imports INTEGER DEFAULT 0,
          failed_imports INTEGER DEFAULT 0,
          warnings_count INTEGER DEFAULT 0,

          status VARCHAR(50) DEFAULT 'pending',
          start_time TIMESTAMPTZ DEFAULT NOW(),
          end_time TIMESTAMPTZ,
          processing_time_seconds INTEGER,

          import_config JSONB,
          column_mappings JSONB,

          error_summary JSONB,
          validation_results JSONB,

          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await client.query(importBatchesSQL);
    console.log('✅ Import batches table created');

    // Data Validation Errors
    const validationErrorsSQL = `
      CREATE TABLE IF NOT EXISTS data_validation_errors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          import_batch_id UUID REFERENCES import_batches(id),
          product_id UUID REFERENCES products(id),
          error_type VARCHAR(100) NOT NULL,
          error_message TEXT NOT NULL,
          field_name VARCHAR(100),
          field_value TEXT,
          severity VARCHAR(20) DEFAULT 'error',
          resolved BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await client.query(validationErrorsSQL);
    console.log('✅ Data validation errors table created');

    // Supplier Import Configs
    const importConfigsSQL = `
      CREATE TABLE IF NOT EXISTS supplier_import_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
          file_pattern VARCHAR(255),
          sheet_name VARCHAR(100),
          header_row INTEGER DEFAULT 1,
          data_start_row INTEGER DEFAULT 2,

          sku_column VARCHAR(100),
          name_column VARCHAR(100),
          description_column VARCHAR(100),
          price_column VARCHAR(100),
          brand_column VARCHAR(100),
          category_column VARCHAR(100),
          stock_column VARCHAR(100),

          skip_empty_rows BOOLEAN DEFAULT TRUE,
          auto_generate_sku BOOLEAN DEFAULT FALSE,
          price_multiplier DECIMAL(10,4) DEFAULT 1.0,
          default_currency VARCHAR(3) DEFAULT 'ZAR',

          require_sku BOOLEAN DEFAULT TRUE,
          require_name BOOLEAN DEFAULT TRUE,
          require_price BOOLEAN DEFAULT TRUE,
          min_price DECIMAL(15,4) DEFAULT 0,
          max_price DECIMAL(15,4),

          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await client.query(importConfigsSQL);
    console.log('✅ Supplier import configs table created');

    // Create essential indexes
    console.log('📊 Creating indexes...');
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`,
      `CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id)`,
      `CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)`,
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
      `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`,
      `CREATE INDEX IF NOT EXISTS idx_products_cost_price ON products(cost_price)`,
      `CREATE INDEX IF NOT EXISTS idx_products_supplier_status ON products(supplier_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, effective_date)`,
      `CREATE INDEX IF NOT EXISTS idx_import_batches_supplier ON import_batches(supplier_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_suppliers_import_status ON suppliers(import_status)`,
    ];

    for (const indexSQL of indexes) {
      try {
        await client.query(indexSQL);
        console.log('✅ Index created');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('⚠️ Index already exists, skipping');
        } else {
          console.error('❌ Index error:', error.message);
        }
      }
    }

    // Create a view for product catalog
    console.log('📊 Creating product catalog view...');
    const catalogViewSQL = `
      CREATE OR REPLACE VIEW product_catalog AS
      SELECT
          p.id,
          p.sku,
          p.supplier_sku,
          p.name,
          p.description,
          p.brand,
          p.category,
          p.cost_price,
          p.retail_price,
          p.suggested_retail_price,
          p.currency,
          p.stock_status,
          p.status,
          p.created_at,
          p.updated_at,
          s.name AS supplier_name,
          s.supplier_code,
          s.performance_tier,
          CASE
              WHEN p.cost_price > 0 THEN
                  ROUND(((p.retail_price - p.cost_price) / p.cost_price * 100), 2)
              ELSE 0
          END AS markup_percentage
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.status = 'active' AND s.status = 'active';
    `;
    await client.query(catalogViewSQL);
    console.log('✅ Product catalog view created');

    // Verify schema
    console.log('\n🔍 Verifying schema...');
    const verifyResults = [];

    // Check products table
    const productsResult = await client.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'products'`
    );
    verifyResults.push(`Products table: ${productsResult.rows[0].count > 0 ? '✅' : '❌'}`);

    // Check indexes
    const indexesResult = await client.query(
      `SELECT COUNT(*) as count FROM pg_indexes WHERE tablename = 'products'`
    );
    verifyResults.push(`Product indexes: ${indexesResult.rows[0].count} created`);

    // Check enhanced supplier columns
    const supplierColumnsResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_name = 'suppliers'
      AND column_name IN ('pricelist_format', 'last_pricelist_update', 'import_status', 'total_products')
    `);
    verifyResults.push(`Enhanced supplier columns: ${supplierColumnsResult.rows[0].count}/4 added`);

    // Check view
    const viewResult = await client.query(
      `SELECT COUNT(*) as count FROM information_schema.views WHERE table_name = 'product_catalog'`
    );
    verifyResults.push(`Product catalog view: ${viewResult.rows[0].count > 0 ? '✅' : '❌'}`);

    console.log('\n📊 Schema Verification:');
    verifyResults.forEach(result => console.log(`   ${result}`));

    console.log('\n✅ Basic enhanced schema setup completed!');
    console.log('🚀 Ready for price list data import');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createBasicProductsTable().catch(console.error);
}

module.exports = { createBasicProductsTable };