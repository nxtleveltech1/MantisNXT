const { Pool } = require('pg');

const pool = new Pool({
  user: "nxtdb_admin",
  password: "P@33w0rd-1",
  host: "62.169.20.53",
  port: 6600,
  database: "nxtprod-db_001",
  ssl: false,
});

async function insertSamplePricelist() {
  const client = await pool.connect();

  try {
    console.log('🔧 Inserting sample pricelist data...');

    // Get first supplier
    const supplierResult = await client.query('SELECT id, name FROM suppliers LIMIT 1');

    if (supplierResult.rows.length === 0) {
      console.log('❌ No suppliers found. Please insert suppliers first.');
      return;
    }

    const supplier = supplierResult.rows[0];
    console.log(`📦 Using supplier: ${supplier.name} (${supplier.id})`);

    // Insert sample pricelist
    const pricelistResult = await client.query(`
      INSERT INTO supplier_pricelists (
        supplier_id, name, description, effective_from, effective_to,
        currency, is_active, version, approval_status, approved_by,
        approved_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11
      ) RETURNING *
    `, [
      supplier.id,
      'Q4 2024 Standard Pricing',
      'Standard pricing for Q4 2024 with volume discounts',
      '2024-10-01',
      '2024-12-31',
      'USD',
      true,
      '1.0',
      'approved',
      'procurement@company.com',
      'system@company.com'
    ]);

    const pricelist = pricelistResult.rows[0];
    console.log(`✅ Created pricelist: ${pricelist.name} (${pricelist.id})`);

    // Insert sample items
    const sampleItems = [
      {
        sku: 'SAMPLE-GTR-001',
        supplier_sku: 'GTR-ACOU-001',
        unit_price: 899.99,
        minimum_quantity: 1,
        maximum_quantity: 10,
        lead_time_days: 14,
        notes: 'Acoustic guitar with solid spruce top'
      },
      {
        sku: 'SAMPLE-AMP-001',
        supplier_sku: 'AMP-TUBE-50W',
        unit_price: 1299.99,
        minimum_quantity: 1,
        maximum_quantity: 5,
        lead_time_days: 21,
        notes: '50W tube amplifier with vintage tone'
      },
      {
        sku: 'SAMPLE-MIC-001',
        supplier_sku: 'MIC-COND-001',
        unit_price: 249.99,
        minimum_quantity: 2,
        maximum_quantity: 20,
        lead_time_days: 7,
        notes: 'Professional condenser microphone'
      }
    ];

    let itemCount = 0;
    for (const item of sampleItems) {
      await client.query(`
        INSERT INTO pricelist_items (
          pricelist_id, sku, supplier_sku, unit_price, minimum_quantity,
          maximum_quantity, lead_time_days, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        pricelist.id,
        item.sku,
        item.supplier_sku,
        item.unit_price,
        item.minimum_quantity,
        item.maximum_quantity,
        item.lead_time_days,
        item.notes
      ]);
      itemCount++;
      console.log(`  ✅ Added item: ${item.sku} - $${item.unit_price}`);
    }

    console.log(`\n🎉 Sample data inserted successfully!`);
    console.log(`   📋 1 pricelist created`);
    console.log(`   📦 ${itemCount} items added`);

  } catch (error) {
    console.error('❌ Error inserting sample data:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

insertSamplePricelist();