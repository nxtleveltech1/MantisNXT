const {query} = require('./src/lib/database');

async function fixSupplierRules() {
  try {
    // Check current table structure
    const structure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'supplier_rules' AND table_schema = 'spp'
      ORDER BY ordinal_position
    `);
    
    console.log('Current supplier_rules structure:');
    structure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? 'DEFAULT ' + row.column_default : ''}`);
    });

    // Add missing columns
    console.log('\nAdding missing columns...');
    
    await query(`
      ALTER TABLE spp.supplier_rules 
      ADD COLUMN IF NOT EXISTS error_message_template TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS trigger_event VARCHAR(100) DEFAULT 'pricelist_upload'
    `);
    
    console.log('Columns added successfully!');

    // Verify the fix
    const updated = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'supplier_rules' AND table_schema = 'spp'
    `);
    
    console.log('\nUpdated supplier_rules structure:');
    updated.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixSupplierRules();