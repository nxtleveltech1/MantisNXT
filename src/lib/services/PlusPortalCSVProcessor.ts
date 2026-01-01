/**
 * PlusPortal CSV Processor
 * Processes downloaded CSV files from PlusPortal and imports products
 */

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { query, withTransaction } from '@/lib/database';
import { shouldCreateProductForStageAudioWorks } from './SKUDeduplicationService';

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
   */
  private parseCSV(filePath: string): CSVRow[] {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
          // Try to convert numeric values
          if (context.header) {
            return value;
          }
          const numValue = Number(value);
          if (!isNaN(numValue) && value.trim() !== '') {
            return numValue;
          }
          return value;
        },
      });

      return records as CSVRow[];
    } catch (error) {
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map CSV row to product data
   * Adjust column names based on actual CSV structure
   */
  private mapCSVRowToProduct(row: CSVRow): ProcessedProduct | null {
    // Common column name variations
    const skuColumns = ['sku', 'supplier_sku', 'part_number', 'product_code', 'item_code'];
    const nameColumns = ['name', 'description', 'product_name', 'item_name'];
    const priceColumns = ['price', 'cost', 'cost_price', 'unit_price', 'dealer_price'];
    const stockColumns = ['stock', 'stock_on_hand', 'soh', 'quantity', 'qty'];
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

      // Process each row
      for (const row of rows) {
        try {
          const product = this.mapCSVRowToProduct(row);
          if (!product) {
            result.productsSkipped++;
            continue;
          }

          // Check if product should be created (SKU deduplication)
          const shouldCreate = await shouldCreateProductForStageAudioWorks(
            product.supplierSku,
            this.supplierId
          );

          if (!shouldCreate.shouldCreate) {
            result.productsSkipped++;
            if (shouldCreate.reason) {
              result.errors.push(`SKU ${product.supplierSku}: ${shouldCreate.reason}`);
            }
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
            `Row processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

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
            JSON.stringify(result.errors),
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
   * Upsert product in database
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

        if (existing.rows.length > 0) {
          // Update existing product
          const productId = existing.rows[0].supplier_product_id;
          const existingAttrs = existing.rows[0].attrs_json || {};

          const mergedAttrs = {
            ...existingAttrs,
            ...product.attrs,
            cost_excluding: product.costExVat ?? existingAttrs.cost_excluding,
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

          // Update price history if cost changed
          if (product.costExVat !== null) {
            await this.updatePriceHistory(client, productId, product.costExVat);
          }

          return { created: false, updated: true };
        } else {
          // Create new product
          const insertResult = await client.query<{ supplier_product_id: string }>(
            `INSERT INTO core.supplier_product (
               supplier_id, supplier_sku, name_from_supplier, uom, attrs_json,
               first_seen_at, last_seen_at, is_active, is_new
             ) VALUES ($1, $2, $3, 'EA', $4, NOW(), NOW(), true, true)
             RETURNING supplier_product_id`,
            [this.supplierId, product.supplierSku, product.name, JSON.stringify(product.attrs)]
          );

          // Create initial price history entry
          if (product.costExVat !== null && insertResult.rows.length > 0) {
            const productId = insertResult.rows[0].supplier_product_id;
            await this.createPriceHistory(client, productId, product.costExVat);
          }

          return { created: true, updated: false };
        }
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
   * Update price history
   */
  private async updatePriceHistory(
    client: any,
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
         supplier_product_id, price, valid_from, is_current
       ) VALUES ($1, $2, NOW(), true)`,
      [supplierProductId, newPrice]
    );
  }

  /**
   * Create initial price history entry
   */
  private async createPriceHistory(
    client: any,
    supplierProductId: string,
    price: number
  ): Promise<void> {
    await client.query(
      `INSERT INTO core.price_history (
         supplier_product_id, price, valid_from, is_current
       ) VALUES ($1, $2, NOW(), true)`,
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

