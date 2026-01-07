#!/usr/bin/env bun
/**
 * Audit PlusPortal Suppliers for Mislinked Products
 * 
 * Checks all suppliers that use PlusPortal sync for products
 * that don't belong based on SKU prefix patterns.
 */

import 'dotenv/config';
import { query } from '../../src/lib/database/unified-connection';

// Known SKU prefix to brand mappings
const SKU_PREFIX_BRANDS: Record<string, string> = {
  'SEN': 'Sennheiser',
  'NEM': 'Neumann',
  'SON': 'Sonova',
  'AUA': 'Audac',
  'AMP': 'Amphenol',
  'ATL': 'Atlona',
  'AID': 'Aida Imaging',
  'APT': 'Appotronics',
  'ADA': 'Adam Hall',
  'ADP': 'Audinate',
  'VAR': 'Varta',
  'AVA': 'Avast',
  'NIC': 'Nichiban',
  'SP': 'Stage Plus',
  'AMD': 'Active Music Distribution',
  'SAW': 'Stage Audio Works',
  'AVD': 'AV Distribution',
  'STO': 'Stage One',
  'BEH': 'Behringer',
  'SHU': 'Shure',
  'YAM': 'Yamaha',
  'MAC': 'Mackie',
  'JBL': 'JBL',
  'CRO': 'Crown',
  'DBX': 'DBX',
  'AKG': 'AKG',
  'HAR': 'Harman',
  'BSS': 'BSS',
  'LEX': 'Lexicon',
  'DIG': 'DiGiCo',
  'ALL': 'Allen & Heath',
  'MID': 'Midas',
  'KLA': 'Klark Teknik',
  'TUR': 'Turbosound',
  'TCH': 'TC Helicon',
  'TCE': 'TC Electronic',
  'TAN': 'Tannoy',
  'LAB': 'Lab Gruppen',
  'LKE': 'Lake',
  'MAR': 'Martin Audio',
  'ELE': 'Electro-Voice',
  'DYN': 'Dynacord',
  'RCF': 'RCF',
  'QSC': 'QSC',
  'DAS': 'DAS Audio',
  'NEX': 'Nexo',
  'ADA': 'Adam Hall',
};

async function main() {
  console.log('='.repeat(70));
  console.log('🔍 Audit PlusPortal Suppliers for Mislinked Products');
  console.log('='.repeat(70));
  console.log();

  // Get all suppliers with products - filter for PlusPortal ones by name
  const plusPortalSuppliers = await query<{ 
    supplier_id: string; 
    name: string; 
    code: string;
    product_count: string;
  }>(
    `SELECT s.supplier_id, s.name, s.code, COUNT(sp.supplier_product_id) as product_count
     FROM core.supplier s
     LEFT JOIN core.supplier_product sp ON sp.supplier_id = s.supplier_id AND sp.is_active = true
     WHERE LOWER(s.name) LIKE '%sennheiser%'
        OR LOWER(s.name) LIKE '%active music%'
        OR LOWER(s.name) LIKE '%av distribution%'
        OR LOWER(s.name) LIKE '%stage audio%'
        OR LOWER(s.name) LIKE '%audac%'
        OR LOWER(s.name) LIKE '%amphenol%'
        OR LOWER(s.name) LIKE '%atlona%'
        OR LOWER(s.name) LIKE '%adam hall%'
     GROUP BY s.supplier_id, s.name, s.code
     HAVING COUNT(sp.supplier_product_id) > 0
     ORDER BY s.name`
  );

  if (plusPortalSuppliers.rows.length === 0) {
    console.log('No PlusPortal suppliers found with products.\n');
    return;
  }

  console.log(`Found ${plusPortalSuppliers.rows.length} PlusPortal suppliers:\n`);
  for (const s of plusPortalSuppliers.rows) {
    console.log(`  - ${s.name} (${s.code}): ${s.product_count} products`);
  }
  console.log();
  
  // Audit each supplier
  for (const supplier of plusPortalSuppliers.rows) {
    await auditSupplier(supplier.supplier_id, supplier.name, supplier.code);
  }

  console.log('\n✅ Audit complete!\n');
}

async function auditSupplier(supplierId: string, name: string, code: string) {
  console.log('─'.repeat(70));
  console.log(`📦 ${name} (${code})`);
  console.log('─'.repeat(70));

  // Get product counts by SKU prefix
  const prefixCounts = await query<{ sku_prefix: string; count: string }>(
    `SELECT 
      SPLIT_PART(supplier_sku, '-', 1) AS sku_prefix,
      COUNT(*) as count
    FROM core.supplier_product
    WHERE supplier_id = $1 AND is_active = true
    GROUP BY SPLIT_PART(supplier_sku, '-', 1)
    ORDER BY count DESC`,
    [supplierId]
  );

  if (prefixCounts.rows.length === 0) {
    console.log('   No active products found.\n');
    return;
  }

  // Determine expected prefixes based on supplier name
  const expectedPrefixes = getExpectedPrefixes(name, code);
  
  console.log(`\n   Expected prefixes: ${expectedPrefixes.length > 0 ? expectedPrefixes.join(', ') : '(any)'}`);
  console.log(`   Products by prefix:\n`);

  let totalProducts = 0;
  let mislinkedCount = 0;
  const mislinkedPrefixes: { prefix: string; count: number; brand: string }[] = [];

  for (const row of prefixCounts.rows) {
    const count = parseInt(row.count);
    totalProducts += count;
    
    const brand = SKU_PREFIX_BRANDS[row.sku_prefix] || 'Unknown';
    const isExpected = expectedPrefixes.length === 0 || expectedPrefixes.includes(row.sku_prefix);
    const marker = isExpected ? '✅' : '❌';
    
    console.log(`   ${marker} ${row.sku_prefix.padEnd(5)}: ${count.toString().padStart(5)} (${brand})`);
    
    if (!isExpected) {
      mislinkedCount += count;
      mislinkedPrefixes.push({ prefix: row.sku_prefix, count, brand });
    }
  }

  console.log(`   ${'─'.repeat(25)}`);
  console.log(`   TOTAL: ${totalProducts.toString().padStart(5)} products`);

  if (mislinkedCount > 0) {
    console.log(`\n   ⚠️  MISLINKED: ${mislinkedCount} products from wrong brands!`);
    console.log(`   Affected prefixes: ${mislinkedPrefixes.map(p => `${p.prefix} (${p.count})`).join(', ')}`);
  } else {
    console.log(`\n   ✅ All products appear correctly linked.`);
  }
  console.log();
}

function getExpectedPrefixes(name: string, code: string): string[] {
  const nameLower = name.toLowerCase();
  
  // Sennheiser - includes Neumann (owned), Sonova (parent), and accessories
  if (nameLower.includes('sennheiser')) {
    return ['SEN', 'NEM', 'SON', 'VAR', 'AVA', 'NIC', 'SP', 'ADP'];
  }
  
  // Active Music Distribution
  if (nameLower.includes('active music')) {
    return ['AMD']; // They might have various brands - need to check
  }
  
  // AV Distribution
  if (nameLower.includes('av distribution')) {
    return ['AVD', 'ATL', 'AID', 'APT']; // Known to carry Atlona, Aida, Appotronics
  }
  
  // Stage Audio Works
  if (nameLower.includes('stage audio')) {
    return ['SAW', 'AUA', 'AMP', 'ADA']; // Known to carry Audac, Amphenol, Adam Hall
  }
  
  // Stage One - skip per user request
  if (nameLower.includes('stage one')) {
    return []; // Accept all
  }
  
  // Default: accept all (can't determine expected prefixes)
  return [];
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

