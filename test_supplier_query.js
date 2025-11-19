const {query} = require('./lib/database/connection');

async function findDecksaver() {
  try {
    const result = await query(`
      SELECT supplier_id, supplier_name 
      FROM spp.suppliers 
      WHERE supplier_name ILIKE '%decksaver%' 
      LIMIT 5
    `);
    console.log('Found suppliers:', result.rows);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findDecksaver();