#!/usr/bin/env bun
import { Client } from 'pg';

const locationId = '22843b8b-aba5-4da7-899b-068226283726';

async function verify() {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL 
  });
  
  await client.connect();
  
  const result = await client.query(
    `SELECT COUNT(*) as total, SUM(qty) as total_qty, AVG(qty) as avg_qty
     FROM core.stock_on_hand 
     WHERE location_id = $1`,
    [locationId]
  );
  
  console.log('Stock on Hand Summary:');
  console.log(JSON.stringify(result.rows[0], null, 2));
  
  const sampleResult = await client.query(
    `SELECT sp.supplier_sku, sp.name_from_supplier, soh.qty, soh.unit_cost
     FROM core.stock_on_hand soh
     JOIN core.supplier_product sp ON sp.supplier_product_id = soh.supplier_product_id
     WHERE soh.location_id = $1
     ORDER BY soh.qty DESC
     LIMIT 10`,
    [locationId]
  );
  
  console.log('\nTop 10 Products by Stock Quantity:');
  sampleResult.rows.forEach((row, idx) => {
    console.log(`${idx + 1}. ${row.supplier_sku} - ${row.name_from_supplier.substring(0, 50)}... - Qty: ${row.qty}, Cost: R${row.unit_cost || 'N/A'}`);
  });
  
  await client.end();
}

verify();


