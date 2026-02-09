/**
 * PlusPortal Data Processor
 * Processes scraped product data from PlusPortal Shopping tab
 * Includes SKU-level discount rule synchronization
 */

import { query, withTransaction } from '@/lib/database';
import { locationService } from '@/lib/services/LocationService';
import { findSupplierByName } from '@/lib/utils/supplier-matcher';
import type { ScrapedProduct } from './PlusPortalTableScraper';
import { batchCheckSKUs } from './SKUDeduplicationService';

export interface ProcessedProduct {
  supplierSku: string;
  name: string;
  availability: string;
  priceBeforeDiscount: number;
  discountPercent: number;
  costExVat: number; // Price after discount
  stockStatus: string;
  attrs: Record<string, unknown>;
}

export interface ProcessingResult {
  productsProcessed: number;
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  discountRulesCreated: number;
  discountRulesUpdated: number;
  errors: string[];
}

/**
 * Map availability string to stock status
 */
function mapAvailabilityToStockStatus(availability: string): string {
  const normalized = availability.toLowerCase().trim();
  
  if (normalized === 'instock' || normalized === 'in_stock' || normalized === 'in stock') {
    return 'instock';
  }
  if (normalized === 'outofstock' || normalized === 'out_of_stock' || normalized === 'out of stock') {
    return 'outofstock';
  }
  if (normalized === 'special_order' || normalized.includes('special')) {
    return 'onbackorder'; // Treat special order as backorder
  }
  if (normalized === 'backorder' || normalized.includes('back')) {
    return 'onbackorder';
  }
  if (normalized === 'low_stock' || normalized.includes('low')) {
    return 'lowstock';
  }
  if (normalized === 'discontinued') {
    return 'discontinued';
  }
  
  // Default to special order for unknown statuses
  return 'onbackorder';
}

export class PlusPortalDataProcessor {
  private supplierId: string;

  constructor(supplierId: string) {
    this.supplierId = supplierId;
  }

  /**
   * Update sync log progress
   */
  private async updateProgress(logId: string, stage: string, progressPercent: number): Promise<void> {
    try {
      await query(
        `UPDATE core.plusportal_sync_log 
         SET details = jsonb_set(
           jsonb_set(
             COALESCE(details, '{}'::jsonb),
             '{currentStage}',
             $1::jsonb,
             true
           ),
           '{progressPercent}',
           $2::jsonb,
           true
         )
         WHERE log_id = $3`,
        [JSON.stringify(stage), progressPercent, logId]
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // If details column doesn't exist, skip progress update (not critical)
      if (errorMsg.includes('does not exist') && errorMsg.includes('details')) {
        console.warn('[PlusPortal Data] Details column not available, skipping progress update');
      } else {
        console.error('[PlusPortal Data] Failed to update progress:', error);
      }
      // Don't throw - progress updates are not critical
    }
  }

  /**
   * Map scraped product to processed product format
   */
  private mapScrapedToProcessed(product: ScrapedProduct): ProcessedProduct {
    return {
      supplierSku: product.productCode.trim(),
      name: product.description.trim(),
      availability: product.availability,
      priceBeforeDiscount: product.priceBeforeDiscount,
      discountPercent: product.discountPercent,
      costExVat: product.priceAfterDiscount, // This is our actual cost
      stockStatus: mapAvailabilityToStockStatus(product.availability),
      attrs: {
        // Store all raw data for reference
        raw_availability: product.availability,
        price_before_discount: product.priceBeforeDiscount,
        discount_percent: product.discountPercent,
        price_after_discount: product.priceAfterDiscount,
        image_url: product.imageUrl,
        // Standard fields
        cost_excluding: product.priceAfterDiscount,
        list_price: product.priceBeforeDiscount,
        base_discount: product.discountPercent,
        last_sync_at: new Date().toISOString(),
        sync_source: 'plusportal_shopping',
      },
    };
  }

  /**
   * Process scraped products and import them
   */
  async processScrapedData(products: ScrapedProduct[], logId?: string): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      productsProcessed: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsSkipped: 0,
      discountRulesCreated: 0,
      discountRulesUpdated: 0,
      errors: [],
    };

    try {
      result.productsProcessed = products.length;
      console.log(`[PlusPortal Data] Processing ${products.length} scraped products...`);

      if (logId) {
        await this.updateProgress(logId, 'Mapping products...', 82);
      }

      // Map scraped products to processed format
      const processedProducts: ProcessedProduct[] = [];
      for (const product of products) {
        if (product.productCode && product.productCode.trim()) {
          processedProducts.push(this.mapScrapedToProcessed(product));
        } else {
          result.productsSkipped++;
        }
      }
      console.log(`[PlusPortal Data] Mapped ${processedProducts.length} valid products`);

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
        console.log(`[PlusPortal Data] Stage Audio Works detected - performing batch SKU deduplication...`);
        
        const excludedSupplierIds = await this.getExcludedSupplierIds();
        
        if (excludedSupplierIds.length > 0) {
          const allSkus = processedProducts.map(p => p.supplierSku);
          
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
          
          console.log(`[PlusPortal Data] Found ${skusToExclude.size} SKUs to exclude (exist in other suppliers)`);
        }
      }

      // Process products in batches
      const batchSize = 50;
      let processedCount = 0;
      
      if (logId) {
        await this.updateProgress(logId, 'Processing products and discount rules...', 85);
      }
      
      for (let i = 0; i < processedProducts.length; i += batchSize) {
        const batch = processedProducts.slice(i, i + batchSize);
        
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

            // Sync discount rule if product has a discount
            if (product.discountPercent > 0) {
              const discountResult = await this.syncDiscountRule(product.supplierSku, product.discountPercent);
              if (discountResult.created) {
                result.discountRulesCreated++;
              } else if (discountResult.updated) {
                result.discountRulesUpdated++;
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
        
        // Update progress every batch
        if (logId && processedProducts.length > 0) {
          const progressPercent = 85 + Math.floor((processedCount / processedProducts.length) * 12); // 85-97%
          await this.updateProgress(
            logId,
            `Processing products... (${processedCount}/${processedProducts.length})`,
            progressPercent
          );
        }
        
        if (processedCount % 500 === 0) {
          console.log(`[PlusPortal Data] Progress: ${processedCount}/${processedProducts.length} products processed`);
        }
      }

      console.log(`[PlusPortal Data] Complete: ${result.productsCreated} created, ${result.productsUpdated} updated, ${result.productsSkipped} skipped`);
      console.log(`[PlusPortal Data] Discount rules: ${result.discountRulesCreated} created, ${result.discountRulesUpdated} updated`);

      // Update sync log if provided
      if (logId) {
        await this.updateProgress(logId, 'Finalizing...', 98);
        await query(
          `UPDATE core.plusportal_sync_log 
           SET products_processed = $1,
               products_created = $2,
               products_updated = $3,
               products_skipped = $4,
               errors = $5::jsonb,
               details = jsonb_set(
                 jsonb_set(
                   COALESCE(details, '{}'::jsonb), 
                   '{currentStage}', 
                   '"Complete"', 
                   true
                 ),
                 '{progressPercent}', 
                 '100', 
                 true
               )
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
      result.errors.push(`Data processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

          // Merge attrs with new data
          const mergedAttrs = {
            ...existingAttrs,
            ...product.attrs,
          };

          await client.query(
            `UPDATE core.supplier_product
             SET 
               name_from_supplier = $1,
               attrs_json = $2,
               stock_status = $3,
               last_seen_at = NOW(),
               is_active = true,
               updated_at = NOW()
             WHERE supplier_product_id = $4`,
            [product.name, JSON.stringify(mergedAttrs), product.stockStatus, productId]
          );
        } else {
          // Create new product
          const insertResult = await client.query<{ supplier_product_id: string }>(
            `INSERT INTO core.supplier_product (
               supplier_id, supplier_sku, name_from_supplier, uom, attrs_json,
               stock_status, first_seen_at, last_seen_at, is_active, is_new
             ) VALUES ($1, $2, $3, 'EA', $4, $5, NOW(), NOW(), true, true)
             RETURNING supplier_product_id`,
            [this.supplierId, product.supplierSku, product.name, JSON.stringify(product.attrs), product.stockStatus]
          );

          productId = insertResult.rows[0].supplier_product_id;
          isNew = true;
        }

        // Update price history if cost changed
        if (product.costExVat > 0) {
          if (isNew) {
            await this.createPriceHistory(client, productId, product.costExVat);
          } else {
            await this.updatePriceHistory(client, productId, product.costExVat);
          }
        }

        // Upsert stock_on_hand record (using availability-based stock status)
        // For portal data, we don't have exact quantities, so we use status-based approach
        const stockQty = this.getStockQuantityFromStatus(product.stockStatus);
        if (stockQty !== null) {
          await this.upsertStockOnHand(client, productId, stockQty, product.costExVat);
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
   * Get approximate stock quantity from status
   * Since we don't have exact quantities, we use indicators
   */
  private getStockQuantityFromStatus(status: string): number | null {
    // First try to extract actual quantity from availability string
    const extractedQuantity = this.extractQuantityFromAvailability(status);
    if (extractedQuantity !== null) {
      return extractedQuantity;
    }
    
    // Fallback to indicator values for status-only strings
    switch (status) {
      case 'instock':
        return 100; // Indicator that there's stock if no quantity given
      case 'lowstock':
        return 5; // Low stock indicator
      case 'outofstock':
        return 0;
      case 'onbackorder':
      case 'discontinued':
        return 0;
      default:
        return null; // Unknown, don't update
    }
  }

  /**
   * Parse portal availability strings to extract actual quantity
   * Examples:
   * "33 Available" → 33
   * "5 Low Stock" → 5
   * "On Backorder" → 0
   * "1234 Available" → 1234
   * "" → null
   */
  private extractQuantityFromAvailability(value: string): number | null {
    if (!value) return null;
    
    const cleaned = value.trim();
    
    // Extract numbers from text
    const numberMatch = cleaned.match(/(\d+)/);
    if (!numberMatch) return null;
    
    const num = parseInt(numberMatch[1], 10);
    
    // If we extracted a number, it's most likely the actual quantity
    // Portal phrases like "33 Available", "5 Low Stock" directly give us the count
    return num;
  }

  /**
   * Sync discount rule for a SKU
   * Creates or updates a SKU-level discount rule
   */
  private async syncDiscountRule(sku: string, discountPercent: number): Promise<{
    created: boolean;
    updated: boolean;
  }> {
    try {
      const ruleName = `Portal Sync - ${sku}`;
      
      // Check if rule exists
      const existing = await query<{ discount_rule_id: string; discount_percent: number }>(
        `SELECT discount_rule_id, discount_percent 
         FROM core.supplier_discount_rules 
         WHERE supplier_id = $1 AND scope_type = 'sku' AND supplier_sku = $2`,
        [this.supplierId, sku]
      );

      if (existing.rows.length > 0) {
        // Update only if discount changed
        const currentDiscount = existing.rows[0].discount_percent;
        if (Math.abs(currentDiscount - discountPercent) > 0.001) {
          await query(
            `UPDATE core.supplier_discount_rules 
             SET discount_percent = $1, updated_at = NOW()
             WHERE discount_rule_id = $2`,
            [discountPercent, existing.rows[0].discount_rule_id]
          );
          return { created: false, updated: true };
        }
        return { created: false, updated: false };
      } else {
        // Create new rule
        await query(
          `INSERT INTO core.supplier_discount_rules (
             supplier_id, rule_name, discount_percent, scope_type,
             supplier_sku, priority, is_active, valid_from
           ) VALUES ($1, $2, $3, 'sku', $4, 100, true, NOW())`,
          [this.supplierId, ruleName, discountPercent, sku]
        );
        return { created: true, updated: false };
      }
    } catch (error) {
      console.error(`[PlusPortal Data] Failed to sync discount rule for SKU ${sku}:`, error);
      return { created: false, updated: false };
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
    const location = await locationService.getOrCreateSupplierLocation(this.supplierId);
    const locationId = location.location_id;

    // Upsert stock_on_hand
    await (client as { query: typeof query }).query(
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
    const current = await (client as { query: typeof query }).query<{ price: number }>(
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
    await (client as { query: typeof query }).query(
      `UPDATE core.price_history
       SET valid_to = NOW(), is_current = false
       WHERE supplier_product_id = $1 AND is_current = true`,
      [supplierProductId]
    );

    // Create new price history entry
    await (client as { query: typeof query }).query(
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
    await (client as { query: typeof query }).query(
      `INSERT INTO core.price_history (
         supplier_product_id, price, currency, valid_from, is_current
       ) VALUES ($1, $2, 'ZAR', NOW(), true)`,
      [supplierProductId, price]
    );
  }
}

/**
 * Get PlusPortal Data processor instance
 */
export function getPlusPortalDataProcessor(supplierId: string): PlusPortalDataProcessor {
  return new PlusPortalDataProcessor(supplierId);
}
