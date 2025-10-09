/**
 * ITERATION 2 - ADR-1: Cache Rollout Feature Flags
 *
 * Feature flags for gradual cache rollout.
 * Allows per-endpoint enable/disable for safe rollout and rollback.
 */

/**
 * Feature flag configuration
 */
export interface CacheFeatureFlags {
  // Global cache enable/disable
  cacheEnabled: boolean;

  // Phase 1 endpoints (Week 1-2)
  dashboardMetricsCache: boolean;
  inventoryListCache: boolean;
  analyticsOverviewCache: boolean;

  // Phase 2 endpoints (Week 3-4) - Future
  supplierListCache: boolean;
  supplierDetailsCache: boolean;
  inventoryDetailsCache: boolean;

  // Phase 3 endpoints (Week 5-6) - Future
  stockMovementsCache: boolean;
  purchaseOrdersCache: boolean;
  analyticsReportsCache: boolean;

  // Advanced features
  prefetchEnabled: boolean;
  backgroundRefetchEnabled: boolean;
  optimisticUpdatesEnabled: boolean;

  // Performance settings
  enablePerformanceMonitoring: boolean;
  logCacheHits: boolean;
  logCacheMisses: boolean;
}

/**
 * Default feature flags for Phase 1 rollout
 */
const DEFAULT_FLAGS: CacheFeatureFlags = {
  cacheEnabled: true,

  // Phase 1 - ENABLED
  dashboardMetricsCache: true,
  inventoryListCache: true,
  analyticsOverviewCache: true,

  // Phase 2 - DISABLED (not yet rolled out)
  supplierListCache: false,
  supplierDetailsCache: false,
  inventoryDetailsCache: false,

  // Phase 3 - DISABLED (not yet rolled out)
  stockMovementsCache: false,
  purchaseOrdersCache: false,
  analyticsReportsCache: false,

  // Advanced features - ENABLED for development
  prefetchEnabled: process.env.NODE_ENV === 'development',
  backgroundRefetchEnabled: true,
  optimisticUpdatesEnabled: false, // Conservative default

  // Performance monitoring - ENABLED in development
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
  logCacheHits: process.env.NODE_ENV === 'development',
  logCacheMisses: process.env.NODE_ENV === 'development',
};

/**
 * Feature flag manager
 */
class FeatureFlagManager {
  private flags: CacheFeatureFlags;
  private listeners: Array<(flags: CacheFeatureFlags) => void> = [];

  constructor(initialFlags: CacheFeatureFlags = DEFAULT_FLAGS) {
    this.flags = { ...initialFlags };

    // Load flags from localStorage if available
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  /**
   * Get current flags
   */
  getFlags(): CacheFeatureFlags {
    return { ...this.flags };
  }

  /**
   * Get specific flag value
   */
  getFlag<K extends keyof CacheFeatureFlags>(key: K): CacheFeatureFlags[K] {
    return this.flags[key];
  }

  /**
   * Set specific flag value
   */
  setFlag<K extends keyof CacheFeatureFlags>(
    key: K,
    value: CacheFeatureFlags[K]
  ): void {
    this.flags[key] = value;
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Update multiple flags
   */
  updateFlags(updates: Partial<CacheFeatureFlags>): void {
    this.flags = { ...this.flags, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Reset to default flags
   */
  resetToDefaults(): void {
    this.flags = { ...DEFAULT_FLAGS };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Check if cache is enabled for a specific endpoint
   */
  isCacheEnabled(endpoint: keyof CacheFeatureFlags): boolean {
    return this.flags.cacheEnabled && Boolean(this.flags[endpoint]);
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(listener: (flags: CacheFeatureFlags) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of flag changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getFlags());
      } catch (error) {
        console.error('[FeatureFlags] Error in listener:', error);
      }
    });
  }

  /**
   * Save flags to localStorage
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'cache_feature_flags',
          JSON.stringify(this.flags)
        );
      } catch (error) {
        console.error('[FeatureFlags] Error saving to storage:', error);
      }
    }
  }

  /**
   * Load flags from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cache_feature_flags');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.flags = { ...DEFAULT_FLAGS, ...parsed };
        }
      } catch (error) {
        console.error('[FeatureFlags] Error loading from storage:', error);
      }
    }
  }

  /**
   * Export flags for debugging
   */
  exportFlags(): string {
    return JSON.stringify(this.flags, null, 2);
  }

  /**
   * Import flags from JSON
   */
  importFlags(json: string): void {
    try {
      const parsed = JSON.parse(json);
      this.updateFlags(parsed);
    } catch (error) {
      console.error('[FeatureFlags] Error importing flags:', error);
    }
  }
}

/**
 * Global feature flag manager instance
 */
export const featureFlagManager = new FeatureFlagManager();

/**
 * Convenience functions for common checks
 */
export const isPhase1CacheEnabled = () =>
  featureFlagManager.getFlag('cacheEnabled') &&
  (featureFlagManager.getFlag('dashboardMetricsCache') ||
    featureFlagManager.getFlag('inventoryListCache') ||
    featureFlagManager.getFlag('analyticsOverviewCache'));

export const isDashboardCacheEnabled = () =>
  featureFlagManager.isCacheEnabled('dashboardMetricsCache');

export const isInventoryCacheEnabled = () =>
  featureFlagManager.isCacheEnabled('inventoryListCache');

export const isAnalyticsCacheEnabled = () =>
  featureFlagManager.isCacheEnabled('analyticsOverviewCache');

/**
 * Rollback helper - disable all Phase 1 caches
 */
export function rollbackPhase1Cache(): void {
  featureFlagManager.updateFlags({
    dashboardMetricsCache: false,
    inventoryListCache: false,
    analyticsOverviewCache: false,
  });
  console.log('[FeatureFlags] Phase 1 cache rolled back');
}

/**
 * Rollout helper - enable all Phase 1 caches
 */
export function enablePhase1Cache(): void {
  featureFlagManager.updateFlags({
    dashboardMetricsCache: true,
    inventoryListCache: true,
    analyticsOverviewCache: true,
  });
  console.log('[FeatureFlags] Phase 1 cache enabled');
}
