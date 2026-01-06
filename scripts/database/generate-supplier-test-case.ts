#!/usr/bin/env bun
/**
 * Generic Supplier Test Case Generator
 * 
 * Generates test case reports for any supplier comparing:
 * - SKU
 * - Product Name
 * - SUP SOH (Supplier Stock on Hand from online sync)
 * - Online Sync Price (Price from online sync)
 * - NXT SOH (NXT internal stock on hand)
 * - NXT PRICE (NXT internal price)
 * 
 * Usage:
 *   bun scripts/database/generate-supplier-test-case.ts <supplier-name> [--limit N] [--output file]
 */

import { query as dbQuery } from '../../src/lib/database/unified-connection';
import { writeFileSync } from 'fs';

/**
 * Generate CSV report
 */
function generateCSVReport(data: TestCaseRow[]): string {
  const headers = ['SKU', 'Product Name', 'SUP SOH', 'Online Sync Price', 'NXT SOH', 'NXT PRICE'];
  const rows: string[] = [headers.join(',')];

  for (const row of data) {
    const sku = `"${(row.sku || '').replace(/"/g, '""')}"`;
    const productName = `"${(row.product_name || '').replace(/"/g, '""')}"`;
    const supSoh = row.sup_soh !== null ? String(row.sup_soh) : '';
    const syncPrice = row.online_sync_price !== null ? Number(row.online_sync_price).toFixed(2) : '';
    const nxtSoh = row.nxt_soh !== null ? String(row.nxt_soh) : '';
    const nxtPrice = row.nxt_price !== null ? Number(row.nxt_price).toFixed(2) : '';

    rows.push([sku, productName, supSoh, syncPrice, nxtSoh, nxtPrice].join(','));
  }

  return rows.join('\n');
}

interface TestCaseRow {
  sku: string;
  product_name: string;
  sup_soh: number | null;
  online_sync_price: number | null;
  nxt_soh: number | null;
  nxt_price: number | null;
}

/**
 * Find supplier by name
 */
async function findSupplier(name: string): Promise<{ supplier_id: string; name: string } | null> {
  const result = await dbQuery<{ supplier_id: string; name: string }>(
    `SELECT supplier_id, name
     FROM core.supplier 
     WHERE LOWER(name) LIKE LOWER($1) OR LOWER(code) LIKE LOWER($1)
     LIMIT 1`,
    [`%${name}%`]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Get supplier test case data
 */
async function getSupplierTestData(supplierId: string, limit?: number): Promise<TestCaseRow[]> {
  const sql = `
    WITH current_prices AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        price,
        currency,
        valid_from,
        change_reason
      FROM core.price_history
      WHERE is_current = true
      ORDER BY supplier_product_id, valid_from DESC
    ),
    latest_stock AS (
      SELECT DISTINCT ON (supplier_product_id)
        supplier_product_id,
        qty AS qty_on_hand,
        unit_cost,
        as_of_ts
      FROM core.stock_on_hand
      ORDER BY supplier_product_id, as_of_ts DESC
    ),
    sync_prices AS (
      SELECT DISTINCT ON (ph.supplier_product_id)
        ph.supplier_product_id,
        ph.price AS sync_price,
        ph.change_reason
      FROM core.price_history ph
      WHERE ph.change_reason = 'JSON feed sync'
        OR ph.change_reason LIKE '%sync%'
        OR ph.change_reason LIKE '%PlusPortal%'
      ORDER BY ph.supplier_product_id, ph.valid_from DESC
    )
    SELECT 
      sp.supplier_sku AS sku,
      sp.name_from_supplier AS product_name,
      -- SUP SOH: Direct value from online sync (attrs_json->>'stock_quantity' or sup_soh)
      COALESCE(
        (sp.attrs_json->>'stock_quantity')::int,
        (sp.attrs_json->>'stock')::int,
        (sp.attrs_json->>'sup_soh')::int,
        NULL
      ) AS sup_soh,
      -- Online Sync Price: from price_history with sync reason, or from attrs_json cost_excluding
      COALESCE(
        (SELECT sync_price FROM sync_prices WHERE sync_prices.supplier_product_id = sp.supplier_product_id),
        (sp.attrs_json->>'cost_excluding')::numeric,
        cp.price,
        NULL
      ) AS online_sync_price,
      -- NXT SOH: What our platform shows for SUP SOH (same logic as /api/catalog/products)
      COALESCE(
        (sp.attrs_json->>'stock_quantity')::int,
        (sp.attrs_json->>'stock')::int,
        (sp.attrs_json->>'sup_soh')::int,
        ls.qty_on_hand,
        NULL
      ) AS nxt_soh,
      -- NXT PRICE: from price_history (our internal price - what platform shows)
      cp.price AS nxt_price
    FROM core.supplier_product sp
    LEFT JOIN current_prices cp ON cp.supplier_product_id = sp.supplier_product_id
    LEFT JOIN latest_stock ls ON ls.supplier_product_id = sp.supplier_product_id
    WHERE sp.supplier_id = $1
      AND sp.is_active = true
    ORDER BY sp.supplier_sku
    ${limit ? `LIMIT ${limit}` : ''}
  `;
  
  const result = await dbQuery<TestCaseRow>(sql, [supplierId]);
  return result.rows;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(data: TestCaseRow[], supplierName: string): string {
  const timestamp = new Date().toISOString();
  const totalProducts = data.length;
  const withSupSoh = data.filter(r => r.sup_soh !== null).length;
  const withSyncPrice = data.filter(r => r.online_sync_price !== null).length;
  const withNxtSoh = data.filter(r => r.nxt_soh !== null).length;
  const withNxtPrice = data.filter(r => r.nxt_price !== null).length;

  const safeSupplierName = supplierName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  let md = `# ${supplierName} Test Case Report\n\n`;
  md += `**Generated:** ${timestamp}\n`;
  md += `**Supplier:** ${supplierName}\n`;
  md += `**Total Products:** ${totalProducts}\n\n`;

  md += `## Summary Statistics\n\n`;
  md += `| Metric | Count | Percentage |\n`;
  md += `|--------|-------|------------|\n`;
  md += `| Products with SUP SOH | ${withSupSoh} | ${totalProducts > 0 ? ((withSupSoh / totalProducts) * 100).toFixed(1) : 0}% |\n`;
  md += `| Products with Online Sync Price | ${withSyncPrice} | ${totalProducts > 0 ? ((withSyncPrice / totalProducts) * 100).toFixed(1) : 0}% |\n`;
  md += `| Products with NXT SOH | ${withNxtSoh} | ${totalProducts > 0 ? ((withNxtSoh / totalProducts) * 100).toFixed(1) : 0}% |\n`;
  md += `| Products with NXT Price | ${withNxtPrice} | ${totalProducts > 0 ? ((withNxtPrice / totalProducts) * 100).toFixed(1) : 0}% |\n\n`;

  md += `## Test Case Data\n\n`;
  md += `| SKU | Product Name | SUP SOH | Online Sync Price | NXT SOH | NXT PRICE |\n`;
  md += `|-----|-------------|---------|-------------------|---------|-----------|\n`;

  for (const row of data) {
    const sku = row.sku || '-';
    const productName = (row.product_name || '-').replace(/\|/g, '\\|').substring(0, 50);
    const supSoh = row.sup_soh !== null ? String(row.sup_soh) : '-';
    const syncPrice = row.online_sync_price !== null ? `R ${Number(row.online_sync_price).toFixed(2)}` : '-';
    const nxtSoh = row.nxt_soh !== null ? String(row.nxt_soh) : '-';
    const nxtPrice = row.nxt_price !== null ? `R ${Number(row.nxt_price).toFixed(2)}` : '-';

    md += `| ${sku} | ${productName} | ${supSoh} | ${syncPrice} | ${nxtSoh} | ${nxtPrice} |\n`;
  }

  md += `\n## Data Comparison Analysis\n\n`;

  // Count mismatches
  const sohMismatches = data.filter(r => 
    r.sup_soh !== null && r.nxt_soh !== null && r.sup_soh !== r.nxt_soh
  ).length;
  const priceMismatches = data.filter(r => 
    r.online_sync_price !== null && r.nxt_price !== null && 
    Math.abs(Number(r.online_sync_price || 0) - Number(r.nxt_price || 0)) > 0.01
  ).length;

  md += `### Stock Comparison\n`;
  md += `- Products with matching SUP SOH and NXT SOH: ${totalProducts - sohMismatches}\n`;
  md += `- Products with mismatched stock: ${sohMismatches}\n\n`;

  md += `### Price Comparison\n`;
  md += `- Products with matching prices: ${totalProducts - priceMismatches}\n`;
  md += `- Products with price differences: ${priceMismatches}\n\n`;

  // Show sample mismatches
  if (sohMismatches > 0) {
    md += `### Sample Stock Mismatches\n\n`;
    md += `| SKU | Product Name | SUP SOH | NXT SOH | Difference |\n`;
    md += `|-----|-------------|---------|---------|------------|\n`;
    
    const mismatches = data
      .filter(r => r.sup_soh !== null && r.nxt_soh !== null && r.sup_soh !== r.nxt_soh)
      .slice(0, 10);
    
    for (const row of mismatches) {
      const diff = (row.nxt_soh || 0) - (row.sup_soh || 0);
      md += `| ${row.sku} | ${(row.product_name || '').substring(0, 40)} | ${row.sup_soh} | ${row.nxt_soh} | ${diff > 0 ? '+' : ''}${diff} |\n`;
    }
    md += `\n`;
  }

  if (priceMismatches > 0) {
    md += `### Sample Price Mismatches\n\n`;
    md += `| SKU | Product Name | Online Sync Price | NXT PRICE | Difference |\n`;
    md += `|-----|-------------|-------------------|-----------|------------|\n`;
    
    const mismatches = data
      .filter(r => 
        r.online_sync_price !== null && r.nxt_price !== null && 
        Math.abs(Number(r.online_sync_price || 0) - Number(r.nxt_price || 0)) > 0.01
      )
      .slice(0, 10);
    
    for (const row of mismatches) {
      const syncPrice = Number(row.online_sync_price || 0);
      const nxtPrice = Number(row.nxt_price || 0);
      const diff = nxtPrice - syncPrice;
      md += `| ${row.sku} | ${(row.product_name || '').substring(0, 40)} | R ${syncPrice.toFixed(2)} | R ${nxtPrice.toFixed(2)} | ${diff > 0 ? '+' : ''}R ${Math.abs(diff).toFixed(2)} |\n`;
    }
    md += `\n`;
  }

  return md;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: Supplier name is required');
    console.error('Usage: bun scripts/database/generate-supplier-test-case.ts <supplier-name> [--limit=N] [--output=file]');
    process.exit(1);
  }

  const supplierNameArg = args.find(arg => !arg.startsWith('--')) || args[0];
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const outputArg = args.find(arg => arg.startsWith('--output='));
  const baseFilename = outputArg 
    ? outputArg.split('=')[1].replace(/\.(md|csv)$/, '')
    : `${supplierNameArg.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-test-case-${new Date().toISOString().split('T')[0]}`;
  const mdOutputFile = `${baseFilename}.md`;
  const csvOutputFile = `${baseFilename}.csv`;

  console.log(`🔍 Supplier Test Case Report Generator\n`);
  console.log('='.repeat(70) + '\n');

  try {
    // Find supplier
    const supplier = await findSupplier(supplierNameArg);
    if (!supplier) {
      throw new Error(`Supplier matching "${supplierNameArg}" not found in database`);
    }

    console.log(`✅ Found supplier: ${supplier.name} (ID: ${supplier.supplier_id})\n`);

    // Get test data
    console.log(`📊 Querying test case data${limit ? ` (limit: ${limit})` : ''}...\n`);
    const testData = await getSupplierTestData(supplier.supplier_id, limit);

    console.log(`✅ Retrieved ${testData.length} products\n`);

    // Generate markdown report
    console.log('📝 Generating markdown report...\n');
    const markdown = generateMarkdownReport(testData, supplier.name);
    writeFileSync(mdOutputFile, markdown, 'utf-8');
    console.log(`✅ Markdown report saved to: ${mdOutputFile}\n`);

    // Generate CSV report
    console.log('📝 Generating CSV report...\n');
    const csv = generateCSVReport(testData);
    writeFileSync(csvOutputFile, csv, 'utf-8');
    console.log(`✅ CSV report saved to: ${csvOutputFile}\n`);

    // Print summary to console
    console.log('📊 Summary:');
    console.log(`   Total Products: ${testData.length}`);
    console.log(`   With SUP SOH: ${testData.filter(r => r.sup_soh !== null).length}`);
    console.log(`   With Online Sync Price: ${testData.filter(r => r.online_sync_price !== null).length}`);
    console.log(`   With NXT SOH: ${testData.filter(r => r.nxt_soh !== null).length}`);
    console.log(`   With NXT Price: ${testData.filter(r => r.nxt_price !== null).length}\n`);

    console.log('✅ Test case report generated successfully!\n');
  } catch (error) {
    console.error('❌ Error generating test case report:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

