#!/usr/bin/env bun
/**
 * Verify Stage One Products Against API
 * 
 * This script:
 * 1. Fetches all products from Stage One API
 * 2. Queries database for all Stage One supplier products
 * 3. Identifies products in DB that are NOT in the API
 * 4. Attempts to identify which supplier each mismatched product should belong to
 * 5. Generates a report and optionally removes/reassigns products
 * 
 * Usage:
 *   bun scripts/verify-stage-one-products.ts [--dry-run] [--remove]
 * 
 * Options:
 *   --dry-run: Only report mismatches, don't make changes
 *   --remove: Remove mismatched products from Stage One (requires confirmation)
 */

import { query as dbQuery } from '../src/lib/database/unified-connection';

const API_BASE_URL = 'https://stage-one.co.za/wp-json/s1-api/v1/products';
const PER_PAGE = 100;
const SUPPLIER_NAME = 'Stage One';

interface ProductXML {
  id: string;
  title: string;
  sku: string;
  price: string;
  stock: string;
  status: string;
  permalink: string;
  brands?: {
    brand?: string | string[];
  };
}

interface ProductsResponse {
  products: {
    meta: {
      total: string;
      per_page: string;
      current_page: string;
      total_pages: string;
    };
    product: ProductXML | ProductXML[];
  };
}

interface DatabaseProduct {
  supplier_product_id: string;
  supplier_sku: string;
  name_from_supplier: string;
  brand: string | null;
  attrs_json: Record<string, unknown>;
}

interface MismatchProduct extends DatabaseProduct {
  suggestedSuppliers: Array<{
    supplier_id: string;
    supplier_name: string;
    supplier_code: string | null;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  }>;
}

/**
 * Parse XML string to JavaScript object
 */
function parseXML(xmlString: string): ProductsResponse {
  const products: ProductXML[] = [];
  const meta: ProductsResponse['products']['meta'] = {
    total: '0',
    per_page: '0',
    current_page: '0',
    total_pages: '0',
  };

  const metaMatch = xmlString.match(/<meta>(.*?)<\/meta>/s);
  if (metaMatch) {
    const metaXml = metaMatch[1];
    meta.total = extractText(metaXml, 'total') || '0';
    meta.per_page = extractText(metaXml, 'per_page') || '0';
    meta.current_page = extractText(metaXml, 'current_page') || '0';
    meta.total_pages = extractText(metaXml, 'total_pages') || '0';
  }

  const productMatches = xmlString.matchAll(/<product>(.*?)<\/product>/gs);
  for (const match of productMatches) {
    const productXml = match[1];
    const product: ProductXML = {
      id: extractText(productXml, 'id') || '',
      title: extractText(productXml, 'title') || '',
      sku: extractText(productXml, 'sku') || '',
      price: extractText(productXml, 'price') || '0',
      stock: extractText(productXml, 'stock') || '0',
      status: extractText(productXml, 'status') || '',
      permalink: extractText(productXml, 'permalink') || '',
    };

    const brandsMatch = productXml.match(/<brands>(.*?)<\/brands>/s);
    if (brandsMatch) {
      const brandsXml = brandsMatch[1];
      const brandMatches = brandsXml.matchAll(/<brand>(.*?)<\/brand>/g);
      const brands: string[] = [];
      for (const brandMatch of brandMatches) {
        brands.push(brandMatch[1].trim());
      }
      if (brands.length > 0) {
        product.brands = { brand: brands.length === 1 ? brands[0] : brands };
      }
    }

    products.push(product);
  }

  return {
    products: {
      meta,
      product: products.length === 1 ? products[0] : products,
    },
  };
}

function extractText(xml: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's');
  const match = xml.match(regex);
  if (match && match[1]) {
    return match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#13;/g, '\n')
      .replace(/&apos;/g, "'")
      .trim();
  }
  return undefined;
}

/**
 * Fetch all products from Stage One API
 */
async function fetchAllStageOneProducts(): Promise<Set<string>> {
  console.log('📡 Fetching all products from Stage One API...\n');
  
  const skuSet = new Set<string>();
  
  try {
    // Fetch first page to get total pages
    const firstPageUrl = `${API_BASE_URL}?page=1&per_page=${PER_PAGE}`;
    console.log(`   Fetching page 1...`);
    const firstResponse = await fetch(firstPageUrl);
    if (!firstResponse.ok) {
      throw new Error(`Failed to fetch page 1: ${firstResponse.status} ${firstResponse.statusText}`);
    }
    
    const firstPageXml = await firstResponse.text();
    const firstPage = parseXML(firstPageXml);
    const totalPages = parseInt(firstPage.products.meta.total_pages) || 1;
    const totalProducts = parseInt(firstPage.products.meta.total) || 0;
    
    console.log(`   Total products in API: ${totalProducts}`);
    console.log(`   Total pages: ${totalPages}\n`);
    
    // Process first page
    const firstPageProducts = Array.isArray(firstPage.products.product)
      ? firstPage.products.product
      : [firstPage.products.product];
    
    for (const product of firstPageProducts) {
      if (product.sku) {
        skuSet.add(product.sku.toUpperCase().trim());
      }
    }
    
    // Fetch remaining pages
    for (let page = 2; page <= totalPages; page++) {
      const pageUrl = `${API_BASE_URL}?page=${page}&per_page=${PER_PAGE}`;
      console.log(`   Fetching page ${page}/${totalPages}...`);
      
      const pageResponse = await fetch(pageUrl);
      if (!pageResponse.ok) {
        console.warn(`   ⚠️  Failed to fetch page ${page}: ${pageResponse.status}`);
        continue;
      }
      
      const pageXml = await pageResponse.text();
      const pageData = parseXML(pageXml);
      const pageProducts = Array.isArray(pageData.products.product)
        ? pageData.products.product
        : [pageData.products.product];
      
      for (const product of pageProducts) {
        if (product.sku) {
          skuSet.add(product.sku.toUpperCase().trim());
        }
      }
    }
    
    console.log(`✅ Fetched ${skuSet.size} unique SKUs from API\n`);
    return skuSet;
  } catch (error) {
    console.error('❌ Error fetching products from API:', error);
    throw error;
  }
}

/**
 * Get all Stage One products from database
 */
async function getStageOneProductsFromDB(): Promise<DatabaseProduct[]> {
  console.log('📊 Querying database for Stage One products...\n');
  
  const supplierId = await findSupplier(SUPPLIER_NAME);
  if (!supplierId) {
    throw new Error(`Supplier "${SUPPLIER_NAME}" not found in database`);
  }
  
  console.log(`✅ Found supplier: ${SUPPLIER_NAME} (ID: ${supplierId})\n`);
  
  const sql = `
    SELECT 
      sp.supplier_product_id,
      sp.supplier_sku,
      sp.name_from_supplier,
      sp.attrs_json,
      COALESCE(
        (SELECT r.brand 
         FROM spp.pricelist_row r
         JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = sp.supplier_id
         WHERE r.supplier_sku = sp.supplier_sku AND r.brand IS NOT NULL AND r.brand <> ''
         ORDER BY u.received_at DESC, r.row_num DESC
         LIMIT 1),
        sp.attrs_json->>'brand',
        (sp.attrs_json->'brands'->>0)::text
      ) AS brand
    FROM core.supplier_product sp
    WHERE sp.supplier_id = $1
      AND sp.is_active = true
    ORDER BY sp.supplier_sku
  `;
  
  const result = await dbQuery<DatabaseProduct>(sql, [supplierId]);
  
  console.log(`✅ Found ${result.rows.length} products in database\n`);
  return result.rows;
}

/**
 * Find supplier by name
 */
async function findSupplier(name: string): Promise<string | null> {
  const result = await dbQuery<{ supplier_id: string }>(
    `SELECT supplier_id 
     FROM core.supplier 
     WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1)
     LIMIT 1`,
    [name]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0].supplier_id;
}

/**
 * Find suppliers that might own a product based on brand/SKU patterns
 */
async function findSuggestedSuppliers(
  product: DatabaseProduct
): Promise<MismatchProduct['suggestedSuppliers']> {
  const suggestions: MismatchProduct['suggestedSuppliers'] = [];
  
  // Extract brand from product
  const brand = product.brand || 
    (product.attrs_json?.brand as string) ||
    ((product.attrs_json?.brands as string[])?.[0]) ||
    null;
  
  if (!brand) {
    return suggestions;
  }
  
  // Search for suppliers that have products with this brand
  const brandSearchSql = `
    SELECT DISTINCT
      s.supplier_id,
      s.name AS supplier_name,
      s.code AS supplier_code,
      COUNT(DISTINCT sp.supplier_product_id) AS product_count
    FROM core.supplier s
    JOIN core.supplier_product sp ON sp.supplier_id = s.supplier_id
    WHERE s.supplier_id != (SELECT supplier_id FROM core.supplier WHERE LOWER(name) = LOWER($1) LIMIT 1)
      AND (
        EXISTS (
          SELECT 1 FROM spp.pricelist_row r
          JOIN spp.pricelist_upload u ON u.upload_id = r.upload_id AND u.supplier_id = s.supplier_id
          WHERE r.brand ILIKE $2
          LIMIT 1
        )
        OR sp.attrs_json->>'brand' ILIKE $2
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(sp.attrs_json->'brands') AS b
          WHERE b ILIKE $2
          LIMIT 1
        )
      )
      AND s.active = true
    GROUP BY s.supplier_id, s.name, s.code
    ORDER BY product_count DESC
    LIMIT 5
  `;
  
  const brandResult = await dbQuery<{
    supplier_id: string;
    supplier_name: string;
    supplier_code: string | null;
    product_count: number;
  }>(brandSearchSql, [SUPPLIER_NAME, `%${brand}%`]);
  
  for (const row of brandResult.rows) {
    suggestions.push({
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name,
      supplier_code: row.supplier_code,
      confidence: row.product_count > 10 ? 'high' : row.product_count > 3 ? 'medium' : 'low',
      reason: `Has ${row.product_count} products with brand "${brand}"`,
    });
  }
  
  // Also search by SKU prefix patterns (e.g., "AUA-" might indicate Audac)
  const skuPrefix = product.supplier_sku.split(/[-_]/)[0];
  if (skuPrefix && skuPrefix.length >= 3) {
    const skuSearchSql = `
      SELECT DISTINCT
        s.supplier_id,
        s.name AS supplier_name,
        s.code AS supplier_code,
        COUNT(DISTINCT sp.supplier_product_id) AS product_count
      FROM core.supplier s
      JOIN core.supplier_product sp ON sp.supplier_id = s.supplier_id
      WHERE s.supplier_id != (SELECT supplier_id FROM core.supplier WHERE LOWER(name) = LOWER($1) LIMIT 1)
        AND sp.supplier_sku LIKE $2
        AND s.active = true
      GROUP BY s.supplier_id, s.name, s.code
      ORDER BY product_count DESC
      LIMIT 3
    `;
    
    const skuResult = await dbQuery<{
      supplier_id: string;
      supplier_name: string;
      supplier_code: string | null;
      product_count: number;
    }>(skuSearchSql, [SUPPLIER_NAME, `${skuPrefix}%`]);
    
    for (const row of skuResult.rows) {
      // Avoid duplicates
      if (!suggestions.find(s => s.supplier_id === row.supplier_id)) {
        suggestions.push({
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name,
          supplier_code: row.supplier_code,
          confidence: row.product_count > 5 ? 'high' : 'medium',
          reason: `Has ${row.product_count} products with SKU prefix "${skuPrefix}"`,
        });
      }
    }
  }
  
  return suggestions;
}

/**
 * Main verification function
 */
async function verifyStageOneProducts(dryRun: boolean = true) {
  console.log('🔍 Stage One Product Verification\n');
  console.log('='.repeat(60) + '\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Step 1: Fetch all products from API
    const apiSkus = await fetchAllStageOneProducts();
    
    // Step 2: Get all products from database
    const dbProducts = await getStageOneProductsFromDB();
    
    // Step 3: Find mismatches
    console.log('🔍 Comparing products...\n');
    const mismatches: MismatchProduct[] = [];
    
    for (const dbProduct of dbProducts) {
      const normalizedSku = dbProduct.supplier_sku.toUpperCase().trim();
      if (!apiSkus.has(normalizedSku)) {
        console.log(`   ❌ Mismatch found: ${dbProduct.supplier_sku} - ${dbProduct.name_from_supplier}`);
        const suggestions = await findSuggestedSuppliers(dbProduct);
        mismatches.push({
          ...dbProduct,
          suggestedSuppliers: suggestions,
        });
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Products in API: ${apiSkus.size}`);
    console.log(`   Products in DB: ${dbProducts.length}`);
    console.log(`   Mismatches found: ${mismatches.length}\n`);
    
    if (mismatches.length === 0) {
      console.log('✅ All products match! No action needed.\n');
      return;
    }
    
    // Step 4: Generate report
    console.log('📋 Mismatch Report:');
    console.log('='.repeat(60) + '\n');
    
    for (const mismatch of mismatches) {
      console.log(`SKU: ${mismatch.supplier_sku}`);
      console.log(`Name: ${mismatch.name_from_supplier}`);
      console.log(`Brand: ${mismatch.brand || 'Unknown'}`);
      console.log(`Product ID: ${mismatch.supplier_product_id}`);
      
      if (mismatch.suggestedSuppliers.length > 0) {
        console.log(`\n   Suggested Suppliers:`);
        for (const suggestion of mismatch.suggestedSuppliers) {
          const confidenceIcon = 
            suggestion.confidence === 'high' ? '🟢' :
            suggestion.confidence === 'medium' ? '🟡' : '🔴';
          console.log(`   ${confidenceIcon} ${suggestion.supplier_name} (${suggestion.supplier_code || 'no code'})`);
          console.log(`      ${suggestion.reason}`);
          console.log(`      ID: ${suggestion.supplier_id}`);
        }
      } else {
        console.log(`\n   ⚠️  No suggested suppliers found`);
      }
      
      console.log('\n' + '-'.repeat(60) + '\n');
    }
    
    // Step 5: Export to CSV
    const csvRows: string[] = [
      'SKU,Product Name,Brand,Product ID,Suggested Supplier 1,Supplier 1 ID,Confidence 1,Reason 1,Suggested Supplier 2,Supplier 2 ID,Confidence 2,Reason 2',
    ];
    
    for (const mismatch of mismatches) {
      const row = [
        mismatch.supplier_sku,
        `"${mismatch.name_from_supplier.replace(/"/g, '""')}"`,
        mismatch.brand || '',
        mismatch.supplier_product_id,
        mismatch.suggestedSuppliers[0]?.supplier_name || '',
        mismatch.suggestedSuppliers[0]?.supplier_id || '',
        mismatch.suggestedSuppliers[0]?.confidence || '',
        `"${(mismatch.suggestedSuppliers[0]?.reason || '').replace(/"/g, '""')}"`,
        mismatch.suggestedSuppliers[1]?.supplier_name || '',
        mismatch.suggestedSuppliers[1]?.supplier_id || '',
        mismatch.suggestedSuppliers[1]?.confidence || '',
        `"${(mismatch.suggestedSuppliers[1]?.reason || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    }
    
    const fs = await import('fs');
    const csvPath = `stage-one-mismatches-${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf-8');
    console.log(`\n✅ Report saved to: ${csvPath}\n`);
    
    // Step 6: Optionally remove mismatches
    if (!dryRun) {
      console.log('⚠️  REMOVAL MODE - This will deactivate mismatched products');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const supplierId = await findSupplier(SUPPLIER_NAME);
      if (!supplierId) {
        throw new Error('Supplier not found');
      }
      
      console.log('🗑️  Deactivating mismatched products...\n');
      let removed = 0;
      
      for (const mismatch of mismatches) {
        await dbQuery(
          `UPDATE core.supplier_product 
           SET is_active = false, updated_at = NOW()
           WHERE supplier_product_id = $1`,
          [mismatch.supplier_product_id]
        );
        removed++;
        console.log(`   ✅ Deactivated: ${mismatch.supplier_sku}`);
      }
      
      console.log(`\n✅ Deactivated ${removed} products\n`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--remove');
const remove = args.includes('--remove');

if (remove && !dryRun) {
  console.log('⚠️  WARNING: This will remove mismatched products from Stage One');
  console.log('   Make sure you have reviewed the report first!\n');
}

// Run verification
verifyStageOneProducts(dryRun)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

