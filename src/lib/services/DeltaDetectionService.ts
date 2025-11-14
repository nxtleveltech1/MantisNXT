// @ts-nocheck

/**
 * DeltaDetectionService - Production Delta Detection for Sync Preview
 *
 * Detects changes between MantisNXT DB and external systems (WooCommerce, Odoo)
 * using hash-based comparison for safe, efficient change detection.
 *
 * Features:
 * - Hash-based delta detection (safe for 1000+ records)
 * - Cached results (1 hour TTL)
 * - Preview snapshots (first 20 records of each change type)
 * - Supports customers, products, orders
 * - Error handling & activity logging
 */

import crypto from 'crypto';
import { query } from '@/lib/database';
import { WooCommerceService } from './WooCommerceService';
import { OdooService } from './OdooService';

export type SyncType = 'woocommerce' | 'odoo';
export type EntityType = 'customers' | 'products' | 'orders';
export type SyncDirection = 'inbound' | 'outbound';

interface DeltaRecord {
  id: string | number;
  external_id?: string | number;
  name?: string;
  email?: string;
  sku?: string;
  title?: string;
  [key: string]: unknown;
}

interface DeltaSnapshot {
  count: number;
  records: DeltaRecord[];
  hash?: string;
}

interface DeltaResult {
  syncType: SyncType;
  entityType: EntityType;
  direction: SyncDirection;
  delta: {
    new: DeltaSnapshot;
    updated: DeltaSnapshot;
    deleted: DeltaSnapshot;
  };
  computedAt: string;
  expiresAt: string;
  cacheHit: boolean;
  selectiveSyncConfig?: {
    includeNew: boolean;
    includeUpdated: boolean;
    includeDeleted: boolean;
  };
}

interface CachedDeltaContainer {
  inbound?: DeltaResult;
  outbound?: DeltaResult;
}

interface PreviewCacheRecord {
  id: string;
  org_id: string;
  sync_type: SyncType;
  entity_type: EntityType;
  delta_data: CachedDeltaContainer | DeltaResult;
  computed_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generate content hash for change detection
 */
function generateHash(data: unknown): string {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

/**
 * Check if records have changed using hash comparison
 */
function hasRecordChanged(current: unknown, previous: unknown): boolean {
  return generateHash(current) !== generateHash(previous);
}

/**
 * Extract comparable fields from record
 */
function extractComparableFields(record: unknown, entityType: EntityType): unknown {
  switch (entityType) {
    case 'customers':
      return {
        email: record.email,
        name: record.name,
        phone: record.phone,
        company: record.company,
        tags: record.tags,
        metadata: record.metadata,
      };
    case 'products':
      return {
        name: record.name,
        sku: record.sku,
        price: record.price,
        stock_quantity: record.stock_quantity,
        description: record.description,
      };
    case 'orders':
      return {
        status: record.status,
        total: record.total,
        customer_id: record.customer_id,
        billing_email: record.billing?.email,
      };
    default:
      return record;
  }
}

export class DeltaDetectionService {
  /**
   * Get or compute preview snapshot with caching
   */
  static async getPreviewSnapshot(
    orgId: string,
    syncType: SyncType,
    entityType: EntityType,
    forceRefresh: boolean = false,
    direction: SyncDirection = 'inbound'
  ): Promise<DeltaResult> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = await this.getFromCache(orgId, syncType, entityType, direction);
        if (cached) {
          return {
            ...cached,
            cacheHit: true,
          };
        }
      }

      // Compute fresh delta
      let delta;
      switch (entityType) {
        case 'customers':
          delta = await this.detectCustomerDelta(orgId, syncType, direction);
          break;
        case 'products':
          delta = await this.detectProductDelta(orgId, syncType, direction);
          break;
        case 'orders':
          delta = await this.detectOrderDelta(orgId, syncType, direction);
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      // Prepare result
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour TTL

      const result: DeltaResult = {
        syncType,
        entityType,
        direction,
        delta,
        computedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        cacheHit: false,
      };

      // Store in cache
      await this.storeInCache(orgId, result, direction);

      // Log operation
      await this.logActivity(orgId, entityType, 'delta_computed', 'success', {
        newCount: delta.new.count,
        updatedCount: delta.updated.count,
        deletedCount: delta.deleted.count,
        direction,
      });

      return result;
    } catch (error: unknown) {
      console.error(`[DeltaDetectionService] Error getting preview snapshot:`, error);
      await this.logActivity(orgId, entityType, 'delta_computed', 'failed', {
        error: error.message,
        direction,
      });
      throw error;
    }
  }

  /**
   * Detect customer delta between MantisNXT DB and external system
   */
  static async detectCustomerDelta(
    orgId: string,
    syncType: SyncType,
    direction: SyncDirection
  ): Promise<DeltaResult['delta']> {
    try {
      const externalCustomers = await this.fetchExternalCustomers(orgId, syncType);
      const localCustomers = await this.fetchLocalCustomers(orgId);

      // Map for quick lookup
      const externalMap = new Map(
        externalCustomers.map(c => [
          c.email || c.id,
          { ...c, hash: generateHash(extractComparableFields(c, 'customers')) },
        ])
      );
      const localMap = new Map(
        localCustomers.map(c => [
          c.email || c.id,
          { ...c, hash: generateHash(extractComparableFields(c, 'customers')) },
        ])
      );

      const newCustomers: DeltaRecord[] = [];
      const updatedCustomers: DeltaRecord[] = [];
      const deletedCustomers: DeltaRecord[] = [];

      const sourceMap = direction === 'inbound' ? externalMap : localMap;
      const targetMap = direction === 'inbound' ? localMap : externalMap;

      const toCustomerRecord = (customer: Record<string, unknown>): DeltaRecord => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
      });

      sourceMap.forEach((sourceCustomer, key) => {
        const targetCustomer = targetMap.get(key);
        if (!targetCustomer) {
          newCustomers.push(toCustomerRecord(sourceCustomer));
        } else if (sourceCustomer.hash !== targetCustomer.hash) {
          updatedCustomers.push(toCustomerRecord(sourceCustomer));
        }
      });

      targetMap.forEach((targetCustomer, key) => {
        if (!sourceMap.has(key)) {
          deletedCustomers.push(toCustomerRecord(targetCustomer));
        }
      });

      return {
        new: {
          count: newCustomers.length,
          records: newCustomers.slice(0, 20),
        },
        updated: {
          count: updatedCustomers.length,
          records: updatedCustomers.slice(0, 20),
        },
        deleted: {
          count: deletedCustomers.length,
          records: deletedCustomers.slice(0, 20),
        },
      };
    } catch (error: unknown) {
      console.error('[DeltaDetectionService] Error detecting customer delta:', error);
      throw error;
    }
  }

  /**
   * Detect product delta between MantisNXT DB and external system
   */
  static async detectProductDelta(
    orgId: string,
    syncType: SyncType,
    direction: SyncDirection
  ): Promise<DeltaResult['delta']> {
    try {
      const externalProducts = await this.fetchExternalProducts(orgId, syncType);
      const localProducts = await this.fetchLocalProducts(orgId);

      // Map for quick lookup by SKU or ID
      const externalMap = new Map(
        externalProducts.map(p => [
          p.sku || p.id,
          { ...p, hash: generateHash(extractComparableFields(p, 'products')) },
        ])
      );
      const localMap = new Map(
        localProducts.map(p => [
          p.sku || p.id,
          { ...p, hash: generateHash(extractComparableFields(p, 'products')) },
        ])
      );

      const newProducts: DeltaRecord[] = [];
      const updatedProducts: DeltaRecord[] = [];
      const deletedProducts: DeltaRecord[] = [];

      const sourceMap = direction === 'inbound' ? externalMap : localMap;
      const targetMap = direction === 'inbound' ? localMap : externalMap;

      const toProductRecord = (product: Record<string, unknown>): DeltaRecord => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
      });

      sourceMap.forEach((sourceProduct, key) => {
        const targetProduct = targetMap.get(key);
        if (!targetProduct) {
          newProducts.push(toProductRecord(sourceProduct));
        } else if (sourceProduct.hash !== targetProduct.hash) {
          updatedProducts.push(toProductRecord(sourceProduct));
        }
      });

      targetMap.forEach((targetProduct, key) => {
        if (!sourceMap.has(key)) {
          deletedProducts.push(toProductRecord(targetProduct));
        }
      });

      return {
        new: {
          count: newProducts.length,
          records: newProducts.slice(0, 20),
        },
        updated: {
          count: updatedProducts.length,
          records: updatedProducts.slice(0, 20),
        },
        deleted: {
          count: deletedProducts.length,
          records: deletedProducts.slice(0, 20),
        },
      };
    } catch (error: unknown) {
      console.error('[DeltaDetectionService] Error detecting product delta:', error);
      throw error;
    }
  }

  /**
   * Detect order delta between MantisNXT DB and external system
   */
  static async detectOrderDelta(
    orgId: string,
    syncType: SyncType,
    direction: SyncDirection
  ): Promise<DeltaResult['delta']> {
    try {
      const externalOrders = await this.fetchExternalOrders(orgId, syncType);
      const localOrders = await this.fetchLocalOrders(orgId);

      const externalMap = new Map(
        externalOrders.map(o => [
          o.id,
          { ...o, hash: generateHash(extractComparableFields(o, 'orders')) },
        ])
      );
      const localMap = new Map(
        localOrders.map(o => [
          o.id,
          { ...o, hash: generateHash(extractComparableFields(o, 'orders')) },
        ])
      );

      const newOrders: DeltaRecord[] = [];
      const updatedOrders: DeltaRecord[] = [];
      const deletedOrders: DeltaRecord[] = [];

      const sourceMap = direction === 'inbound' ? externalMap : localMap;
      const targetMap = direction === 'inbound' ? localMap : externalMap;

      const toOrderRecord = (order: Record<string, unknown>): DeltaRecord => ({
        id: order.id,
        status: order.status,
        total: order.total,
      });

      sourceMap.forEach((sourceOrder, key) => {
        const targetOrder = targetMap.get(key);
        if (!targetOrder) {
          newOrders.push(toOrderRecord(sourceOrder));
        } else if (sourceOrder.hash !== targetOrder.hash) {
          updatedOrders.push(toOrderRecord(sourceOrder));
        }
      });

      targetMap.forEach((targetOrder, key) => {
        if (!sourceMap.has(key)) {
          deletedOrders.push(toOrderRecord(targetOrder));
        }
      });

      return {
        new: {
          count: newOrders.length,
          records: newOrders.slice(0, 20),
        },
        updated: {
          count: updatedOrders.length,
          records: updatedOrders.slice(0, 20),
        },
        deleted: {
          count: deletedOrders.length,
          records: deletedOrders.slice(0, 20),
        },
      };
    } catch (error: unknown) {
      console.error('[DeltaDetectionService] Error detecting order delta:', error);
      throw error;
    }
  }

  /**
   * Invalidate preview cache for org/sync type
   */
  static async invalidatePreviewCache(
    orgId: string,
    syncType?: SyncType,
    entityType?: EntityType,
    direction?: SyncDirection
  ): Promise<void> {
    try {
      if (direction && (!syncType || !entityType)) {
        throw new Error('Direction requires syncType and entityType for cache invalidation');
      }

      if (direction && syncType && entityType) {
        await query(
          `UPDATE sync_preview_cache
           SET delta_data = delta_data - $4::text, updated_at = NOW()
           WHERE org_id = $1 AND sync_type = $2 AND entity_type = $3`,
          [orgId, syncType, entityType, direction]
        );

        await query(
          `DELETE FROM sync_preview_cache
           WHERE org_id = $1 AND sync_type = $2 AND entity_type = $3
             AND (delta_data IS NULL OR delta_data = '{}'::jsonb)`,
          [orgId, syncType, entityType]
        );
      } else if (syncType && entityType) {
        await query(
          `DELETE FROM sync_preview_cache WHERE org_id = $1 AND sync_type = $2 AND entity_type = $3`,
          [orgId, syncType, entityType]
        );
      } else if (syncType) {
        await query(`DELETE FROM sync_preview_cache WHERE org_id = $1 AND sync_type = $2`, [
          orgId,
          syncType,
        ]);
      } else {
        await query(`DELETE FROM sync_preview_cache WHERE org_id = $1`, [orgId]);
      }

      console.log(
        `[DeltaDetectionService] Cache invalidated for org ${orgId}${
          direction ? ` (direction: ${direction})` : ''
        }`
      );
    } catch (error: unknown) {
      console.error(`[DeltaDetectionService] Error invalidating cache:`, error);
      throw error;
    }
  }

  /**
   * Fetch external customers with timeout
   */
  private static async fetchExternalCustomers(
    orgId: string,
    syncType: SyncType
  ): Promise<unknown[]> {
    const timeout = 30000; // 30 second timeout

    try {
      if (syncType === 'woocommerce') {
        const config = await this.getIntegrationConfig(orgId, 'woocommerce');
        const wooService = new WooCommerceService(config);
        return await Promise.race([
          wooService.fetchAllPages(
            params => wooService.getCustomers(params),
            {
              per_page: 100,
              order: 'desc',
              orderby: 'registered_date',
            },
            { maxPages: 10 }
          ),
          new Promise<unknown[]>((_, reject) =>
            setTimeout(() => reject(new Error('WooCommerce API timeout')), timeout)
          ),
        ]);
      } else if (syncType === 'odoo') {
        const config = await this.getIntegrationConfig(orgId, 'odoo');
        const odooService = new OdooService(config);
        return await Promise.race([
          odooService.getCustomers({ limit: 100 }),
          new Promise<unknown[]>((_, reject) =>
            setTimeout(() => reject(new Error('Odoo API timeout')), timeout)
          ),
        ]);
      }
      return [];
    } catch (error: unknown) {
      console.error(`[DeltaDetectionService] Error fetching external customers:`, error);
      throw error;
    }
  }

  /**
   * Fetch external products with timeout
   */
  private static async fetchExternalProducts(
    orgId: string,
    syncType: SyncType
  ): Promise<unknown[]> {
    const timeout = 30000;

    try {
      if (syncType === 'woocommerce') {
        const config = await this.getIntegrationConfig(orgId, 'woocommerce');
        const wooService = new WooCommerceService(config);
        return await Promise.race([
          wooService.fetchAllPages(
            params => wooService.getProducts(params),
            {
              per_page: 100,
            },
            { maxPages: 10 }
          ),
          new Promise<unknown[]>((_, reject) =>
            setTimeout(() => reject(new Error('WooCommerce API timeout')), timeout)
          ),
        ]);
      } else if (syncType === 'odoo') {
        const config = await this.getIntegrationConfig(orgId, 'odoo');
        const odooService = new OdooService(config);
        return await Promise.race([
          odooService.getProducts({ limit: 100 }),
          new Promise<unknown[]>((_, reject) =>
            setTimeout(() => reject(new Error('Odoo API timeout')), timeout)
          ),
        ]);
      }
      return [];
    } catch (error: unknown) {
      console.error(`[DeltaDetectionService] Error fetching external products:`, error);
      throw error;
    }
  }

  /**
   * Fetch external orders with timeout
   */
  private static async fetchExternalOrders(orgId: string, syncType: SyncType): Promise<unknown[]> {
    const timeout = 30000;

    try {
      if (syncType === 'woocommerce') {
        const config = await this.getIntegrationConfig(orgId, 'woocommerce');
        const wooService = new WooCommerceService(config);
        return await Promise.race([
          wooService.fetchAllPages(
            params => wooService.getOrders(params),
            {
              per_page: 100,
              orderby: 'date',
              order: 'desc',
            },
            { maxPages: 10 }
          ),
          new Promise<unknown[]>((_, reject) =>
            setTimeout(() => reject(new Error('WooCommerce API timeout')), timeout)
          ),
        ]);
      } else if (syncType === 'odoo') {
        // Odoo doesn't have a dedicated getOrders method; would need custom implementation
        // For now, return empty to prevent errors; production would need this implemented
        console.warn('[DeltaDetectionService] Odoo order sync not yet implemented');
        return [];
      }
      return [];
    } catch (error: unknown) {
      console.error(`[DeltaDetectionService] Error fetching external orders:`, error);
      throw error;
    }
  }

  /**
   * Fetch local customers from database
   */
  private static async fetchLocalCustomers(orgId: string): Promise<unknown[]> {
    try {
      const result = await query(
        `SELECT id, email, name, phone, company, tags, metadata
         FROM customers
         WHERE organization_id = $1
         ORDER BY updated_at DESC
         LIMIT 100000`,
        [orgId]
      );
      return result.rows || [];
    } catch (error: unknown) {
      console.error('[DeltaDetectionService] Error fetching local customers:', error);
      return [];
    }
  }

  /**
   * Fetch local products from database
   */
  private static async fetchLocalProducts(orgId: string): Promise<unknown[]> {
    try {
      const result = await query(
        `SELECT id, sku, name, price, stock_quantity, description
         FROM products
         WHERE organization_id = $1
         ORDER BY updated_at DESC
         LIMIT 100000`,
        [orgId]
      );
      return result.rows || [];
    } catch (error: unknown) {
      console.error('[DeltaDetectionService] Error fetching local products:', error);
      return [];
    }
  }

  /**
   * Fetch local orders from database
   */
  private static async fetchLocalOrders(orgId: string): Promise<unknown[]> {
    try {
      const result = await query(
        `SELECT id, status, total, customer_id, billing
         FROM orders
         WHERE organization_id = $1
         ORDER BY updated_at DESC
         LIMIT 100000`,
        [orgId]
      );
      return result.rows || [];
    } catch (error: unknown) {
      console.error('[DeltaDetectionService] Error fetching local orders:', error);
      return [];
    }
  }

  /**
   * Get integration configuration from database
   */
  private static async getIntegrationConfig(orgId: string, provider: string): Promise<unknown> {
    try {
      const result = await query(
        `SELECT id, name, config
         FROM integration_connector
         WHERE org_id = $1 AND provider = $2 AND status = 'active'
         LIMIT 1`,
        [orgId, provider]
      );

      if (!result.rows.length) {
        throw new Error(`No active ${provider} integration found for org ${orgId}`);
      }

      return result.rows[0].config;
    } catch (error: unknown) {
      console.error(`[DeltaDetectionService] Error getting integration config:`, error);
      throw error;
    }
  }

  /**
   * Get cached preview snapshot
   */
  private static normalizeCacheContainer(data: unknown): CachedDeltaContainer {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const candidate = data as Record<string, unknown>;

    if ('delta' in candidate && 'direction' in candidate) {
      const direction = (candidate.direction as SyncDirection) ?? 'inbound';
      return {
        [direction]: candidate as unknown as DeltaResult,
      };
    }

    const container: CachedDeltaContainer = {};
    if ('inbound' in candidate && candidate.inbound) {
      container.inbound = candidate.inbound as DeltaResult;
    }
    if ('outbound' in candidate && candidate.outbound) {
      container.outbound = candidate.outbound as DeltaResult;
    }

    return container;
  }

  private static async getFromCache(
    orgId: string,
    syncType: SyncType,
    entityType: EntityType,
    direction: SyncDirection
  ): Promise<DeltaResult | null> {
    try {
      const result = await query<PreviewCacheRecord>(
        `SELECT delta_data, expires_at
         FROM sync_preview_cache
         WHERE org_id = $1 AND sync_type = $2 AND entity_type = $3
         AND expires_at > NOW()
         LIMIT 1`,
        [orgId, syncType, entityType]
      );

      if (!result.rows.length) {
        return null;
      }

      const container = this.normalizeCacheContainer(result.rows[0].delta_data);
      const entry = container[direction];
      if (!entry) {
        return null;
      }

      return entry as DeltaResult;
    } catch (error: unknown) {
      console.error('[DeltaDetectionService] Error reading cache:', error);
      return null;
    }
  }

  /**
   * Store result in cache
   */
  private static async storeInCache(
    orgId: string,
    result: DeltaResult,
    direction: SyncDirection
  ): Promise<void> {
    try {
      const expiresAt = new Date(result.expiresAt);

      const existing = await query<PreviewCacheRecord>(
        `SELECT delta_data
         FROM sync_preview_cache
         WHERE org_id = $1 AND sync_type = $2 AND entity_type = $3
         LIMIT 1`,
        [orgId, result.syncType, result.entityType]
      );

      const container = this.normalizeCacheContainer(existing.rows[0]?.delta_data);
      const payload: CachedDeltaContainer = {
        ...container,
        [direction]: { ...result, cacheHit: false },
      };

      await query(
        `INSERT INTO sync_preview_cache (org_id, sync_type, entity_type, delta_data, computed_at, expires_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         ON CONFLICT (org_id, sync_type, entity_type) DO UPDATE
         SET delta_data = $4::jsonb, computed_at = $5, expires_at = $6, updated_at = NOW()`,
        [
          orgId,
          result.syncType,
          result.entityType,
          JSON.stringify(payload),
          result.computedAt,
          expiresAt,
        ]
      );
    } catch (error: unknown) {
      console.error('[DeltaDetectionService] Error storing cache:', error);
      // Non-fatal error - continue without caching
    }
  }

  /**
   * Log activity to database
   */
  private static async logActivity(
    orgId: string,
    entityType: EntityType,
    activityType: string,
    status: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO sync_activity_log (org_id, entity_type, activity_type, status, details)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [orgId, entityType, activityType, status, JSON.stringify(details || {})]
      );
    } catch (error: unknown) {
      console.error('[DeltaDetectionService] Error logging activity:', error);
      // Non-fatal error
    }
  }
}
