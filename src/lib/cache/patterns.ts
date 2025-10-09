/**
 * ITERATION 2 - ADR-6: Cache Key Pattern Matching
 *
 * Defines patterns for cache key invalidation based on events.
 * Maps event types to cache key patterns that should be invalidated.
 */

import { CacheInvalidationEventType } from './events';

/**
 * Cache invalidation patterns mapping
 * Each event type maps to an array of cache key patterns (regex patterns)
 */
export const INVALIDATION_PATTERNS: Record<CacheInvalidationEventType, string[]> = {
  // Inventory events
  'inventory.created': [
    'inventory-list.*',
    'inventory-analytics.*',
    'dashboard-metrics.*',
    'dashboard-inventory.*',
  ],
  'inventory.updated': [
    'inventory-list.*',
    'inventory-item-.*', // Will be refined with entity ID
    'inventory-analytics.*',
    'dashboard-metrics.*',
    'supplier-inventory-.*', // Will be refined with supplier ID
  ],
  'inventory.deleted': [
    'inventory-list.*',
    'inventory-item-.*',
    'inventory-analytics.*',
    'dashboard-metrics.*',
  ],
  'inventory.bulk_updated': [
    'inventory-list.*',
    'inventory-analytics.*',
    'dashboard-metrics.*',
  ],
  'inventory.stock_movement': [
    'inventory-item-.*',
    'inventory-list.*',
    'inventory-analytics.*',
    'dashboard-metrics.*',
    'stock-movements.*',
  ],

  // Product events
  'product.created': [
    'products-list.*',
    'inventory-list.*',
    'dashboard-metrics.*',
  ],
  'product.updated': [
    'products-list.*',
    'product-.*',
    'inventory-list.*',
  ],
  'product.deleted': [
    'products-list.*',
    'product-.*',
    'inventory-list.*',
    'dashboard-metrics.*',
  ],

  // Supplier events
  'supplier.created': [
    'suppliers-list.*',
    'dashboard-metrics.*',
    'supplier-analytics.*',
  ],
  'supplier.updated': [
    'suppliers-list.*',
    'supplier-.*',
    'supplier-metrics-.*',
    'supplier-inventory-.*',
  ],
  'supplier.deleted': [
    'suppliers-list.*',
    'supplier-.*',
    'dashboard-metrics.*',
  ],

  // Analytics events
  'analytics.new': [
    'analytics-overview.*',
    'analytics-.*',
    'dashboard-analytics.*',
  ],

  // Dashboard events
  'dashboard.refresh': [
    'dashboard-.*',
  ],

  // Global cache clear
  'cache.clear_all': [
    '.*', // Clear everything
  ],
};

/**
 * Get specific cache key patterns based on event data
 * Refines generic patterns with entity-specific information
 */
export function getSpecificPatterns(
  eventType: CacheInvalidationEventType,
  payload: {
    entityId?: string;
    entityIds?: string[];
    supplierId?: string;
    category?: string;
  }
): string[] {
  const basePatterns = INVALIDATION_PATTERNS[eventType] || [];
  const specificPatterns: string[] = [];

  // Add entity-specific patterns
  if (payload.entityId) {
    specificPatterns.push(
      `inventory-item-${payload.entityId}`,
      `product-${payload.entityId}`,
      `supplier-${payload.entityId}`
    );
  }

  // Add bulk entity patterns
  if (payload.entityIds) {
    payload.entityIds.forEach((id) => {
      specificPatterns.push(
        `inventory-item-${id}`,
        `product-${id}`,
        `supplier-${id}`
      );
    });
  }

  // Add supplier-specific patterns
  if (payload.supplierId) {
    specificPatterns.push(
      `supplier-${payload.supplierId}`,
      `supplier-inventory-${payload.supplierId}`,
      `supplier-metrics-${payload.supplierId}`
    );
  }

  // Add category-specific patterns
  if (payload.category) {
    specificPatterns.push(`inventory-category-${payload.category}`);
  }

  return [...basePatterns, ...specificPatterns];
}

/**
 * Convert pattern string to RegExp for cache key matching
 */
export function patternToRegex(pattern: string): RegExp {
  // Escape special regex characters except * and .
  const escaped = pattern
    .replace(/[+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\\\./g, '\\.');

  return new RegExp(`^${escaped}$`);
}

/**
 * Test if a cache key matches any of the given patterns
 */
export function matchesCacheKey(key: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = patternToRegex(pattern);
    return regex.test(key);
  });
}

/**
 * Query key factories for React Query
 * Consistent naming convention for cache keys
 */
export const QueryKeys = {
  // Dashboard queries
  dashboardMetrics: () => ['dashboard-metrics'] as const,
  dashboardInventory: () => ['dashboard-inventory'] as const,
  dashboardAnalytics: () => ['dashboard-analytics'] as const,

  // Inventory queries
  inventoryList: (filters?: Record<string, any>) =>
    ['inventory-list', filters] as const,
  inventoryItem: (id: string) =>
    [`inventory-item-${id}`] as const,
  inventoryBySupplier: (supplierId: string) =>
    [`supplier-inventory-${supplierId}`] as const,
  inventoryByCategory: (category: string) =>
    [`inventory-category-${category}`] as const,
  inventoryAnalytics: (filters?: Record<string, any>) =>
    ['inventory-analytics', filters] as const,

  // Supplier queries
  supplierList: (filters?: Record<string, any>) =>
    ['suppliers-list', filters] as const,
  supplier: (id: string) =>
    [`supplier-${id}`] as const,
  supplierMetrics: (id: string) =>
    [`supplier-metrics-${id}`] as const,

  // Analytics queries
  analyticsOverview: (filters?: Record<string, any>) =>
    ['analytics-overview', filters] as const,
  stockMovements: (filters?: Record<string, any>) =>
    ['stock-movements', filters] as const,

  // Product queries
  productsList: (filters?: Record<string, any>) =>
    ['products-list', filters] as const,
  product: (id: string) =>
    [`product-${id}`] as const,
} as const;

/**
 * Convert React Query key to string for pattern matching
 */
export function queryKeyToString(queryKey: unknown[]): string {
  return JSON.stringify(queryKey);
}
