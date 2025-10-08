/**
 * Cache Management for Supplier Discovery System
 */

import NodeCache from 'node-cache';
import { CacheEntry, DiscoveredSupplierData } from './types';
import { DISCOVERY_CONFIG } from './config';

class SupplierDiscoveryCache {
  private cache: NodeCache;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: DISCOVERY_CONFIG.CACHE_TTL_HOURS * 3600, // Convert hours to seconds
      maxKeys: DISCOVERY_CONFIG.CACHE_MAX_ENTRIES,
      useClones: false, // Better performance
      deleteOnExpire: true
    });

    // Set up cache event listeners
    this.cache.on('set', (key, value) => {
      console.log(`Cache SET: ${key}`);
    });

    this.cache.on('del', (key, value) => {
      console.log(`Cache DEL: ${key}`);
    });

    this.cache.on('expired', (key, value) => {
      console.log(`Cache EXPIRED: ${key}`);
    });
  }

  /**
   * Generate cache key from supplier name
   */
  private generateKey(supplierName: string, additionalContext?: any): string {
    const cleanName = supplierName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const contextHash = additionalContext ?
      Buffer.from(JSON.stringify(additionalContext)).toString('base64').slice(0, 8) : '';

    return `supplier_${cleanName}${contextHash ? `_${contextHash}` : ''}`;
  }

  /**
   * Get cached supplier data
   */
  get(supplierName: string, additionalContext?: any): DiscoveredSupplierData | null {
    const key = this.generateKey(supplierName, additionalContext);
    const cached = this.cache.get<CacheEntry>(key);

    if (cached) {
      this.hitCount++;
      console.log(`Cache HIT for supplier: ${supplierName}`);
      return cached.data;
    }

    this.missCount++;
    console.log(`Cache MISS for supplier: ${supplierName}`);
    return null;
  }

  /**
   * Set cached supplier data
   */
  set(
    supplierName: string,
    data: DiscoveredSupplierData,
    additionalContext?: any,
    customTTL?: number
  ): boolean {
    const key = this.generateKey(supplierName, additionalContext);
    const ttl = customTTL || DISCOVERY_CONFIG.CACHE_TTL_HOURS * 3600;

    const cacheEntry: CacheEntry = {
      data,
      timestamp: new Date(),
      ttl
    };

    return this.cache.set(key, cacheEntry, ttl);
  }

  /**
   * Delete cached supplier data
   */
  delete(supplierName: string, additionalContext?: any): number {
    // Try exact match first
    const exactKey = this.generateKey(supplierName, additionalContext);
    const exactDelete = this.cache.del(exactKey);

    // Then delete all variations (wildcard delete)
    const wildcardDelete = this.deleteAll(supplierName);

    return exactDelete + wildcardDelete;
  }

  /**
   * Delete all cache entries matching a supplier name pattern (wildcard)
   */
  deleteAll(supplierName: string): number {
    const pattern = `supplier_${supplierName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const keys = this.cache.keys().filter(k => k.startsWith(pattern));
    const count = keys.map(k => this.cache.del(k)).reduce((a, b) => a + b, 0);

    console.log(`🗑️ Deleted ${count} cache entries for pattern: ${pattern}`);
    return count;
  }

  /**
   * Check if supplier data is cached
   */
  has(supplierName: string, additionalContext?: any): boolean {
    const key = this.generateKey(supplierName, additionalContext);
    return this.cache.has(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.flushAll();
    this.hitCount = 0;
    this.missCount = 0;
    console.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const stats = this.cache.getStats();
    return {
      ...stats,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: this.hitCount > 0 ? (this.hitCount / (this.hitCount + this.missCount)) * 100 : 0
    };
  }

  /**
   * Get all cached supplier names
   */
  getCachedSuppliers(): string[] {
    return this.cache.keys().map(key =>
      key.replace('supplier_', '').replace(/_[a-zA-Z0-9]{8}$/, '').replace(/_/g, ' ')
    );
  }

  /**
   * Prune expired entries manually
   */
  prune(): void {
    // NodeCache handles this automatically, but we can force it
    const keys = this.cache.keys();
    keys.forEach(key => {
      const entry = this.cache.get<CacheEntry>(key);
      if (entry && new Date().getTime() - entry.timestamp.getTime() > entry.ttl * 1000) {
        this.cache.del(key);
      }
    });
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.keys().length;
  }

  /**
   * Update cache entry if data has higher confidence
   */
  updateIfBetter(
    supplierName: string,
    newData: DiscoveredSupplierData,
    additionalContext?: any
  ): boolean {
    const existing = this.get(supplierName, additionalContext);

    if (!existing || newData.confidence.overall > existing.confidence.overall) {
      return this.set(supplierName, newData, additionalContext);
    }

    return false;
  }

  /**
   * Bulk operations for cache warming
   */
  bulkSet(entries: Array<{
    supplierName: string;
    data: DiscoveredSupplierData;
    additionalContext?: any;
    ttl?: number;
  }>): number {
    let successCount = 0;

    entries.forEach(entry => {
      if (this.set(entry.supplierName, entry.data, entry.additionalContext, entry.ttl)) {
        successCount++;
      }
    });

    return successCount;
  }
}

// Export singleton instance
export const supplierCache = new SupplierDiscoveryCache();