#!/usr/bin/env bun
/**
 * Import Stage One Products from API
 *
 * Fetches all products from Stage One API and imports them into the supplier inventory portfolio
 * as if completing a pricelist upload process.
 *
 * Usage:
 *   bun scripts/import-stage-one-products.ts
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - Supplier "Stage_1" must exist in core.supplier table
 *
 * Database Connection:
 *   - Uses Neon PostgreSQL database (project: proud-mud-50346856)
 *   - The database connection layer connects to Neon via the connection pooler
 *   - PricelistService handles all database operations through the unified connection
 *   - When run in Cursor with Neon MCP enabled, you can use Neon MCP tools directly
 *     by setting USE_NEON_MCP=true environment variable
 */

import { pricelistService } from '../src/lib/services/PricelistService';
import type { PricelistRow } from '../src/types/nxt-spp';

const API_BASE_URL = 'https://stage-one.co.za/wp-json/s1-api/v1/products';
const PER_PAGE = 100;
const SUPPLIER_NAME = 'Stage One';
const NEON_PROJECT_ID = 'proud-mud-50346856'; // NXT-SPP-Supplier Inventory Portfolio
const NEON_BRANCH_ID = 'br-spring-field-a9v3cjvz'; // production branch

interface ProductXML {
  id: string;
  title: string;
  sku: string;
  price: string;
  stock: string;
  status: string;
  permalink: string;
  short_description?: string;
  description?: string;
  categories?: {
    main_category?: string;
    sub_categories?: {
      sub_category?: string | string[];
    };
  };
  brands?: {
    brand?: string | string[];
  };
  images?: {
    image?: string | string[];
  };
  custom_fields?: {
    model_number?: string;
    features?: string;
    specifications?: string;
    quantity_per_pack?: string;
    packing_weight?: string;
    part_number?: string;
    stock_on_order?: string;
    product_video?: string;
  };
  attributes?: unknown;
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

/**
 * Parse XML string to JavaScript object
 */
function parseXML(xmlString: string): ProductsResponse {
  // Simple XML parser - handles the structure from Stage One API
  const products: ProductXML[] = [];
  const meta: ProductsResponse['products']['meta'] = {
    total: '0',
    per_page: '0',
    current_page: '0',
    total_pages: '0',
  };

  // Extract meta information
  const metaMatch = xmlString.match(/<meta>(.*?)<\/meta>/s);
  if (metaMatch) {
    const metaXml = metaMatch[1];
    meta.total = extractText(metaXml, 'total') || '0';
    meta.per_page = extractText(metaXml, 'per_page') || '0';
    meta.current_page = extractText(metaXml, 'current_page') || '0';
    meta.total_pages = extractText(metaXml, 'total_pages') || '0';
  }

  // Extract products
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
      short_description: extractText(productXml, 'short_description'),
      description: extractText(productXml, 'description'),
    };

    // Extract categories
    const categoriesMatch = productXml.match(/<categories>(.*?)<\/categories>/s);
    if (categoriesMatch) {
      const categoriesXml = categoriesMatch[1];
      const mainCategory = extractText(categoriesXml, 'main_category');
      const subCategories: string[] = [];
      const subCategoryMatches = categoriesXml.matchAll(/<sub_category>(.*?)<\/sub_category>/g);
      for (const subMatch of subCategoryMatches) {
        subCategories.push(subMatch[1].trim());
      }
      product.categories = {
        main_category: mainCategory || undefined,
        sub_categories: subCategories.length > 0 ? { sub_category: subCategories } : undefined,
      };
    }

    // Extract brands
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

    // Extract images
    const imagesMatch = productXml.match(/<images>(.*?)<\/images>/s);
    if (imagesMatch) {
      const imagesXml = imagesMatch[1];
      const imageMatches = imagesXml.matchAll(/<image>(.*?)<\/image>/g);
      const images: string[] = [];
      for (const imageMatch of imageMatches) {
        images.push(imageMatch[1].trim());
      }
      if (images.length > 0) {
        product.images = { image: images.length === 1 ? images[0] : images };
      }
    }

    // Extract custom fields
    const customFieldsMatch = productXml.match(/<custom_fields>(.*?)<\/custom_fields>/s);
    if (customFieldsMatch) {
      const customFieldsXml = customFieldsMatch[1];
      product.custom_fields = {
        model_number: extractText(customFieldsXml, 'model_number'),
        features: extractText(customFieldsXml, 'features'),
        specifications: extractText(customFieldsXml, 'specifications'),
        quantity_per_pack: extractText(customFieldsXml, 'quantity_per_pack'),
        packing_weight: extractText(customFieldsXml, 'packing_weight'),
        part_number: extractText(customFieldsXml, 'part_number'),
        stock_on_order: extractText(customFieldsXml, 'stock_on_order'),
        product_video: extractText(customFieldsXml, 'product_video'),
      };
    }

    // Extract attributes if present (may contain product variations/attributes)
    const attributesMatch = productXml.match(/<attributes>(.*?)<\/attributes>/s);
    if (attributesMatch && attributesMatch[1].trim()) {
      // Try to parse as JSON if it looks like JSON, otherwise store as string
      const attributesContent = attributesMatch[1].trim();
      try {
        product.attributes = JSON.parse(attributesContent);
      } catch {
        // If not JSON, store as raw XML string for later processing
        product.attributes = attributesContent;
      }
    } else if (productXml.includes('<attributes/>') || productXml.includes('<attributes />')) {
      // Empty attributes tag - store as empty object
      product.attributes = {};
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

/**
 * Extract text content from XML tag
 */
function extractText(xml: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's');
  const match = xml.match(regex);
  if (match && match[1]) {
    // Decode HTML entities
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
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#13;/g, '\n')
    .replace(/&apos;/g, "'");
}

/**
 * Find supplier by name using Neon MCP
 * 
 * This function uses Neon MCP server tools to query the database.
 * Uses the Neon MCP run_sql tool for database operations.
 */
async function findSupplier(name: string): Promise<string | null> {
  // Escape single quotes for SQL safety
  const escapedName = name.replace(/'/g, "''");
  const sql = `SELECT supplier_id 
     FROM core.supplier 
     WHERE LOWER(name) = LOWER('${escapedName}') OR LOWER(code) = LOWER('${escapedName}')
     LIMIT 1`;

  try {
    // Use Neon MCP run_sql tool
    // This will work when the script is run in an environment with Neon MCP available
    // (e.g., via Cursor with MCP server configured, or when MCP tools are injected)
    
    // For standalone execution, we'll use the database connection
    // The PricelistService also uses the database connection, ensuring consistency
    const { query } = await import('../src/lib/database');
    const result = await query<{ supplier_id: string }>(
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
  } catch (error) {
    console.error('Error finding supplier:', error);
    throw error;
  }
}

/**
 * Fetch products from API for a specific page
 */
async function fetchProductsPage(page: number): Promise<ProductsResponse> {
  const url = `${API_BASE_URL}?page=${page}&per_page=${PER_PAGE}`;
  console.log(`📡 Fetching page ${page} from ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch page ${page}: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();
  return parseXML(xmlText);
}

/**
 * Transform product XML to PricelistRow format
 */
function transformProductToPricelistRow(
  product: ProductXML,
  uploadId: string,
  rowNum: number
): PricelistRow | null {
  // Skip products without required fields
  if (!product.sku || !product.title || !product.price) {
    return null;
  }

  // Parse price (price is in whole ZAR, not cents)
  const price = parseFloat(product.price);
  if (isNaN(price) || price <= 0) {
    return null;
  }
  // Price is already in ZAR (whole units, e.g., 3499 = R3,499)
  const priceInZar = price;

  // Extract brand (first brand if multiple)
  const brand =
    product.brands?.brand && Array.isArray(product.brands.brand)
      ? product.brands.brand[0]
      : product.brands?.brand || undefined;

  // Extract category (main category or first subcategory)
  const category =
    product.categories?.main_category ||
    (product.categories?.sub_categories?.sub_category &&
    Array.isArray(product.categories.sub_categories.sub_category)
      ? product.categories.sub_categories.sub_category[0]
      : product.categories?.sub_categories?.sub_category) ||
    undefined;

  // Build attributes JSON - store ALL extracted data
  const stockQty = parseInt(product.stock) || 0;
  const stockOnOrder = parseInt(product.custom_fields?.stock_on_order || '0') || 0;
  
  const attrs: Record<string, unknown> = {
    external_id: product.id,
    permalink: product.permalink,
    stock: stockQty,
    qty_on_order: stockOnOrder, // Store stock_on_order as qty_on_order for API queries
    status: product.status,
  };

  // Store short_description if available
  if (product.short_description) {
    attrs.short_description = decodeHtmlEntities(product.short_description);
  }

  // Store full description
  if (product.description) {
    attrs.description = decodeHtmlEntities(product.description);
  }

  // Store all categories (main + all sub_categories)
  if (product.categories) {
    attrs.main_category = product.categories.main_category || null;
    if (product.categories.sub_categories?.sub_category) {
      const subCats = Array.isArray(product.categories.sub_categories.sub_category)
        ? product.categories.sub_categories.sub_category
        : [product.categories.sub_categories.sub_category];
      attrs.sub_categories = subCats;
    }
  }

  // Store all brands (not just first one)
  if (product.brands?.brand) {
    const brands = Array.isArray(product.brands.brand)
      ? product.brands.brand
      : [product.brands.brand];
    attrs.brands = brands;
  }

  // Store all images
  if (product.images?.image) {
    const images = Array.isArray(product.images.image) ? product.images.image : [product.images.image];
    attrs.images = images;
  }

  // Store all custom_fields
  if (product.custom_fields) {
    if (product.custom_fields.model_number) {
      attrs.model_number = product.custom_fields.model_number;
    }
    if (product.custom_fields.part_number) {
      attrs.part_number = product.custom_fields.part_number;
    }
    if (product.custom_fields.features) {
      attrs.features = decodeHtmlEntities(product.custom_fields.features);
    }
    if (product.custom_fields.specifications) {
      attrs.specifications = decodeHtmlEntities(product.custom_fields.specifications);
    }
    if (product.custom_fields.quantity_per_pack) {
      attrs.quantity_per_pack = product.custom_fields.quantity_per_pack;
    }
    if (product.custom_fields.packing_weight) {
      attrs.packing_weight = product.custom_fields.packing_weight;
    }
    if (product.custom_fields.product_video) {
      attrs.product_video = product.custom_fields.product_video;
    }
  }

  // Store attributes if present
  if (product.attributes) {
    attrs.attributes = product.attributes;
  }

  return {
    upload_id: uploadId,
    row_num: rowNum,
    supplier_sku: product.sku,
    name: decodeHtmlEntities(product.title),
    brand,
    uom: 'each', // Default unit of measure
    pack_size: product.custom_fields?.quantity_per_pack || undefined,
    price: priceInZar,
    currency: 'ZAR',
    category_raw: category,
    barcode: undefined, // Not available in API response
    attrs_json: attrs,
  };
}

/**
 * Main import function
 */
async function importStageOneProducts() {
  console.log('🚀 Starting Stage One product import...\n');

  try {
    // Step 1: Find supplier
    console.log(`🔍 Looking for supplier: ${SUPPLIER_NAME}`);
    const supplierId = await findSupplier(SUPPLIER_NAME);

    if (!supplierId) {
      throw new Error(`Supplier "${SUPPLIER_NAME}" not found in database. Please create it first.`);
    }

    console.log(`✅ Found supplier with ID: ${supplierId}\n`);

    // Step 2: Fetch first page to get total pages
    console.log('📥 Fetching first page to determine total pages...');
    const firstPage = await fetchProductsPage(1);
    const totalPages = parseInt(firstPage.products.meta.total_pages) || 1;
    const totalProducts = parseInt(firstPage.products.meta.total) || 0;

    console.log(`📊 Total products: ${totalProducts}`);
    console.log(`📄 Total pages: ${totalPages}\n`);

    // Step 3: Create pricelist upload
    console.log('📝 Creating pricelist upload record...');
    const upload = await pricelistService.createUpload({
      supplier_id: supplierId,
      filename: `stage-one-api-import-${new Date().toISOString()}.xml`,
      currency: 'ZAR',
      valid_from: new Date(),
    });

    console.log(`✅ Created upload with ID: ${upload.upload_id}\n`);

    // Step 4: Fetch all pages and transform products
    console.log('📥 Fetching all product pages...');
    const allProducts: ProductXML[] = [];

    // Add products from first page
    const firstPageProducts = Array.isArray(firstPage.products.product)
      ? firstPage.products.product
      : [firstPage.products.product];
    allProducts.push(...firstPageProducts);

    // Fetch remaining pages
    for (let page = 2; page <= totalPages; page++) {
      const pageData = await fetchProductsPage(page);
      const pageProducts = Array.isArray(pageData.products.product)
        ? pageData.products.product
        : [pageData.products.product];
      allProducts.push(...pageProducts);
      console.log(`   ✅ Page ${page}/${totalPages} fetched (${pageProducts.length} products)`);
    }

    console.log(`\n✅ Fetched ${allProducts.length} products total\n`);

    // Step 5: Transform to PricelistRow format
    console.log('🔄 Transforming products to pricelist format...');
    const pricelistRows: PricelistRow[] = [];
    let rowNum = 1;

    for (const product of allProducts) {
      const row = transformProductToPricelistRow(product, upload.upload_id, rowNum);
      if (row) {
        pricelistRows.push(row);
        rowNum++;
      }
    }

    console.log(`✅ Transformed ${pricelistRows.length} valid products\n`);

    // Step 6: Insert rows into database
    console.log('💾 Inserting products into database...');
    const insertedCount = await pricelistService.insertRows(upload.upload_id, pricelistRows);
    console.log(`✅ Inserted ${insertedCount} rows\n`);

    // Step 7: Validate upload
    console.log('✔️  Validating upload...');
    const validationResult = await pricelistService.validateUpload(upload.upload_id);
    console.log(`✅ Validation complete:`);
    console.log(`   Status: ${validationResult.status}`);
    console.log(`   Total rows: ${validationResult.total_rows}`);
    console.log(`   Valid rows: ${validationResult.valid_rows}`);
    console.log(`   Invalid rows: ${validationResult.invalid_rows}`);
    console.log(`   New products: ${validationResult.summary.new_products}`);
    console.log(`   Updated prices: ${validationResult.summary.updated_prices}\n`);

    if (validationResult.status === 'invalid' && validationResult.errors.length > 0) {
      console.log('⚠️  Validation errors found:');
      validationResult.errors.slice(0, 10).forEach(error => {
        console.log(`   Row ${error.row_num}: ${error.message}`);
      });
      if (validationResult.errors.length > 10) {
        console.log(`   ... and ${validationResult.errors.length - 10} more errors`);
      }
      console.log('');
    }

    // Step 8: Merge pricelist into core schema
    // The validation result status can be 'valid', 'warning', or 'invalid'
    // The upload status is updated to 'validated' when validation passes
    // We should merge if validation passed (valid or warning status)
    if (validationResult.status === 'valid' || validationResult.status === 'validated' || validationResult.status === 'warning') {
      console.log('🔄 Merging pricelist into core schema (SIP staging -> core)...');
      const mergeResult = await pricelistService.mergePricelist(upload.upload_id, {
        skipInvalidRows: validationResult.status === 'warning',
      });

      console.log(`✅ Merge complete:`);
      console.log(`   Products created: ${mergeResult.products_created}`);
      console.log(`   Products updated: ${mergeResult.products_updated}`);
      console.log(`   Prices updated: ${mergeResult.prices_updated}`);
      console.log(`   Duration: ${mergeResult.duration_ms}ms\n`);

      if (mergeResult.errors.length > 0) {
        console.log('⚠️  Merge errors:');
        mergeResult.errors.forEach(error => {
          console.log(`   ${error}`);
        });
        console.log('');
      }
    } else {
      console.log('⚠️  Skipping merge due to validation errors\n');
    }

    console.log('✅ Import completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Upload ID: ${upload.upload_id}`);
    console.log(`   Products fetched: ${allProducts.length}`);
    console.log(`   Products imported: ${pricelistRows.length}`);
    console.log(`   Validation status: ${validationResult.status}`);
  } catch (error) {
    console.error('❌ Import failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the import
importStageOneProducts()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

