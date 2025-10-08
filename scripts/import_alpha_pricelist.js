#!/usr/bin/env node

const { Pool } = require('pg');
const xlsx = require('xlsx');
const path = require('path');

// Database configuration
const dbConfig = {
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false
};

const UPLOADS_DIR = 'K:\\00Project\\MantisNXT\\database\\Uploads\\drive-download-20250904T012253Z-1-001';

async function importAlphaPricelist() {
  const pool = new Pool(dbConfig);
  let client;

  try {
    client = await pool.connect();
    console.log('✅ Connected to database');

    // Find or create Alpha Technologies supplier
    const supplierResult = await findOrCreateSupplier(client, 'Alpha Technologies');
    const supplierId = supplierResult.id;
    console.log(`📊 Using supplier: ${supplierResult.name} (${supplierId})`);

    // Initialize import batch - generate proper UUID
    const batchId = generateUUID();
    await initializeImportBatch(client, batchId, supplierId, 'Alpha-Technologies-Pricelist-August-2025- (2).xlsx');

    const startTime = Date.now();

    // Parse Alpha Technologies price list
    const filePath = path.join(UPLOADS_DIR, 'Alpha-Technologies-Pricelist-August-2025- (2).xlsx');
    const workbook = xlsx.readFile(filePath);

    console.log('📋 Available sheets:', workbook.SheetNames);

    // Process key sheets with product data
    const sheetsToProcess = [
      'Alfatron Audio',
      'Audio-Technica',
      'Beyerdynamic',
      'Bose Professional'
    ];

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const sheetName of sheetsToProcess) {
      if (!workbook.SheetNames.includes(sheetName)) {
        console.log(`⚠️ Sheet '${sheetName}' not found, skipping`);
        continue;
      }

      console.log(`\n📊 Processing sheet: ${sheetName}`);

      const result = await processSheet(client, workbook, sheetName, supplierId, batchId);
      totalProcessed += result.processed;
      totalSuccess += result.success;
      totalFailed += result.failed;

      console.log(`✅ Sheet completed: ${result.success} success, ${result.failed} failed`);
    }

    // Complete import batch
    const processingTimeMs = Date.now() - startTime;
    await completeImportBatch(client, batchId, totalProcessed, totalSuccess, totalFailed, processingTimeMs);

    // Update supplier statistics
    await updateSupplierStats(client, supplierId);

    console.log('\n📊 IMPORT COMPLETED');
    console.log(`⏱️ Processing time: ${Math.round(processingTimeMs / 1000)}s`);
    console.log(`📈 Total processed: ${totalProcessed}`);
    console.log(`✅ Successful: ${totalSuccess}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`🎯 Success rate: ${Math.round(totalSuccess / totalProcessed * 100)}%`);

    // Show sample results
    await showSampleResults(client, supplierId);

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

async function findOrCreateSupplier(client, supplierName) {
  // Check if supplier exists
  let result = await client.query(
    `SELECT id, name FROM suppliers WHERE name ILIKE $1`,
    [`%${supplierName}%`]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Create new supplier
  result = await client.query(`
    INSERT INTO suppliers (name, supplier_code, status, performance_tier, primary_category, import_status)
    VALUES ($1, $2, 'active', 'unrated', 'Electronics', 'processing')
    RETURNING id, name
  `, [supplierName, supplierName.toUpperCase().replace(/\s+/g, '_')]);

  console.log(`✅ Created new supplier: ${supplierName}`);
  return result.rows[0];
}

async function initializeImportBatch(client, batchId, supplierId, fileName) {
  await client.query(`
    INSERT INTO import_batches (id, batch_name, supplier_id, source_file, status)
    VALUES ($1, $2, $3, $4, 'processing')
  `, [batchId, `Alpha Technologies Import - ${fileName}`, supplierId, fileName]);
}

async function processSheet(client, workbook, sheetName, supplierId, batchId) {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (jsonData.length < 2) {
    console.log(`⚠️ Sheet ${sheetName} has insufficient data`);
    return { processed: 0, success: 0, failed: 0 };
  }

  // Find headers row (look for MODEL, DESCRIPTION, PRICE patterns)
  let headerRowIndex = -1;
  let dataStartIndex = -1;

  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    if (Array.isArray(row)) {
      const rowStr = row.join(' ').toLowerCase();
      if (rowStr.includes('model') || rowStr.includes('sku') || rowStr.includes('description')) {
        headerRowIndex = i;
        dataStartIndex = i + 1;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    console.log(`❌ Could not find header row in sheet ${sheetName}`);
    return { processed: 0, success: 0, failed: 0 };
  }

  const headers = jsonData[headerRowIndex];
  console.log(`📋 Headers found at row ${headerRowIndex + 1}:`, headers.slice(0, 5));

  // Auto-detect columns
  const columnMapping = detectColumns(headers);
  console.log(`🎯 Column mapping:`, columnMapping);

  // Process data rows
  let processed = 0;
  let success = 0;
  let failed = 0;

  for (let i = dataStartIndex; i < jsonData.length; i++) {
    const row = jsonData[i];

    if (isEmptyRow(row)) continue;

    processed++;

    try {
      const product = mapRowToProduct(row, columnMapping, sheetName, i + 1);

      if (!product.name || !product.sku) {
        failed++;
        continue;
      }

      await insertProduct(client, product, supplierId, batchId);
      success++;

    } catch (error) {
      console.error(`❌ Row ${i + 1} error:`, error.message);
      failed++;
    }
  }

  return { processed, success, failed };
}

function detectColumns(headers) {
  const mapping = {};

  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).toLowerCase();

    if (!mapping.sku && (header.includes('model') || header.includes('sku') || header.includes('code'))) {
      mapping.sku = i;
    }
    if (!mapping.name && (header.includes('description') || header.includes('name') || header.includes('product'))) {
      mapping.name = i;
    }
    if (!mapping.price && (header.includes('price') || header.includes('retail') || header.includes('cost'))) {
      mapping.price = i;
    }
    if (!mapping.brand && header.includes('brand')) {
      mapping.brand = i;
    }
  }

  return mapping;
}

function mapRowToProduct(row, mapping, sheetName, rowNumber) {
  return {
    sku: cleanValue(row[mapping.sku]),
    name: cleanValue(row[mapping.name]),
    description: cleanValue(row[mapping.name]), // Use name as description if separate description not available
    brand: cleanValue(row[mapping.brand]) || 'Alpha Technologies',
    category: sheetName.replace(/\s+/g, ' '),
    costPrice: parsePrice(row[mapping.price]),
    retailPrice: parsePrice(row[mapping.price]) * 1.2, // Assume 20% markup for retail
    currency: 'ZAR',
    stockStatus: 'available',
    sourceSheet: sheetName,
    sourceRow: rowNumber
  };
}

function cleanValue(value) {
  if (!value || value === '') return null;
  return String(value).trim();
}

function parsePrice(priceValue) {
  if (!priceValue) return 0;

  const cleanPrice = String(priceValue).replace(/[^\d.,]/g, '');
  const price = parseFloat(cleanPrice.replace(',', '.'));

  return isNaN(price) ? 0 : price;
}

function isEmptyRow(row) {
  if (!Array.isArray(row)) return true;
  return row.every(cell => !cell || String(cell).trim() === '');
}

async function insertProduct(client, product, supplierId, batchId) {
  // Check if product already exists
  const existingResult = await client.query(
    `SELECT id FROM products WHERE sku = $1 AND supplier_id = $2`,
    [product.sku, supplierId]
  );

  if (existingResult.rows.length > 0) {
    // Update existing product
    await client.query(`
      UPDATE products SET
        name = $1,
        description = $2,
        brand = $3,
        category = $4,
        cost_price = $5,
        retail_price = $6,
        updated_at = NOW(),
        data_quality_score = $7
      WHERE id = $8
    `, [
      product.name,
      product.description,
      product.brand,
      product.category,
      product.costPrice,
      product.retailPrice,
      calculateQualityScore(product),
      existingResult.rows[0].id
    ]);
  } else {
    // Insert new product
    await client.query(`
      INSERT INTO products (
        sku, supplier_sku, name, description, brand, category,
        cost_price, retail_price, currency, stock_status,
        supplier_id, import_batch_id, source_sheet, source_row,
        status, data_quality_score
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15
      )
    `, [
      product.sku,
      product.sku, // Use same as supplier_sku
      product.name,
      product.description,
      product.brand,
      product.category,
      product.costPrice,
      product.retailPrice,
      product.currency,
      product.stockStatus,
      supplierId,
      batchId,
      product.sourceSheet,
      product.sourceRow,
      calculateQualityScore(product)
    ]);
  }
}

function calculateQualityScore(product) {
  let score = 0;
  if (product.sku) score += 20;
  if (product.name) score += 20;
  if (product.description && product.description.length > 10) score += 15;
  if (product.costPrice > 0) score += 15;
  if (product.brand) score += 10;
  if (product.category) score += 10;
  if (product.retailPrice > 0) score += 10;
  return score;
}

async function completeImportBatch(client, batchId, totalRecords, successful, failed, processingTimeMs) {
  await client.query(`
    UPDATE import_batches SET
      status = 'completed',
      total_records = $1,
      successful_imports = $2,
      failed_imports = $3,
      end_time = NOW(),
      processing_time_seconds = $4
    WHERE id = $5
  `, [totalRecords, successful, failed, Math.round(processingTimeMs / 1000), batchId]);
}

async function updateSupplierStats(client, supplierId) {
  await client.query(`
    UPDATE suppliers SET
      total_products = (
        SELECT COUNT(*) FROM products WHERE supplier_id = $1 AND status = 'active'
      ),
      last_pricelist_update = NOW(),
      import_status = 'completed'
    WHERE id = $1
  `, [supplierId]);
}

async function showSampleResults(client, supplierId) {
  console.log('\n📊 SAMPLE IMPORTED PRODUCTS:');

  const result = await client.query(`
    SELECT sku, name, brand, category, cost_price, retail_price, data_quality_score
    FROM products
    WHERE supplier_id = $1 AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 10
  `, [supplierId]);

  result.rows.forEach((product, index) => {
    console.log(`${index + 1}. ${product.sku} - ${product.name}`);
    console.log(`   Brand: ${product.brand} | Category: ${product.category}`);
    console.log(`   Price: R${product.cost_price} (Retail: R${product.retail_price}) | Quality: ${product.data_quality_score}/100`);
    console.log('');
  });

  // Show statistics
  const statsResult = await client.query(`
    SELECT
      COUNT(*) as total_products,
      AVG(cost_price) as avg_cost,
      MIN(cost_price) as min_cost,
      MAX(cost_price) as max_cost,
      AVG(data_quality_score) as avg_quality,
      COUNT(DISTINCT brand) as unique_brands,
      COUNT(DISTINCT category) as unique_categories
    FROM products
    WHERE supplier_id = $1 AND status = 'active'
  `, [supplierId]);

  const stats = statsResult.rows[0];
  console.log('📈 IMPORT STATISTICS:');
  console.log(`   Total Products: ${stats.total_products}`);
  console.log(`   Average Cost: R${parseFloat(stats.avg_cost || 0).toFixed(2)}`);
  console.log(`   Price Range: R${stats.min_cost} - R${stats.max_cost}`);
  console.log(`   Average Quality Score: ${parseFloat(stats.avg_quality || 0).toFixed(1)}/100`);
  console.log(`   Unique Brands: ${stats.unique_brands}`);
  console.log(`   Unique Categories: ${stats.unique_categories}`);
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Run if called directly
if (require.main === module) {
  importAlphaPricelist().catch(console.error);
}

module.exports = { importAlphaPricelist };