/**
 * Fix Inventory Data Anomaly Script
 * Diagnose and fix the issue with 3268 items showing as out of stock
 */

const { Pool } = require('pg');

// Database configuration matching the enterprise manager
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

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function analyzeInventoryAnomalies() {
  console.log('🔍 Starting inventory data anomaly analysis...');

  try {
    // First, let's check the total count and stock status distribution
    console.log('\n📊 Analyzing inventory stock status distribution...');

    const stockStatusQuery = `
      SELECT
        CASE
          WHEN current_stock <= 0 THEN 'Out of Stock'
          WHEN current_stock <= minimum_stock THEN 'Low Stock'
          ELSE 'In Stock'
        END as stock_status,
        COUNT(*) as item_count,
        ROUND(AVG(current_stock), 2) as avg_stock,
        MIN(current_stock) as min_stock,
        MAX(current_stock) as max_stock
      FROM inventory_items
      GROUP BY stock_status
      ORDER BY item_count DESC;
    `;

    const stockStatus = await query(stockStatusQuery);
    console.log('Stock Status Distribution:');
    stockStatus.rows.forEach(row => {
      console.log(`  ${row.stock_status}: ${row.item_count} items (avg: ${row.avg_stock}, min: ${row.min_stock}, max: ${row.max_stock})`);
    });

    // Check for NULL or invalid stock values
    console.log('\n🔍 Checking for data integrity issues...');

    const dataIntegrityQuery = `
      SELECT
        COUNT(*) as total_items,
        COUNT(CASE WHEN current_stock IS NULL THEN 1 END) as null_stock,
        COUNT(CASE WHEN current_stock < 0 THEN 1 END) as negative_stock,
        COUNT(CASE WHEN minimum_stock IS NULL THEN 1 END) as null_min_stock,
        COUNT(CASE WHEN minimum_stock < 0 THEN 1 END) as negative_min_stock,
        COUNT(CASE WHEN maximum_stock IS NULL THEN 1 END) as null_max_stock,
        COUNT(CASE WHEN maximum_stock < 0 THEN 1 END) as negative_max_stock
      FROM inventory_items;
    `;

    const integrity = await query(dataIntegrityQuery);
    const integrityData = integrity.rows[0];

    console.log('Data Integrity Analysis:');
    console.log(`  Total Items: ${integrityData.total_items}`);
    console.log(`  NULL current_stock: ${integrityData.null_stock}`);
    console.log(`  Negative current_stock: ${integrityData.negative_stock}`);
    console.log(`  NULL minimum_stock: ${integrityData.null_min_stock}`);
    console.log(`  Negative minimum_stock: ${integrityData.negative_min_stock}`);
    console.log(`  NULL maximum_stock: ${integrityData.null_max_stock}`);
    console.log(`  Negative maximum_stock: ${integrityData.negative_max_stock}`);

    // Check for items with 0 stock but no stock movements
    console.log('\n📦 Analyzing stock movement history...');

    const stockMovementQuery = `
      SELECT
        i.item_id,
        i.item_name,
        i.current_stock,
        i.minimum_stock,
        COUNT(sm.movement_id) as movement_count,
        MAX(sm.movement_date) as last_movement,
        SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE 0 END) as total_stock_in,
        SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END) as total_stock_out
      FROM inventory_items i
      LEFT JOIN stock_movements sm ON i.item_id = sm.item_id
      WHERE i.current_stock <= 0
      GROUP BY i.item_id, i.item_name, i.current_stock, i.minimum_stock
      ORDER BY movement_count ASC, i.current_stock ASC
      LIMIT 10;
    `;

    const stockMovements = await query(stockMovementQuery);
    console.log('Sample Out-of-Stock Items with Movement History:');
    stockMovements.rows.forEach(row => {
      console.log(`  ${row.item_name}: Stock=${row.current_stock}, Movements=${row.movement_count}, In=${row.total_stock_in || 0}, Out=${row.total_stock_out || 0}`);
    });

    // Look for inconsistencies between calculated vs actual stock
    console.log('\n🧮 Checking stock calculation consistency...');

    const consistencyQuery = `
      SELECT
        i.item_id,
        i.item_name,
        i.current_stock as recorded_stock,
        COALESCE(
          SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END),
          0
        ) as calculated_stock,
        i.current_stock - COALESCE(
          SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END),
          0
        ) as stock_difference
      FROM inventory_items i
      LEFT JOIN stock_movements sm ON i.item_id = sm.item_id
      GROUP BY i.item_id, i.item_name, i.current_stock
      HAVING ABS(i.current_stock - COALESCE(
        SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END),
        0
      )) > 0
      ORDER BY ABS(stock_difference) DESC
      LIMIT 20;
    `;

    const consistency = await query(consistencyQuery);
    console.log('Stock Calculation Inconsistencies (Top 20):');
    consistency.rows.forEach(row => {
      console.log(`  ${row.item_name}: Recorded=${row.recorded_stock}, Calculated=${row.calculated_stock}, Diff=${row.stock_difference}`);
    });

    return {
      stockStatus: stockStatus.rows,
      integrity: integrityData,
      inconsistencies: consistency.rows.length
    };

  } catch (error) {
    console.error('❌ Error analyzing inventory anomalies:', error);
    throw error;
  }
}

async function fixInventoryAnomalies() {
  console.log('\n🔧 Starting inventory anomaly fixes...');

  try {
    // Fix 1: Set NULL stock values to 0
    console.log('🔧 Fixing NULL stock values...');
    const fixNullStock = await query(`
      UPDATE inventory_items
      SET current_stock = 0
      WHERE current_stock IS NULL;
    `);
    console.log(`✅ Fixed ${fixNullStock.rowCount} items with NULL current_stock`);

    // Fix 2: Set NULL minimum stock to default value
    console.log('🔧 Fixing NULL minimum stock values...');
    const fixNullMinStock = await query(`
      UPDATE inventory_items
      SET minimum_stock = 10
      WHERE minimum_stock IS NULL;
    `);
    console.log(`✅ Fixed ${fixNullMinStock.rowCount} items with NULL minimum_stock`);

    // Fix 3: Set NULL maximum stock to reasonable default
    console.log('🔧 Fixing NULL maximum stock values...');
    const fixNullMaxStock = await query(`
      UPDATE inventory_items
      SET maximum_stock = GREATEST(minimum_stock * 10, 100)
      WHERE maximum_stock IS NULL;
    `);
    console.log(`✅ Fixed ${fixNullMaxStock.rowCount} items with NULL maximum_stock`);

    // Fix 4: Recalculate stock for items with discrepancies
    console.log('🔧 Recalculating stock based on movements...');
    const recalculateStock = await query(`
      WITH calculated_stock AS (
        SELECT
          i.item_id,
          COALESCE(
            SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END),
            0
          ) as new_stock
        FROM inventory_items i
        LEFT JOIN stock_movements sm ON i.item_id = sm.item_id
        GROUP BY i.item_id
      )
      UPDATE inventory_items
      SET current_stock = cs.new_stock,
          updated_at = NOW()
      FROM calculated_stock cs
      WHERE inventory_items.item_id = cs.item_id
        AND inventory_items.current_stock != cs.new_stock;
    `);
    console.log(`✅ Recalculated stock for ${recalculateStock.rowCount} items`);

    // Fix 5: Add initial stock movement for items with no movements but positive stock
    console.log('🔧 Adding initial stock movements for orphaned stock...');
    const addInitialMovements = await query(`
      INSERT INTO stock_movements (item_id, movement_type, quantity, movement_date, reason, reference_number)
      SELECT
        i.item_id,
        'IN' as movement_type,
        i.current_stock as quantity,
        NOW() as movement_date,
        'Initial stock correction - data migration' as reason,
        'CORRECTION-' || i.item_id as reference_number
      FROM inventory_items i
      LEFT JOIN stock_movements sm ON i.item_id = sm.item_id
      WHERE sm.item_id IS NULL
        AND i.current_stock > 0
      GROUP BY i.item_id, i.current_stock;
    `);
    console.log(`✅ Added initial movements for ${addInitialMovements.rowCount} items`);

    return {
      nullStockFixed: fixNullStock.rowCount,
      nullMinStockFixed: fixNullMinStock.rowCount,
      nullMaxStockFixed: fixNullMaxStock.rowCount,
      stockRecalculated: recalculateStock.rowCount,
      initialMovementsAdded: addInitialMovements.rowCount
    };

  } catch (error) {
    console.error('❌ Error fixing inventory anomalies:', error);
    throw error;
  }
}

async function validateFixes() {
  console.log('\n✅ Validating inventory fixes...');

  try {
    // Re-check stock status after fixes
    const finalStockStatus = await query(`
      SELECT
        CASE
          WHEN current_stock <= 0 THEN 'Out of Stock'
          WHEN current_stock <= minimum_stock THEN 'Low Stock'
          ELSE 'In Stock'
        END as stock_status,
        COUNT(*) as item_count
      FROM inventory_items
      GROUP BY stock_status
      ORDER BY item_count DESC;
    `);

    console.log('Final Stock Status Distribution:');
    finalStockStatus.rows.forEach(row => {
      console.log(`  ${row.stock_status}: ${row.item_count} items`);
    });

    // Check remaining data integrity issues
    const finalIntegrity = await query(`
      SELECT
        COUNT(*) as total_items,
        COUNT(CASE WHEN current_stock IS NULL THEN 1 END) as null_stock,
        COUNT(CASE WHEN current_stock < 0 THEN 1 END) as negative_stock,
        COUNT(CASE WHEN minimum_stock IS NULL THEN 1 END) as null_min_stock
      FROM inventory_items;
    `);

    const finalData = finalIntegrity.rows[0];
    console.log('\nFinal Data Integrity:');
    console.log(`  Total Items: ${finalData.total_items}`);
    console.log(`  NULL stock: ${finalData.null_stock}`);
    console.log(`  Negative stock: ${finalData.negative_stock}`);
    console.log(`  NULL minimum stock: ${finalData.null_min_stock}`);

    return finalStockStatus.rows;

  } catch (error) {
    console.error('❌ Error validating fixes:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Inventory Data Anomaly Fix Process...\n');

    // Step 1: Analyze the current state
    const analysis = await analyzeInventoryAnomalies();

    // Step 2: Apply fixes
    const fixes = await fixInventoryAnomalies();

    // Step 3: Validate the fixes
    const validation = await validateFixes();

    console.log('\n📊 Summary Report:');
    console.log('='.repeat(50));
    console.log(`NULL stock values fixed: ${fixes.nullStockFixed}`);
    console.log(`NULL minimum stock fixed: ${fixes.nullMinStockFixed}`);
    console.log(`NULL maximum stock fixed: ${fixes.nullMaxStockFixed}`);
    console.log(`Stock values recalculated: ${fixes.stockRecalculated}`);
    console.log(`Initial movements added: ${fixes.initialMovementsAdded}`);
    console.log(`Data inconsistencies found: ${analysis.inconsistencies}`);

    console.log('\n✅ Inventory data anomaly fix completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error in inventory fix process:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  analyzeInventoryAnomalies,
  fixInventoryAnomalies,
  validateFixes
};