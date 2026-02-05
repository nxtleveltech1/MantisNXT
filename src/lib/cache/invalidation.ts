// @ts-nocheck

/**
 * Cache Invalidation System
 *
 * Solves stale data problem by invalidating Next.js cache on all mutations.
 * Uses revalidatePath() and revalidateTag() to ensure fresh data after changes.
 */

import { revalidatePath, revalidateTag } from 'next/cache';

export class CacheInvalidator {
  /**
   * Invalidate all supplier-related cache
   * Call after: CREATE, UPDATE, DELETE supplier operations
   */
  static invalidateSupplier(supplierId: string, supplierName?: string) {
    // Invalidate specific supplier pages
    revalidatePath(`/api/suppliers/${supplierId}`);
    revalidatePath(`/api/suppliers/${supplierId}/inventory`);
    revalidatePath(`/api/suppliers/v3/${supplierId}`);
    revalidatePath(`/suppliers/${supplierId}`);

    // Invalidate list pages (all variants)
    revalidatePath('/api/suppliers');
    revalidatePath('/api/suppliers/v3');
    revalidatePath('/api/suppliers/enhanced');
    revalidatePath('/api/suppliers/real-data');
    revalidatePath('/suppliers');

    // Invalidate by tag
    revalidateTag('suppliers');
    revalidateTag(`supplier-${supplierId}`);

    // Invalidate search/discovery if name provided
    if (supplierName) {
      revalidateTag(`supplier-search-${supplierName.toLowerCase()}`);
      revalidatePath('/api/suppliers/discovery');
      revalidatePath('/api/suppliers/v3/ai/discover');
    }

    console.log('🔄 Cache invalidated for supplier:', supplierId);
  }

  /**
   * Invalidate all product-related cache
   * Call after: CREATE, UPDATE, DELETE product operations
   */
  static invalidateProduct(productId: string, supplierId?: string) {
    // Invalidate specific product pages
    revalidatePath(`/api/products/${productId}`);
    revalidatePath(`/api/inventory/${productId}`); // Use /api/inventory/[id] instead of deprecated /api/inventory/products/[id]
    revalidatePath(`/products/${productId}`);
    revalidatePath(`/api/catalog/products/${productId}`);

    // Invalidate list pages
    revalidatePath('/api/products');
    revalidatePath('/api/inventory'); // Use /api/inventory instead of deprecated /api/inventory/products
    revalidatePath('/api/products/catalog');
    revalidatePath('/products');

    // Invalidate by tag
    revalidateTag('products');
    revalidateTag(`product-${productId}`);

    // Invalidate catalog views that include this product
    this.invalidateCatalog();

    // Cascade to supplier if provided
    if (supplierId) {
      this.invalidateSupplier(supplierId);
    }

    console.log('🔄 Cache invalidated for product:', productId);
  }

  /**
   * Invalidate catalog cache (Supplier Inventory Portfolio)
   * Call after: pricing/stock updates that should reflect in catalog
   */
  static invalidateCatalog() {
    revalidatePath('/api/catalog/products');
    revalidatePath('/api/catalog/products/export');
    revalidatePath('/api/catalog/metrics');
    revalidatePath('/api/catalog/suppliers');
    revalidatePath('/api/catalog/categories');
    revalidatePath('/api/catalog/brands');
    revalidateTag('catalog');

    console.log('🔄 Cache invalidated for catalog');
  }

  /**
   * Invalidate inventory cache
   * Call after: CREATE, UPDATE, DELETE inventory operations
   */
  static invalidateInventory(itemId?: string, supplierId?: string) {
    if (itemId) {
      revalidatePath(`/api/inventory/${itemId}`);
      revalidatePath(`/api/inventory/detailed/${itemId}`);
      revalidatePath(`/api/v2/inventory/${itemId}`);
      revalidateTag(`inventory-${itemId}`);
    }

    // Invalidate all inventory list endpoints
    revalidatePath('/api/inventory');
    revalidatePath('/api/inventory/complete');
    revalidatePath('/api/inventory/enhanced');
    revalidatePath('/api/inventory/items');
    revalidatePath('/api/inventory/analytics');
    revalidatePath('/api/v2/inventory');
    revalidatePath('/api/inventory_items');
    revalidatePath('/inventory');

    // Invalidate tags
    revalidateTag('inventory');

    // Cascade to supplier if provided
    if (supplierId) {
      this.invalidateSupplier(supplierId);
    }

    console.log('🔄 Cache invalidated for inventory', itemId || '(all)');
  }

  /**
   * Invalidate purchase order cache
   * Call after: CREATE, UPDATE, DELETE purchase order operations
   */
  static invalidatePurchaseOrder(poId: string, supplierId?: string) {
    // Invalidate specific PO pages
    revalidatePath(`/api/purchase-orders/${poId}`);
    revalidatePath(`/purchase-orders/${poId}`);

    // Invalidate list pages
    revalidatePath('/api/purchase-orders');
    revalidatePath('/api/purchase-orders/analytics');
    revalidatePath('/purchase-orders');

    // Invalidate tags
    revalidateTag('purchase-orders');
    revalidateTag(`po-${poId}`);

    // Cascade to supplier if provided
    if (supplierId) {
      this.invalidateSupplier(supplierId);
    }

    console.log('🔄 Cache invalidated for PO:', poId);
  }

  /**
   * Invalidate stock movement cache
   * Call after: CREATE stock movement operations
   */
  static invalidateStockMovements(inventoryItemId?: string) {
    revalidatePath('/api/stock-movements');
    revalidateTag('stock-movements');

    if (inventoryItemId) {
      // Also invalidate the related inventory item
      this.invalidateInventory(inventoryItemId);
    }

    console.log('🔄 Cache invalidated for stock movements');
  }

  /**
   * Invalidate warehouse cache
   * Call after: CREATE, UPDATE, DELETE warehouse operations
   */
  static invalidateWarehouse(warehouseId?: string) {
    if (warehouseId) {
      revalidatePath(`/api/warehouses/${warehouseId}`);
      revalidateTag(`warehouse-${warehouseId}`);
    }

    revalidatePath('/api/warehouses');
    revalidateTag('warehouses');

    console.log('🔄 Cache invalidated for warehouse', warehouseId || '(all)');
  }

  /**
   * Invalidate analytics cache
   * Call after: Any major data change that affects dashboard
   */
  static invalidateAnalytics() {
    revalidatePath('/api/analytics/comprehensive');
    revalidatePath('/api/analytics/dashboard');
    revalidatePath('/api/analytics/system');
    revalidatePath('/api/analytics/predictions');
    revalidatePath('/api/analytics/recommendations');
    revalidatePath('/api/analytics/anomalies');
    revalidatePath('/api/dashboard/real-stats');
    revalidatePath('/api/dashboard_metrics');

    revalidateTag('analytics');
    revalidateTag('dashboard');

    console.log('🔄 Cache invalidated for analytics');
  }

  /**
   * Invalidate alerts cache
   * Call after: CREATE, UPDATE, DELETE alert operations
   */
  static invalidateAlerts() {
    revalidatePath('/api/alerts');
    revalidateTag('alerts');

    console.log('🔄 Cache invalidated for alerts');
  }

  /**
   * Nuclear option - invalidate everything
   * Use sparingly, only for system-wide changes
   */
  static invalidateAll() {
    revalidatePath('/', 'layout'); // Invalidate entire app

    // Invalidate all tags
    revalidateTag('suppliers');
    revalidateTag('products');
    revalidateTag('inventory');
    revalidateTag('purchase-orders');
    revalidateTag('warehouses');
    revalidateTag('analytics');
    revalidateTag('alerts');
    revalidateTag('stock-movements');

    console.log('💥 ALL cache invalidated');
  }

  /**
   * Smart cascade invalidation based on entity relationships
   * Automatically invalidates related caches
   */
  static cascadeInvalidation(options: {
    type: 'supplier' | 'product' | 'inventory' | 'po' | 'warehouse';
    id: string;
    includedRelations?: {
      supplierId?: string;
      inventoryItemId?: string;
      warehouseId?: string;
    };
    invalidateAnalytics?: boolean;
  }) {
    const { type, id, includedRelations = {}, invalidateAnalytics = true } = options;

    switch (type) {
      case 'supplier':
        this.invalidateSupplier(id);
        // Suppliers affect inventory and products
        this.invalidateInventory();
        this.invalidateProduct('*'); // Wildcard for all products
        break;

      case 'product':
        this.invalidateProduct(id, includedRelations.supplierId);
        this.invalidateInventory(); // Products affect inventory
        break;

      case 'inventory':
        this.invalidateInventory(id, includedRelations.supplierId);
        break;

      case 'po':
        this.invalidatePurchaseOrder(id, includedRelations.supplierId);
        break;

      case 'warehouse':
        this.invalidateWarehouse(id);
        this.invalidateInventory(); // Warehouses affect inventory
        break;
    }

    // Optionally invalidate analytics (most mutations affect it)
    if (invalidateAnalytics) {
      this.invalidateAnalytics();
    }
  }
}

/**
 * Helper function for quick invalidation in API routes
 *
 * Usage in API routes:
 * ```typescript
 * import { invalidateCache } from '@/lib/cache/invalidation'
 *
 * await pool.query('DELETE FROM suppliers WHERE id = $1', [id])
 * invalidateCache('supplier', id)
 * ```
 */
export function invalidateCache(
  type: 'supplier' | 'product' | 'inventory' | 'po' | 'warehouse' | 'all',
  id?: string,
  options?: {
    supplierId?: string;
    skipAnalytics?: boolean;
  }
) {
  if (type === 'all') {
    CacheInvalidator.invalidateAll();
    return;
  }

  if (!id) {
    console.error('❌ Cache invalidation requires an ID for type:', type);
    return;
  }

  CacheInvalidator.cascadeInvalidation({
    type,
    id,
    includedRelations: { supplierId: options?.supplierId },
    invalidateAnalytics: !options?.skipAnalytics,
  });
}
