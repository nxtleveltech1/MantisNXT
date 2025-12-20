/**
 * SupplierJsonSyncService - Sync supplier product data from JSON/API feeds
 *
 * Supports different feed types:
 * - WooCommerce REST API (stage_one, woocommerce)
 * - Custom JSON feeds
 *
 * Features:
 * - Manual and scheduled sync
 * - Product data mapping (SUP-SOH, Stock on Order, pricing)
 * - Pagination support for large catalogs
 * - Sync logging and status tracking
 */

import { query, withTransaction } from '@/lib/database';

// ============================================================================
// TYPES
// ============================================================================

export interface JsonFeedConfig {
  supplierId: string;
  feedUrl: string;
  feedType: 'woocommerce' | 'stage_one' | 'custom';
  enabled: boolean;
  intervalMinutes: number;
}

export interface ExternalProduct {
  id: number | string;
  sku: string;
  name: string;
  price?: string;
  regular_price?: string;
  stock_quantity?: number | null;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  manage_stock?: boolean;
  backorders?: string;
  backorders_allowed?: boolean;
  categories?: Array<{ id: number; name: string }>;
  images?: Array<{ src: string }>;
  description?: string;
  short_description?: string;
  stock_on_order?: string | number;
  [key: string]: unknown;
}

export interface SyncResult {
  success: boolean;
  logId?: string;
  productsFetched: number;
  productsUpdated: number;
  productsCreated: number;
  productsFailed: number;
  errorMessage?: string;
  details?: Record<string, unknown>;
}

export interface SupplierFeedStatus {
  supplierId: string;
  feedUrl: string | null;
  feedEnabled: boolean;
  feedType: string;
  intervalMinutes: number;
  lastSync: Date | null;
  lastStatus: {
    success: boolean;
    message?: string;
    productsUpdated?: number;
    timestamp?: string;
  } | null;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class SupplierJsonSyncService {
  private supplierId: string;

  constructor(supplierId: string) {
    this.supplierId = supplierId;
  }

  /**
   * Get the feed configuration for this supplier
   */
  async getFeedConfig(): Promise<JsonFeedConfig | null> {
    const result = await query<{
      supplier_id: string;
      json_feed_url: string | null;
      json_feed_enabled: boolean;
      json_feed_type: string;
      json_feed_interval_minutes: number;
    }>(
      `SELECT 
        supplier_id,
        json_feed_url,
        json_feed_enabled,
        json_feed_type,
        json_feed_interval_minutes
      FROM core.supplier
      WHERE supplier_id = $1`,
      [this.supplierId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row.json_feed_url) {
      return null;
    }

    return {
      supplierId: row.supplier_id,
      feedUrl: row.json_feed_url,
      feedType: row.json_feed_type as 'woocommerce' | 'stage_one' | 'custom',
      enabled: row.json_feed_enabled,
      intervalMinutes: row.json_feed_interval_minutes,
    };
  }

  /**
   * Get the current sync status for this supplier
   */
  async getStatus(): Promise<SupplierFeedStatus | null> {
    const result = await query<{
      supplier_id: string;
      json_feed_url: string | null;
      json_feed_enabled: boolean;
      json_feed_type: string;
      json_feed_interval_minutes: number;
      json_feed_last_sync: Date | null;
      json_feed_last_status: Record<string, unknown> | null;
    }>(
      `SELECT 
        supplier_id,
        json_feed_url,
        json_feed_enabled,
        json_feed_type,
        json_feed_interval_minutes,
        json_feed_last_sync,
        json_feed_last_status
      FROM core.supplier
      WHERE supplier_id = $1`,
      [this.supplierId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      supplierId: row.supplier_id,
      feedUrl: row.json_feed_url,
      feedEnabled: row.json_feed_enabled,
      feedType: row.json_feed_type,
      intervalMinutes: row.json_feed_interval_minutes,
      lastSync: row.json_feed_last_sync,
      lastStatus: row.json_feed_last_status as SupplierFeedStatus['lastStatus'],
    };
  }

  /**
   * Update the feed configuration for this supplier
   */
  async updateFeedConfig(config: Partial<JsonFeedConfig>): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (config.feedUrl !== undefined) {
      updates.push(`json_feed_url = $${paramIndex++}`);
      values.push(config.feedUrl);
    }
    if (config.feedType !== undefined) {
      updates.push(`json_feed_type = $${paramIndex++}`);
      values.push(config.feedType);
    }
    if (config.enabled !== undefined) {
      updates.push(`json_feed_enabled = $${paramIndex++}`);
      values.push(config.enabled);
    }
    if (config.intervalMinutes !== undefined) {
      updates.push(`json_feed_interval_minutes = $${paramIndex++}`);
      values.push(config.intervalMinutes);
    }

    if (updates.length === 0) {
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(this.supplierId);

    await query(
      `UPDATE core.supplier SET ${updates.join(', ')} WHERE supplier_id = $${paramIndex}`,
      values
    );
  }

  /**
   * Fetch products from the JSON feed with pagination support
   */
  async fetchProductsFromFeed(feedUrl: string, feedType: string, page = 1, perPage = 100): Promise<ExternalProduct[]> {
    // Build URL with pagination
    const url = new URL(feedUrl);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));

    console.log(`[JsonSync] Fetching ${feedType} from ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: feedType === 'stage_one' ? 'application/xml, application/json' : 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'MantisNXT/1.0',
      },
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const text = await response.text();
        errorDetails = text.slice(0, 100);
      } catch (e) {
        errorDetails = response.statusText;
      }
      throw new Error(`Feed request failed (${response.status}): ${errorDetails}`);
    }

    const text = await response.text();

    if (feedType === 'stage_one' || text.trim().startsWith('<?xml')) {
      return this.parseStageOneXml(text);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[JsonSync] Failed to parse response as JSON:', text.slice(0, 500));
      if (text.trim().startsWith('<html') || text.trim().startsWith('<!DOCTYPE')) {
        throw new Error('Feed URL returned HTML instead of JSON. Please check the URL.');
      }
      throw new Error(`Invalid JSON response from feed: ${text.slice(0, 100)}...`);
    }

    // Handle both array response and wrapped response
    if (Array.isArray(data)) {
      return data;
    } else if (data.products && Array.isArray(data.products)) {
      return data.products;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }

    throw new Error('Unexpected response format from feed');
  }

  /**
   * Parse Stage One XML format
   */
  private parseStageOneXml(xmlString: string): ExternalProduct[] {
    const products: ExternalProduct[] = [];
    
    // Extract products using regex (simple and efficient for this structure)
    const productMatches = xmlString.matchAll(/<product>(.*?)<\/product>/gs);
    
    for (const match of productMatches) {
      const productXml = match[1];
      
      const id = this.extractXmlText(productXml, 'id');
      const title = this.extractXmlText(productXml, 'title');
      const sku = this.extractXmlText(productXml, 'sku');
      const price = this.extractXmlText(productXml, 'price');
      const stock = this.extractXmlText(productXml, 'stock');
      const status = this.extractXmlText(productXml, 'status');
      const description = this.extractXmlText(productXml, 'description');
      const shortDescription = this.extractXmlText(productXml, 'short_description');
      
      if (!id || !sku) continue;

      // Map XML fields to ExternalProduct format
      const product: ExternalProduct = {
        id,
        sku,
        name: title || 'Unknown Product',
        regular_price: price,
        price: price,
        stock_quantity: stock ? parseInt(stock) : null,
        stock_status: status === 'publish' ? 'instock' : 'outofstock',
        description,
        short_description: shortDescription,
      };

      // Extract images
      const imagesMatch = productXml.match(/<images>(.*?)<\/images>/s);
      if (imagesMatch) {
        const imagesXml = imagesMatch[1];
        const imageMatches = imagesXml.matchAll(/<image>(.*?)<\/image>/g);
        const images: Array<{ src: string }> = [];
        for (const imageMatch of imageMatches) {
          images.push({ src: imageMatch[1].trim() });
        }
        if (images.length > 0) {
          product.images = images;
        }
      }

      // Extract categories
      const categoriesMatch = productXml.match(/<categories>(.*?)<\/categories>/s);
      if (categoriesMatch) {
        const categoriesXml = categoriesMatch[1];
        const mainCategory = this.extractXmlText(categoriesXml, 'main_category');
        const categories: Array<{ id: number; name: string }> = [];
        if (mainCategory) {
          categories.push({ id: 0, name: mainCategory });
        }
        
        const subCategoryMatches = categoriesXml.matchAll(/<sub_category>(.*?)<\/sub_category>/g);
        for (const subMatch of subCategoryMatches) {
          categories.push({ id: 0, name: subMatch[1].trim() });
        }
        if (categories.length > 0) {
          product.categories = categories;
        }
      }

      // Extract custom fields (like stock_on_order)
      const customFieldsMatch = productXml.match(/<custom_fields>(.*?)<\/custom_fields>/s);
      if (customFieldsMatch) {
        const customFieldsXml = customFieldsMatch[1];
        const stockOnOrder = this.extractXmlText(customFieldsXml, 'stock_on_order');
        if (stockOnOrder) {
          product.stock_on_order = stockOnOrder;
        }
      }

      products.push(product);
    }
    
    return products;
  }

  /**
   * Helper to extract text from XML tag
   */
  private extractXmlText(xml: string, tagName: string): string | undefined {
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
   * Fetch all products with automatic pagination
   */
  async fetchAllProducts(feedUrl: string, feedType: string, maxPages = 50): Promise<ExternalProduct[]> {
    const allProducts: ExternalProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const products = await this.fetchProductsFromFeed(feedUrl, feedType, page, 100);

      if (products.length === 0) {
        hasMore = false;
      } else {
        allProducts.push(...products);
        
        if (products.length < 100) {
          hasMore = false;
        } else {
          page++;
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    return allProducts;
  }

  /**
   * Map external product to internal format
   */
  mapProduct(external: ExternalProduct): {
    supplierSku: string;
    name: string;
    costExVat: number | null;
    supSoh: number | null;
    qtyOnOrder: number | null;
    stockStatus: string;
    externalId: string;
    attrs: Record<string, unknown>;
  } {
    // Extract SKU - use product ID as fallback
    const supplierSku = external.sku || String(external.id);

    // Parse price - prefer regular_price over price
    const priceStr = external.regular_price || external.price;
    const costExVat = priceStr ? parseFloat(priceStr) : null;

    // Stock on hand from stock_quantity
    const supSoh =
      external.stock_quantity !== null && external.stock_quantity !== undefined
        ? external.stock_quantity
        : null;

    // Determine quantity on order based on backorder settings
    // If backorders are allowed and stock is 0 or negative, we assume items are on order
    let qtyOnOrder: number | null = null;
    
    // Check for explicit stock_on_order (from Stage One)
    if (external.stock_on_order !== undefined && external.stock_on_order !== null) {
      qtyOnOrder = parseInt(String(external.stock_on_order)) || 0;
    } else if (
      (external.backorders_allowed || external.backorders === 'yes' || external.backorders === 'notify') &&
      (supSoh === null || supSoh <= 0) &&
      external.stock_status === 'onbackorder'
    ) {
      // We don't have exact qty on order, mark as having backorders
      qtyOnOrder = -1; // Indicates backorders exist but qty unknown
    }

    // Stock status
    const stockStatus = external.stock_status || (supSoh && supSoh > 0 ? 'instock' : 'outofstock');

    // Build attrs object with all relevant data
    const attrs: Record<string, unknown> = {
      external_id: String(external.id),
      stock_quantity: supSoh,
      qty_on_order: qtyOnOrder,
      stock_status: stockStatus,
      backorders_allowed: external.backorders_allowed || external.backorders === 'yes',
      manage_stock: external.manage_stock,
      last_sync_at: new Date().toISOString(),
      ...(external.description ? { description: external.description } : {}),
      ...(external.short_description ? { short_description: external.short_description } : {}),
      ...(external.permalink ? { permalink: external.permalink } : {}),
    };

    // Include categories if present
    if (external.categories && external.categories.length > 0) {
      attrs.categories = external.categories.map((c) => ({
        id: c.id,
        name: c.name,
      }));
    }

    // Include image if present
    if (external.images && external.images.length > 0) {
      attrs.primary_image_url = external.images[0].src;
    }

    return {
      supplierSku,
      name: external.name || 'Unknown Product',
      costExVat,
      supSoh,
      qtyOnOrder,
      stockStatus,
      externalId: String(external.id),
      attrs,
    };
  }

  /**
   * Sync a single product to the database
   */
  async syncProduct(
    mapped: ReturnType<typeof this.mapProduct>
  ): Promise<{ action: 'created' | 'updated' | 'error'; error?: string }> {
    try {
      // Check if product exists
      const existing = await query<{ supplier_product_id: string; attrs_json: Record<string, unknown> }>(
        `SELECT supplier_product_id, attrs_json
         FROM core.supplier_product
         WHERE supplier_id = $1 AND supplier_sku = $2`,
        [this.supplierId, mapped.supplierSku]
      );

      if (existing.rows.length > 0) {
        // Update existing product
        const productId = existing.rows[0].supplier_product_id;
        const existingAttrs = existing.rows[0].attrs_json || {};

        // Merge attrs, preserving existing data
        const mergedAttrs = {
          ...existingAttrs,
          ...mapped.attrs,
          // Preserve cost_excluding if we have a new value
          cost_excluding: mapped.costExVat ?? existingAttrs.cost_excluding,
        };

        await query(
          `UPDATE core.supplier_product
           SET 
             name_from_supplier = $1,
             attrs_json = $2,
             last_seen_at = NOW(),
             is_active = true,
             updated_at = NOW()
           WHERE supplier_product_id = $3`,
          [mapped.name, JSON.stringify(mergedAttrs), productId]
        );

        // Also update price history if cost changed
        if (mapped.costExVat !== null) {
          await this.updatePriceHistory(productId, mapped.costExVat);
        }

        return { action: 'updated' };
      } else {
        // Create new product
        const insertResult = await query<{ supplier_product_id: string }>(
          `INSERT INTO core.supplier_product (
             supplier_id, supplier_sku, name_from_supplier, uom, attrs_json,
             first_seen_at, last_seen_at, is_active, is_new
           ) VALUES ($1, $2, $3, 'EA', $4, NOW(), NOW(), true, true)
           RETURNING supplier_product_id`,
          [this.supplierId, mapped.supplierSku, mapped.name, JSON.stringify(mapped.attrs)]
        );

        // Create initial price history entry
        if (mapped.costExVat !== null && insertResult.rows.length > 0) {
          const productId = insertResult.rows[0].supplier_product_id;
          await this.createPriceHistory(productId, mapped.costExVat);
        }

        return { action: 'created' };
      }
    } catch (error) {
      console.error(`[JsonSync] Error syncing product ${mapped.supplierSku}:`, error);
      return { action: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update price history for a product
   */
  private async updatePriceHistory(supplierProductId: string, newPrice: number): Promise<void> {
    // Get current price
    const current = await query<{ price: number }>(
      `SELECT price FROM core.price_history
       WHERE supplier_product_id = $1 AND is_current = true
       ORDER BY valid_from DESC LIMIT 1`,
      [supplierProductId]
    );

    const currentPrice = current.rows[0]?.price;

    // Only update if price changed
    if (currentPrice !== undefined && Math.abs(currentPrice - newPrice) < 0.01) {
      return;
    }

    // Close current price record
    await query(
      `UPDATE core.price_history
       SET valid_to = NOW(), is_current = false
       WHERE supplier_product_id = $1 AND is_current = true`,
      [supplierProductId]
    );

    // Create new price record
    await this.createPriceHistory(supplierProductId, newPrice);
  }

  /**
   * Create a new price history entry
   */
  private async createPriceHistory(supplierProductId: string, price: number): Promise<void> {
    await query(
      `INSERT INTO core.price_history (
         supplier_product_id, price, currency, valid_from, is_current, change_reason
       ) VALUES ($1, $2, 'ZAR', NOW(), true, 'JSON feed sync')`,
      [supplierProductId, price]
    );
  }

  /**
   * Create sync log entry
   */
  private async createSyncLog(): Promise<string> {
    const result = await query<{ log_id: string }>(
      `INSERT INTO core.supplier_json_feed_log (supplier_id, status)
       VALUES ($1, 'in_progress')
       RETURNING log_id`,
      [this.supplierId]
    );
    return result.rows[0].log_id;
  }

  /**
   * Update sync log progress (without marking as complete)
   */
  private async updateSyncLogProgress(
    logId: string,
    stats: {
      productsFetched: number;
      productsProcessed: number;
      productsUpdated: number;
      productsCreated: number;
      productsFailed: number;
    }
  ): Promise<void> {
    await query(
      `UPDATE core.supplier_json_feed_log
       SET 
         products_fetched = $1,
         products_updated = $2,
         products_created = $3,
         products_failed = $4,
         details = $5
       WHERE log_id = $6`,
      [
        stats.productsFetched,
        stats.productsUpdated,
        stats.productsCreated,
        stats.productsFailed,
        JSON.stringify({
          productsProcessed: stats.productsProcessed,
          progress: stats.productsFetched > 0 ? Math.round((stats.productsProcessed / stats.productsFetched) * 100) : 0,
        }),
        logId,
      ]
    );
  }

  /**
   * Update sync log with results
   */
  private async updateSyncLog(
    logId: string,
    status: 'success' | 'error',
    stats: {
      productsFetched: number;
      productsUpdated: number;
      productsCreated: number;
      productsFailed: number;
      errorMessage?: string;
      details?: Record<string, unknown>;
    }
  ): Promise<void> {
    await query(
      `UPDATE core.supplier_json_feed_log
       SET 
         sync_completed_at = NOW(),
         status = $1,
         products_fetched = $2,
         products_updated = $3,
         products_created = $4,
         products_failed = $5,
         error_message = $6,
         details = $7
       WHERE log_id = $8`,
      [
        status,
        stats.productsFetched,
        stats.productsUpdated,
        stats.productsCreated,
        stats.productsFailed,
        stats.errorMessage || null,
        stats.details ? JSON.stringify(stats.details) : null,
        logId,
      ]
    );

    // Also update supplier's last sync status
    await query(
      `UPDATE core.supplier
       SET 
         json_feed_last_sync = NOW(),
         json_feed_last_status = $1,
         updated_at = NOW()
       WHERE supplier_id = $2`,
      [
        JSON.stringify({
          success: status === 'success',
          message: stats.errorMessage || `Synced ${stats.productsUpdated + stats.productsCreated} products`,
          productsUpdated: stats.productsUpdated,
          productsCreated: stats.productsCreated,
          timestamp: new Date().toISOString(),
        }),
        this.supplierId,
      ]
    );
  }

  /**
   * Perform full sync from JSON feed
   */
  async sync(): Promise<SyncResult> {
    console.log(`[JsonSync] Starting sync for supplier ${this.supplierId}`);

    // Get feed config
    const config = await this.getFeedConfig();
    if (!config || !config.feedUrl) {
      return {
        success: false,
        productsFetched: 0,
        productsUpdated: 0,
        productsCreated: 0,
        productsFailed: 0,
        errorMessage: 'No JSON feed URL configured for this supplier',
      };
    }

    // Create sync log
    const logId = await this.createSyncLog();

    const stats = {
      productsFetched: 0,
      productsUpdated: 0,
      productsCreated: 0,
      productsFailed: 0,
      errorMessage: undefined as string | undefined,
      details: {} as Record<string, unknown>,
    };

    try {
      // Fetch all products
      console.log(`[JsonSync] Fetching products from ${config.feedUrl} (${config.feedType})`);
      const products = await this.fetchAllProducts(config.feedUrl, config.feedType);
      stats.productsFetched = products.length;
      console.log(`[JsonSync] Fetched ${products.length} products`);

      // Update log with initial progress
      await this.updateSyncLogProgress(logId, {
        productsFetched: stats.productsFetched,
        productsProcessed: 0,
        productsUpdated: 0,
        productsCreated: 0,
        productsFailed: 0,
      });

      // Process products in batches to avoid overwhelming the database
      const BATCH_SIZE = 50;
      let processed = 0;

      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel (but limit concurrency)
        const batchResults = await Promise.allSettled(
          batch.map(async (product) => {
            const mapped = this.mapProduct(product);
            return await this.syncProduct(mapped);
          })
        );

        // Count results
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            if (result.value.action === 'created') {
              stats.productsCreated++;
            } else if (result.value.action === 'updated') {
              stats.productsUpdated++;
            } else if (result.value.action === 'error') {
              stats.productsFailed++;
            }
          } else {
            stats.productsFailed++;
          }
        }

        processed += batch.length;

        // Update progress every batch
        if (processed % (BATCH_SIZE * 2) === 0 || processed === products.length) {
          await this.updateSyncLogProgress(logId, {
            productsFetched: stats.productsFetched,
            productsProcessed: processed,
            productsUpdated: stats.productsUpdated,
            productsCreated: stats.productsCreated,
            productsFailed: stats.productsFailed,
          });
          console.log(`[JsonSync] Progress: ${processed}/${products.length} products processed`);
        }
      }

      // Update log with success
      await this.updateSyncLog(logId, 'success', stats);

      console.log(
        `[JsonSync] Sync complete: ${stats.productsUpdated} updated, ${stats.productsCreated} created, ${stats.productsFailed} failed`
      );

      return {
        success: true,
        logId,
        ...stats,
      };
    } catch (error) {
      stats.errorMessage = error instanceof Error ? error.message : 'Unknown error during sync';
      console.error(`[JsonSync] Sync failed:`, error);

      // Update log with error
      await this.updateSyncLog(logId, 'error', stats);

      return {
        success: false,
        logId,
        ...stats,
      };
    }
  }

  /**
   * Get recent sync logs
   */
  async getSyncLogs(limit = 10): Promise<
    Array<{
      logId: string;
      syncStartedAt: Date;
      syncCompletedAt: Date | null;
      status: string;
      productsFetched: number;
      productsUpdated: number;
      productsCreated: number;
      productsFailed: number;
      errorMessage: string | null;
    }>
  > {
    const result = await query<{
      log_id: string;
      sync_started_at: Date;
      sync_completed_at: Date | null;
      status: string;
      products_fetched: number;
      products_updated: number;
      products_created: number;
      products_failed: number;
      error_message: string | null;
    }>(
      `SELECT 
        log_id, sync_started_at, sync_completed_at, status,
        products_fetched, products_updated, products_created, products_failed,
        error_message
       FROM core.supplier_json_feed_log
       WHERE supplier_id = $1
       ORDER BY sync_started_at DESC
       LIMIT $2`,
      [this.supplierId, limit]
    );

    return result.rows.map((row) => ({
      logId: row.log_id,
      syncStartedAt: row.sync_started_at,
      syncCompletedAt: row.sync_completed_at,
      status: row.status,
      productsFetched: row.products_fetched,
      productsUpdated: row.products_updated,
      productsCreated: row.products_created,
      productsFailed: row.products_failed,
      errorMessage: row.error_message,
    }));
  }
}

// ============================================================================
// FACTORY AND HELPERS
// ============================================================================

/**
 * Get sync service for a supplier
 */
export function getSupplierJsonSyncService(supplierId: string): SupplierJsonSyncService {
  return new SupplierJsonSyncService(supplierId);
}

/**
 * Get all suppliers due for sync
 */
export async function getSuppliersNeedingSync(): Promise<
  Array<{
    supplierId: string;
    name: string;
    feedUrl: string;
    intervalMinutes: number;
    lastSync: Date | null;
  }>
> {
  const result = await query<{
    supplier_id: string;
    name: string;
    json_feed_url: string;
    json_feed_interval_minutes: number;
    json_feed_last_sync: Date | null;
  }>(
    `SELECT 
      supplier_id, name, json_feed_url, json_feed_interval_minutes, json_feed_last_sync
     FROM core.supplier
     WHERE json_feed_enabled = true
       AND json_feed_url IS NOT NULL
       AND (
         json_feed_last_sync IS NULL
         OR json_feed_last_sync < NOW() - (json_feed_interval_minutes || ' minutes')::INTERVAL
       )
     ORDER BY json_feed_last_sync ASC NULLS FIRST`
  );

  return result.rows.map((row) => ({
    supplierId: row.supplier_id,
    name: row.name,
    feedUrl: row.json_feed_url,
    intervalMinutes: row.json_feed_interval_minutes,
    lastSync: row.json_feed_last_sync,
  }));
}

export default SupplierJsonSyncService;

