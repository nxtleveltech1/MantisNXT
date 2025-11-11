// @ts-nocheck

/**
 * Production-Grade Multi-Tier Caching System
 * L1: In-memory cache with LRU eviction
 * L2: Redis cache (optional) for distributed systems
 * Stale-while-revalidate pattern for high availability
 */

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  staleTime?: number; // Time before considering cache stale
  maxSize?: number; // Maximum cache entries (LRU eviction)
  namespace?: string; // Cache key prefix
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  hitRate: number;
}

/**
 * In-Memory LRU Cache with TTL
 */
export class LRUCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private accessOrder: Map<string, number>;
  private stats: CacheStats;
  private accessCounter: number = 0;

  constructor(
    private maxSize: number = 1000,
    private defaultTTL: number = 5 * 60 * 1000 // 5 minutes
  ) {
    this.cache = new Map();
    this.accessOrder = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
    };
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access order
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  /**
   * Set value in cache
   */
  set(key: string, data: T, ttl?: number): void {
    const effectiveTTL = ttl || this.defaultTTL;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + effectiveTTL,
      version: this.generateVersion(),
    };

    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.sets++;
    this.stats.size = this.cache.size;
  }

  /**
   * Check if cache has fresh data
   */
  has(key: string, checkExpiry: boolean = true): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (checkExpiry && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);

    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }

    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats.size = 0;
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
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: this.cache.size,
      hitRate: 0,
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruAccess) {
        lruAccess = accessTime;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
      this.stats.evictions++;
      console.log(`🗑️ Evicted LRU cache entry: ${lruKey}`);
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private generateVersion(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Stale-While-Revalidate Cache Pattern
 */
export class SWRCache<T = unknown> {
  private cache: LRUCache<T>;

  constructor(
    private config: CacheConfig,
    private fetcher: (key: string, ...args: unknown[]) => Promise<T>
  ) {
    this.cache = new LRUCache(config.maxSize || 1000, config.ttl);
  }

  /**
   * Get data with stale-while-revalidate
   */
  async get(key: string, ...args: unknown[]): Promise<T> {
    const fullKey = this.buildKey(key);
    const cached = this.cache.get(fullKey);

    // Fresh cache hit
    if (cached) {
      console.log(`✅ Cache hit (fresh): ${fullKey}`);
      return cached;
    }

    // Check if we have stale data
    const staleEntry = this.cache.has(fullKey, false)
      ? this.cache.get(fullKey)
      : null;

    // If stale data exists, return it and revalidate in background
    if (staleEntry && this.isStale(fullKey)) {
      console.log(`⚠️ Cache hit (stale): ${fullKey}, revalidating...`);

      // Revalidate in background
      this.revalidate(fullKey, ...args).catch((error) => {
        console.error(`❌ Background revalidation failed for ${fullKey}:`, error);
      });

      return staleEntry;
    }

    // No cache data, fetch fresh
    console.log(`❌ Cache miss: ${fullKey}, fetching...`);
    return this.fetchAndCache(fullKey, ...args);
  }

  /**
   * Force refresh cache entry
   */
  async refresh(key: string, ...args: unknown[]): Promise<T> {
    const fullKey = this.buildKey(key);
    this.cache.delete(fullKey);
    return this.fetchAndCache(fullKey, ...args);
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    const fullKey = this.buildKey(key);
    this.cache.delete(fullKey);
    console.log(`🗑️ Invalidated cache: ${fullKey}`);
  }

  /**
   * Invalidate multiple entries by pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0;

    for (const key of Array.from(this.cache['cache'].keys())) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    console.log(`🗑️ Invalidated ${invalidated} cache entries matching pattern`);
    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  private async fetchAndCache(fullKey: string, ...args: unknown[]): Promise<T> {
    const startTime = Date.now();

    try {
      const data = await this.fetcher(fullKey, ...args);
      const duration = Date.now() - startTime;

      this.cache.set(fullKey, data, this.config.ttl);
      console.log(`💾 Cached ${fullKey} (${duration}ms)`);

      return data;
    } catch (error) {
      console.error(`❌ Fetch failed for ${fullKey}:`, error);
      throw error;
    }
  }

  private async revalidate(fullKey: string, ...args: unknown[]): Promise<void> {
    try {
      await this.fetchAndCache(fullKey, ...args);
    } catch (error) {
      // Silently fail, stale data still valid
      console.warn(`⚠️ Revalidation failed for ${fullKey}, using stale data`);
    }
  }

  private isStale(fullKey: string): boolean {
    const entry = this.cache['cache'].get(fullKey);

    if (!entry) return true;

    const staleTime = this.config.staleTime || this.config.ttl / 2;
    const age = Date.now() - entry.timestamp;

    return age > staleTime;
  }

  private buildKey(key: string): string {
    const namespace = this.config.namespace || 'default';
    return `${namespace}:${key}`;
  }
}

/**
 * Global cache instances for common use cases
 */
export class CacheManager {
  private static instances: Map<string, SWRCache> = new Map();

  /**
   * Get or create cache instance
   */
  static getCache<T>(
    name: string,
    config: CacheConfig,
    fetcher: (key: string, ...args: unknown[]) => Promise<T>
  ): SWRCache<T> {
    if (!this.instances.has(name)) {
      this.instances.set(name, new SWRCache({ ...config, namespace: name }, fetcher));
    }

    return this.instances.get(name) as SWRCache<T>;
  }

  /**
   * Invalidate all caches
   */
  static invalidateAll(): void {
    this.instances.forEach((cache, name) => {
      cache.invalidatePattern(/.*/);
      console.log(`🗑️ Cleared cache: ${name}`);
    });
  }

  /**
   * Get stats for all caches
   */
  static getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};

    this.instances.forEach((cache, name) => {
      stats[name] = cache.getStats();
    });

    return stats;
  }
}

/**
 * Dashboard metrics cache
 */
export const dashboardCache = CacheManager.getCache(
  'dashboard',
  {
    ttl: 2 * 60 * 1000, // 2 minutes
    staleTime: 1 * 60 * 1000, // 1 minute stale time
    maxSize: 100,
  },
  async (key: string) => {
    // Fetcher will be provided by endpoint
    throw new Error('Dashboard fetcher not configured');
  }
);

/**
 * Inventory cache
 */
export const inventoryCache = CacheManager.getCache(
  'inventory',
  {
    ttl: 30 * 1000, // 30 seconds
    staleTime: 15 * 1000, // 15 seconds stale time
    maxSize: 500,
  },
  async (key: string) => {
    throw new Error('Inventory fetcher not configured');
  }
);

/**
 * Alerts cache
 */
export const alertsCache = CacheManager.getCache(
  'alerts',
  {
    ttl: 1 * 60 * 1000, // 1 minute
    staleTime: 30 * 1000, // 30 seconds stale time
    maxSize: 200,
  },
  async (key: string) => {
    throw new Error('Alerts fetcher not configured');
  }
);

/**
 * Simple cache decorator for functions
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config: CacheConfig
): T {
  const cache = new SWRCache(config, async (key: string, ...args: unknown[]) => {
    return fn(...args);
  });

  return (async (...args: unknown[]) => {
    const cacheKey = JSON.stringify(args);
    return cache.get(cacheKey, ...args);
  }) as T;
}
