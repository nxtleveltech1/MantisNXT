/**
 * ITERATION 1 - CHECKPOINT 6: Query Result Caching Layer
 *
 * High-performance caching for database queries
 * - In-memory LRU cache for hot data
 * - Configurable TTL per query type
 * - Automatic cache invalidation
 * - Cache hit/miss metrics
 *
 * Target: Reduce repeated query load by 80%+
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSize: number;
  hitRate: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // milliseconds
  enableMetrics: boolean;
}

/**
 * LRU Cache implementation for query results
 */
export class QueryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private accessOrder: string[]; // LRU tracking
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.accessOrder = [];
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes default
      enableMetrics: config.enableMetrics !== false,
    };
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      currentSize: 0,
      hitRate: 0,
    };
  }

  /**
   * Generate cache key from query and parameters
   */
  private generateKey(query: string, params?: unknown[]): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${query}:${paramStr}`;
  }

  /**
   * Get cached result
   */
  get(query: string, params?: unknown[]): T | null {
    const key = this.generateKey(query, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      this.stats.currentSize = this.cache.size;
      this.updateHitRate();
      return null;
    }

    // Update access order (move to end for LRU)
    this.updateAccessOrder(key);
    entry.hits++;
    this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  /**
   * Set cache entry with optional TTL
   */
  set(query: string, data: T, params?: unknown[], ttl?: number): void {
    const key = this.generateKey(query, params);
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt,
      hits: 0,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.stats.currentSize = this.cache.size;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string | RegExp): number {
    let invalidated = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        invalidated++;
      }
    }

    this.stats.currentSize = this.cache.size;
    return invalidated;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.currentSize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      currentSize: this.cache.size,
      hitRate: 0,
    };
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict oldest entry (LRU)
   */
  private evictOldest(): void {
    if (this.accessOrder.length === 0) return;

    const oldestKey = this.accessOrder[0];
    this.cache.delete(oldestKey);
    this.accessOrder.shift();
    this.stats.evictions++;
  }

  /**
   * Update hit rate metric
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get cache entry metadata
   */
  getEntryInfo(query: string, params?: unknown[]): Omit<CacheEntry<T>, 'data'> | null {
    const key = this.generateKey(query, params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    return {
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      hits: entry.hits,
    };
  }
}

/**
 * Pre-configured cache instances for different query types
 */
export class CacheManager {
  // Short-lived cache for frequently accessed data (2 minutes)
  static readonly hotCache = new QueryCache({
    maxSize: 500,
    defaultTTL: 2 * 60 * 1000,
    enableMetrics: true,
  });

  // Medium-lived cache for dashboard data (5 minutes)
  static readonly dashboardCache = new QueryCache({
    maxSize: 200,
    defaultTTL: 5 * 60 * 1000,
    enableMetrics: true,
  });

  // Long-lived cache for analytics (15 minutes)
  static readonly analyticsCache = new QueryCache({
    maxSize: 100,
    defaultTTL: 15 * 60 * 1000,
    enableMetrics: true,
  });

  // Very short cache for real-time data (30 seconds)
  static readonly realtimeCache = new QueryCache({
    maxSize: 1000,
    defaultTTL: 30 * 1000,
    enableMetrics: true,
  });

  /**
   * Get combined cache statistics
   */
  static getCombinedStats() {
    return {
      hot: this.hotCache.getStats(),
      dashboard: this.dashboardCache.getStats(),
      analytics: this.analyticsCache.getStats(),
      realtime: this.realtimeCache.getStats(),
    };
  }

  /**
   * Clear all caches
   */
  static clearAll() {
    this.hotCache.clear();
    this.dashboardCache.clear();
    this.analyticsCache.clear();
    this.realtimeCache.clear();
  }

  /**
   * Reset all statistics
   */
  static resetAllStats() {
    this.hotCache.resetStats();
    this.dashboardCache.resetStats();
    this.analyticsCache.resetStats();
    this.realtimeCache.resetStats();
  }

  /**
   * Invalidate caches by tag pattern
   */
  static invalidateByTag(tag: string) {
    const pattern = new RegExp(tag);
    const counts = {
      hot: this.hotCache.invalidate(pattern),
      dashboard: this.dashboardCache.invalidate(pattern),
      analytics: this.analyticsCache.invalidate(pattern),
      realtime: this.realtimeCache.invalidate(pattern),
    };
    return counts;
  }
}

/**
 * Cache key generators for common queries
 */
export const CacheKeys = {
  // Inventory queries
  inventoryList: (filters: unknown) => `inventory:list:${JSON.stringify(filters)}`,
  inventoryItem: (id: string) => `inventory:item:${id}`,
  inventoryBySupplier: (supplierId: string) => `inventory:supplier:${supplierId}`,

  // Supplier queries
  supplierList: (filters: unknown) => `suppliers:list:${JSON.stringify(filters)}`,
  supplier: (id: string) => `suppliers:item:${id}`,
  supplierMetrics: (id: string) => `suppliers:metrics:${id}`,

  // Dashboard queries
  dashboardKPIs: () => `dashboard:kpis`,
  dashboardTrends: (days: number) => `dashboard:trends:${days}`,

  // Analytics queries
  stockMovements: (days: number) => `analytics:movements:${days}`,
  lowStockAlerts: () => `analytics:alerts:low_stock`,
  categoryAnalytics: () => `analytics:categories`,
};

/**
 * Invalidation tags for cache management
 */
export const InvalidationTags = {
  // Invalidate on inventory changes
  INVENTORY: 'inventory:',
  INVENTORY_ITEM: (id: string) => `inventory:item:${id}`,
  INVENTORY_SUPPLIER: (supplierId: string) => `inventory:supplier:${supplierId}`,

  // Invalidate on supplier changes
  SUPPLIERS: 'suppliers:',
  SUPPLIER_ITEM: (id: string) => `suppliers:item:${id}`,

  // Invalidate on stock movements
  STOCK_MOVEMENTS: 'analytics:movements',

  // Invalidate dashboard
  DASHBOARD: 'dashboard:',

  // Invalidate all analytics
  ANALYTICS: 'analytics:',
};

/**
 * Cached query wrapper with automatic invalidation
 */
export async function cachedQuery<T>(
  cache: QueryCache<T>,
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Execute query
  const result = await queryFn();

  // Store in cache
  cache.set(cacheKey, result, undefined, ttl);

  return result;
}

/**
 * Example usage in API endpoints:
 *
 * // Hot data (frequently accessed)
 * const inventory = await cachedQuery(
 *   CacheManager.hotCache,
 *   CacheKeys.inventoryList({ status: 'active' }),
 *   async () => {
 *     const { rows } = await query('SELECT * FROM inventory_items WHERE status = $1', ['active']);
 *     return rows;
 *   }
 * );
 *
 * // Dashboard data
 * const kpis = await cachedQuery(
 *   CacheManager.dashboardCache,
 *   CacheKeys.dashboardKPIs(),
 *   async () => {
 *     const { rows } = await query('SELECT * FROM mv_inventory_kpis');
 *     return rows[0];
 *   }
 * );
 *
 * // Invalidate on updates
 * await query('UPDATE inventory_items SET stock_qty = $1 WHERE id = $2', [newQty, id]);
 * CacheManager.invalidateByTag(InvalidationTags.INVENTORY_ITEM(id));
 */
