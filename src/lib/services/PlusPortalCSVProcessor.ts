/**
 * PlusPortal CSV Processor
 * Processes downloaded CSV files from PlusPortal and imports products
 */

import { query, withTransaction } from '@/lib/database';
import { findSupplierByName } from '@/lib/utils/supplier-matcher';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { batchCheckSKUs } from './SKUDeduplicationService';

export interface CSVRow {
  [key: string]: string | number;
}

export interface ProcessedProduct {
  supplierSku: string;
  name: string;
  costExVat: number | null;
  stockOnHand: number | null;
  quantityOnOrder: number | null;
  stockStatus: string;
  attrs: Record<string, unknown>;
}

export interface ProcessingResult {
  productsProcessed: number;
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  errors: string[];
}

export class PlusPortalCSVProcessor {
  private supplierId: string;

  constructor(supplierId: string) {
    this.supplierId = supplierId;
  }

  /**
   * Parse CSV file
   * Note: PlusPortal CSV has embedded quotes like 1/4" that need special handling
   */
  private parseCSV(filePath: string): CSVRow[] {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // Pre-process: Fix embedded quotes in the CSV
      // Replace "" (escaped quotes) first, then handle unescaped quotes in fields
      // Split by newlines, process each line
      const lines = fileContent.split('\n');
      const processedLines: string[] = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Handle lines with embedded unescaped quotes (like 1/4")
        // The pattern is: a quote inside a quoted field that isn't at a field boundary
        const processedLine = line;
        
        // Simple approach: replace internal quotes that aren't doubled
        // Pattern: quote followed by content that doesn't end the field
        // We'll use a more robust approach - manually parse considering field boundaries
        processedLines.push(processedLine);
      }
      
      const processedContent = processedLines.join('\n');
      
      const records = parse(processedContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true, // Handle malformed quotes  
        relax_column_count: true, // Handle inconsistent column counts
        quote: '"', // Standard quote character
        escape: '"', // Double-quote for escape (CSV standard)
        cast: (value, context) => {
          // Try to convert numeric values
          if (context.header) {
            return value;
          }
          if (value === null || value === undefined) {
            return '';
          }
          const strValue = String(value).trim();
          // Remove currency prefix if present (e.g., "R 277.00" -> "277.00")
          const cleanValue = strValue.replace(/^R\s*/i, '').replace(/,/g, '');
          const numValue = Number(cleanValue);
          if (!isNaN(numValue) && cleanValue !== '') {
            return numValue;
          }
          return strValue;
        },
      });

      console.log(`[PlusPortal CSV] Parsed ${records.length} records from CSV`);
      return records as CSVRow[];
    } catch (error) {
      // Log error message only (not full stack) to avoid Bun stderr issues
      console.log('[PlusPortal CSV] Parse error:', error instanceof Error ? error.message : String(error));
      
      // Fallback: try a simpler parsing approach
      console.log('[PlusPortal CSV] Attempting fallback parsing...');
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(l => l.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV has no data rows');
        }
        
        // Parse header
        const headerLine = lines[0];
        const headers = this.parseCSVLine(headerLine);
        console.log('[PlusPortal CSV] Headers:', headers);
        
        // Parse data rows
        const records: CSVRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          try {
            const values = this.parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
              const record: CSVRow = {};
              for (let j = 0; j < headers.length; j++) {
                record[headers[j]] = values[j] || '';
              }
              records.push(record);
            }
          } catch (lineError) {
            // Skip bad lines
          }
        }
        
        console.log(`[PlusPortal CSV] Fallback parsed ${records.length} records`);
        return records;
      } catch (fallbackError) {
        throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Parse a single CSV line handling quoted fields with embedded quotes
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (!inQuotes) {
          inQuotes = true;
        } else if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else if (i + 1 < line.length && line[i + 1] === ',') {
          // End of quoted field
          inQuotes = false;
        } else if (i + 1 === line.length) {
          // End of line
          inQuotes = false;
        } else {
          // Embedded quote (like 1/4") - include it
          current += char;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      i++;
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Map CSV row to product data
   * Adjust column names based on actual PlusPortal CSV structure
   */
  private mapCSVRowToProduct(row: CSVRow): ProcessedProduct | null {
    // PlusPortal CSV columns:
    // "Product No.","Manufacturer Product No.","Product Description","Total SOH","Price Before Discount Ex Vat"
    const skuColumns = ['product no.', 'product no', 'productno', 'sku', 'supplier_sku', 'part_number', 'product_code', 'item_code'];
    const mfrCodeColumns = ['manufacturer product no.', 'manufacturer product no', 'mfr_code', 'mfr code', 'manufacturer code'];
    const nameColumns = ['product description', 'productdescription', 'description', 'name', 'product_name', 'item_name'];
    const priceColumns = ['price before discount ex vat', 'price before discount', 'price', 'cost', 'cost_price', 'unit_price', 'dealer_price'];
    const stockColumns = ['total soh', 'totalsoh', 'soh', 'stock', 'stock_on_hand', 'quantity', 'qty'];
    const orderColumns = ['on_order', 'qty_on_order', 'stock_on_order', 'ordered'];

    const sku = this.findColumnValue(row, skuColumns);
    const name = this.findColumnValue(row, nameColumns);
    const price = this.findColumnValue(row, priceColumns);
    const stock = this.findColumnValue(row, stockColumns);
    const onOrder = this.findColumnValue(row, orderColumns);

    if (!sku || !name) {
      return null;
    }

    const costExVat = price ? parseFloat(String(price)) : null;
    const stockOnHand = stock ? parseInt(String(stock), 10) : null;
    const quantityOnOrder = onOrder ? parseInt(String(onOrder), 10) : null;

    // Determine stock status
    let stockStatus = 'outofstock';
    if (stockOnHand !== null && stockOnHand > 0) {
      stockStatus = 'instock';
    } else if (quantityOnOrder !== null && quantityOnOrder > 0) {
      stockStatus = 'onbackorder';
    }

    return {
      supplierSku: String(sku).trim(),
      name: String(name).trim(),
      costExVat: isNaN(costExVat || 0) ? null : costExVat,
      stockOnHand: isNaN(stockOnHand || 0) ? null : stockOnHand,
      quantityOnOrder: isNaN(quantityOnOrder || 0) ? null : quantityOnOrder,
      stockStatus,
      attrs: {
        ...row,
        cost_excluding: costExVat,
        stock_on_hand: stockOnHand,
        quantity_on_order: quantityOnOrder,
      },
    };
  }

  /**
   * Find column value using multiple possible column names
   */
  private findColumnValue(row: CSVRow, possibleColumns: string[]): string | number | null {
    for (const col of possibleColumns) {
      // Try exact match (case-insensitive)
      const exactMatch = Object.keys(row).find(
        key => key.toLowerCase().trim() === col.toLowerCase()
      );
      if (exactMatch && row[exactMatch] !== null && row[exactMatch] !== undefined && row[exactMatch] !== '') {
        return row[exactMatch];
      }

      // Try partial match
      const partialMatch = Object.keys(row).find(
        key => key.toLowerCase().includes(col.toLowerCase()) || col.toLowerCase().includes(key.toLowerCase())
      );
      if (partialMatch && row[partialMatch] !== null && row[partialMatch] !== undefined && row[partialMatch] !== '') {
        return row[partialMatch];
      }
    }
    return null;
  }

  /**
   * Process CSV file and import products
   * Uses batch SKU checking for performance (avoids per-product queries)
   */
  async processCSV(filePath: string, logId?: string): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      productsProcessed: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsSkipped: 0,
      errors: [],
    };

    try {
      // Parse CSV
      const rows = this.parseCSV(filePath);
      result.productsProcessed = rows.length;
      console.log(`[PlusPortal CSV] Processing ${rows.length} products...`);

      // Map all rows to products first
      const products: ProcessedProduct[] = [];
      for (const row of rows) {
        const product = this.mapCSVRowToProduct(row);
        if (product) {
          products.push(product);
        } else {
          result.productsSkipped++;
        }
      }
      console.log(`[PlusPortal CSV] Mapped ${products.length} valid products`);

      // Check if this is Stage Audio Works (only apply SKU deduplication for SAW)
      const currentSupplierResult = await query<{ name: string }>(
        `SELECT name FROM core.supplier WHERE supplier_id = $1 LIMIT 1`,
        [this.supplierId]
      );
      const isStageAudioWorks = currentSupplierResult.rows.length > 0 && 
        currentSupplierResult.rows[0].name.toLowerCase().includes('stage audio works');

      // Build set of SKUs to exclude (batch check)
      const skusToExclude = new Set<string>();
      if (isStageAudioWorks) {
        console.log(`[PlusPortal CSV] Stage Audio Works detected - performing batch SKU deduplication...`);
        
        // Get excluded supplier IDs
        const excludedSupplierIds = await this.getExcludedSupplierIds();
        
        if (excludedSupplierIds.length > 0) {
          // Get all SKUs from products
          const allSkus = products.map(p => p.supplierSku);
          
          // Batch check in chunks of 1000 for efficiency
          const chunkSize = 1000;
          for (let i = 0; i < allSkus.length; i += chunkSize) {
            const chunk = allSkus.slice(i, i + chunkSize);
            const skuCheckResult = await batchCheckSKUs(chunk, excludedSupplierIds);
            
            for (const [sku, check] of skuCheckResult) {
              if (check.exists) {
                skusToExclude.add(sku);
              }
            }
          }
          
          console.log(`[PlusPortal CSV] Found ${skusToExclude.size} SKUs to exclude (exist in other suppliers)`);
        }
      }

      // Process products in batches
      const batchSize = 50;
      let processedCount = 0;
      
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        for (const product of batch) {
          try {
            // Skip if SKU exists in excluded suppliers
            if (skusToExclude.has(product.supplierSku)) {
              result.productsSkipped++;
              continue;
            }

            // Upsert product
            const upsertResult = await this.upsertProduct(product);
            if (upsertResult.created) {
              result.productsCreated++;
            } else if (upsertResult.updated) {
              result.productsUpdated++;
            } else {
              result.productsSkipped++;
              if (upsertResult.error) {
                result.errors.push(`SKU ${product.supplierSku}: ${upsertResult.error}`);
              }
            }
          } catch (error) {
            result.productsSkipped++;
            result.errors.push(
              `SKU ${product.supplierSku}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
        
        processedCount += batch.length;
        if (processedCount % 500 === 0) {
          console.log(`[PlusPortal CSV] Progress: ${processedCount}/${products.length} products processed`);
        }
      }

      console.log(`[PlusPortal CSV] Complete: ${result.productsCreated} created, ${result.productsUpdated} updated, ${result.productsSkipped} skipped`);

      // Update sync log if provided
      if (logId) {
        await query(
          `UPDATE core.plusportal_sync_log 
           SET products_processed = $1,
               products_created = $2,
               products_updated = $3,
               products_skipped = $4,
               errors = $5::jsonb
           WHERE log_id = $6`,
          [
            result.productsProcessed,
            result.productsCreated,
            result.productsUpdated,
            result.productsSkipped,
            JSON.stringify(result.errors.slice(0, 100)), // Limit errors to first 100
            logId,
          ]
        );
      }

      return result;
    } catch (error) {
      result.errors.push(`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get excluded supplier IDs for SKU deduplication
   */
  private async getExcludedSupplierIds(): Promise<string[]> {
    const excludedNames = ['Sennheiser', 'Active Music Distribution', 'AV Distribution'];
    const supplierIds: string[] = [];
    
    for (const name of excludedNames) {
      const supplierId = await findSupplierByName(name);
      if (supplierId) {
        supplierIds.push(supplierId);
      }
    }
    
    return supplierIds;
  }

  /**
   * Upsert product in database
   * Stores stock and price data in:
   * - attrs_json (for quick access: stock_quantity, cost_excluding)
   * - core.price_history (for price tracking)
   * - core.stock_on_hand (for stock tracking)
   */
  private async upsertProduct(product: ProcessedProduct): Promise<{
    created: boolean;
    updated: boolean;
    error?: string;
  }> {
    try {
      return await withTransaction(async (client) => {
        // Check if product exists
        const existing = await client.query<{
          supplier_product_id: string;
          attrs_json: Record<string, unknown>;
        }>(
          `SELECT supplier_product_id, attrs_json
           FROM core.supplier_product
           WHERE supplier_id = $1 AND supplier_sku = $2`,
          [this.supplierId, product.supplierSku]
        );

        let productId: string;
        let isNew = false;

        if (existing.rows.length > 0) {
          // Update existing product
          productId = existing.rows[0].supplier_product_id;
          const existingAttrs = existing.rows[0].attrs_json || {};

          // Merge attrs with standardized field names
          const mergedAttrs = {
            ...existingAttrs,
            ...product.attrs,
            // Standardized fields for stock and price
            stock_quantity: product.stockOnHand ?? existingAttrs.stock_quantity,
            stock_on_hand: product.stockOnHand ?? existingAttrs.stock_on_hand,
            cost_excluding: product.costExVat ?? existingAttrs.cost_excluding,
            quantity_on_order: product.quantityOnOrder ?? existingAttrs.quantity_on_order,
            last_sync_at: new Date().toISOString(),
          };

          await client.query(
            `UPDATE core.supplier_product
             SET 
               name_from_supplier = $1,
               attrs_json = $2,
               last_seen_at = NOW(),
               is_active = true,
               updated_at = NOW()
             WHERE supplier_product_id = $3`,
            [product.name, JSON.stringify(mergedAttrs), productId]
          );
        } else {
          // Create new product with standardized attrs
          const attrs = {
            ...product.attrs,
            stock_quantity: product.stockOnHand,
            stock_on_hand: product.stockOnHand,
            cost_excluding: product.costExVat,
            quantity_on_order: product.quantityOnOrder,
            last_sync_at: new Date().toISOString(),
          };

          const insertResult = await client.query<{ supplier_product_id: string }>(
            `INSERT INTO core.supplier_product (
               supplier_id, supplier_sku, name_from_supplier, uom, attrs_json,
               first_seen_at, last_seen_at, is_active, is_new
             ) VALUES ($1, $2, $3, 'EA', $4, NOW(), NOW(), true, true)
             RETURNING supplier_product_id`,
            [this.supplierId, product.supplierSku, product.name, JSON.stringify(attrs)]
          );

          productId = insertResult.rows[0].supplier_product_id;
          isNew = true;
        }

        // Update price history if cost changed
        if (product.costExVat !== null) {
          if (isNew) {
            await this.createPriceHistory(client, productId, product.costExVat);
          } else {
            await this.updatePriceHistory(client, productId, product.costExVat);
          }
        }

        // Upsert stock_on_hand record
        if (product.stockOnHand !== null) {
          await this.upsertStockOnHand(client, productId, product.stockOnHand, product.costExVat);
        }

        return { created: isNew, updated: !isNew };
      });
    } catch (error) {
      return {
        created: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upsert stock_on_hand record
   */
  private async upsertStockOnHand(
    client: unknown,
    supplierProductId: string,
    qty: number,
    unitCost: number | null
  ): Promise<void> {
    // Get or create default supplier location
    const locationResult = await client.query<{ location_id: string }>(
      `SELECT location_id FROM core.stock_location 
       WHERE supplier_id = $1 AND type = 'supplier' 
       LIMIT 1`,
      [this.supplierId]
    );

    let locationId: string;
    if (locationResult.rows.length > 0) {
      locationId = locationResult.rows[0].location_id;
    } else {
      // Create supplier location
      const newLocation = await client.query<{ location_id: string }>(
        `INSERT INTO core.stock_location (name, type, supplier_id, is_active)
         VALUES ($1, 'supplier', $2, true)
         RETURNING location_id`,
        [`Supplier Stock`, this.supplierId]
      );
      locationId = newLocation.rows[0].location_id;
    }

    // Upsert stock_on_hand
    await client.query(
      `INSERT INTO core.stock_on_hand (location_id, supplier_product_id, qty, unit_cost, source, as_of_ts)
       VALUES ($1, $2, $3, $4, 'import', NOW())
       ON CONFLICT (location_id, supplier_product_id) 
       DO UPDATE SET 
         qty = EXCLUDED.qty,
         unit_cost = COALESCE(EXCLUDED.unit_cost, core.stock_on_hand.unit_cost),
         as_of_ts = NOW()`,
      [locationId, supplierProductId, qty, unitCost]
    );
  }

  /**
   * Update price history
   */
  private async updatePriceHistory(
    client: unknown,
    supplierProductId: string,
    newPrice: number
  ): Promise<void> {
    // Get current price
    const current = await client.query<{ price: number }>(
      `SELECT price FROM core.price_history
       WHERE supplier_product_id = $1 AND is_current = true
       ORDER BY valid_from DESC LIMIT 1`,
      [supplierProductId]
    );

    const currentPrice = current.rows[0]?.price;

    // Only update if price changed significantly (> 0.01)
    if (currentPrice !== undefined && Math.abs(currentPrice - newPrice) < 0.01) {
      return;
    }

    // Close current price record
    await client.query(
      `UPDATE core.price_history
       SET valid_to = NOW(), is_current = false
       WHERE supplier_product_id = $1 AND is_current = true`,
      [supplierProductId]
    );

    // Create new price history entry
    await client.query(
      `INSERT INTO core.price_history (
         supplier_product_id, price, currency, valid_from, is_current
       ) VALUES ($1, $2, 'ZAR', NOW(), true)`,
      [supplierProductId, newPrice]
    );
  }

  /**
   * Create initial price history entry
   */
  private async createPriceHistory(
    client: unknown,
    supplierProductId: string,
    price: number
  ): Promise<void> {
    await client.query(
      `INSERT INTO core.price_history (
         supplier_product_id, price, currency, valid_from, is_current
       ) VALUES ($1, $2, 'ZAR', NOW(), true)`,
      [supplierProductId, price]
    );
  }
}

/**
 * Get PlusPortal CSV processor instance
 */
export function getPlusPortalCSVProcessor(supplierId: string): PlusPortalCSVProcessor {
  return new PlusPortalCSVProcessor(supplierId);
}

