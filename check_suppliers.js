const {query} = require('./src/lib/database/index.ts');

async function checkSuppliers() {
  try {
    // Check supplier table structure
    const structure = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'suppliers' AND table_schema = 'spp'
    `);
    console.log('Supplier table structure:');
    structure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    // Check if any suppliers exist
    const suppliers = await query(`
      SELECT supplier_id, supplier_name 
      FROM spp.suppliers 
      LIMIT 5
    `);
    console.log('\nExisting suppliers:');
    suppliers.rows.forEach(row => {
      console.log(`  ${row.supplier_id}: ${row.supplier_name}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSuppliers();