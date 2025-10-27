const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function applyFix() {
  try {
    console.log('📋 Reading corrected migration file...');
    const sql = fs.readFileSync('database/migrations/neon/001_fix_public_views.sql', 'utf8');

    console.log('🔧 Applying view fixes with correct column names...');
    await pool.query(sql);

    console.log('✅ Views recreated successfully!');
    console.log('\n🧪 Testing fixed views...');

    // Test inventory_items
    const invTest = await pool.query('SELECT id, sku, stock_qty, reserved_qty, available_qty, cost_price, sale_price FROM inventory_items LIMIT 1');
    console.log('✓ inventory_items test:');
    console.log('  Columns:', Object.keys(invTest.rows[0]).join(', '));
    console.log('  Sample:', invTest.rows[0].sku, '-', invTest.rows[0].stock_qty, 'units');

    // Test suppliers
    const suppTest = await pool.query('SELECT id, name, status, preferred_supplier, rating FROM suppliers LIMIT 1');
    console.log('\n✓ suppliers test:');
    console.log('  Columns:', Object.keys(suppTest.rows[0]).join(', '));
    console.log('  Sample:', suppTest.rows[0].name, '-', suppTest.rows[0].status);

    // Test row counts
    const invCount = await pool.query('SELECT COUNT(*) as count FROM inventory_items');
    const suppCount = await pool.query('SELECT COUNT(*) as count FROM suppliers');
    const moveCount = await pool.query('SELECT COUNT(*) as count FROM stock_movements');

    console.log('\n📊 Record counts:');
    console.log('  inventory_items:', invCount.rows[0].count);
    console.log('  suppliers:', suppCount.rows[0].count);
    console.log('  stock_movements:', moveCount.rows[0].count);

    await pool.end();
    console.log('\n🎉 MIGRATION SUCCESSFUL - All views fixed!');
    console.log('✅ Ready to test API endpoints');
  } catch (err) {
    console.error('❌ MIGRATION FAILED:', err.message);
    console.error('Details:', err.detail || err.hint || '');
    await pool.end();
    process.exit(1);
  }
}

applyFix();
