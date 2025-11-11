/**
 * ITERATION 2 - ADR-6: React Query Invalidation Hooks
 *
 * Custom hooks for triggering cache invalidation from mutations.
 * Integrates with the event-driven invalidation system.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { triggerCacheInvalidation } from '@/lib/cache/event-invalidation';

/**
 * Hook to get cache invalidation functions
 * Returns functions to trigger invalidation for different entity types
 */
export function useInvalidation() {
  const queryClient = useQueryClient();

  const invalidateInventory = useCallback(
    async (payload: {
      entityId?: string;
      entityIds?: string[];
      supplierId?: string;
      category?: string;
    }) => {
      return triggerCacheInvalidation('inventory.updated', payload);
    },
    []
  );

  const invalidateInventoryCreated = useCallback(
    async (payload: {
      entityId?: string;
      supplierId?: string;
      category?: string;
    }) => {
      return triggerCacheInvalidation('inventory.created', payload);
    },
    []
  );

  const invalidateInventoryDeleted = useCallback(
    async (payload: {
      entityId?: string;
      supplierId?: string;
    }) => {
      return triggerCacheInvalidation('inventory.deleted', payload);
    },
    []
  );

  const invalidateInventoryBulk = useCallback(
    async (payload: {
      entityIds?: string[];
    }) => {
      return triggerCacheInvalidation('inventory.bulk_updated', payload);
    },
    []
  );

  const invalidateStockMovement = useCallback(
    async (payload: {
      entityId?: string;
    }) => {
      return triggerCacheInvalidation('inventory.stock_movement', payload);
    },
    []
  );

  const invalidateSupplier = useCallback(
    async (payload: {
      entityId?: string;
    }) => {
      return triggerCacheInvalidation('supplier.updated', payload);
    },
    []
  );

  const invalidateSupplierCreated = useCallback(
    async (payload: {
      entityId?: string;
    }) => {
      return triggerCacheInvalidation('supplier.created', payload);
    },
    []
  );

  const invalidateSupplierDeleted = useCallback(
    async (payload: {
      entityId?: string;
    }) => {
      return triggerCacheInvalidation('supplier.deleted', payload);
    },
    []
  );

  const invalidateProduct = useCallback(
    async (payload: {
      entityId?: string;
      supplierId?: string;
    }) => {
      return triggerCacheInvalidation('product.updated', payload);
    },
    []
  );

  const invalidateProductCreated = useCallback(
    async (payload: {
      entityId?: string;
      supplierId?: string;
    }) => {
      return triggerCacheInvalidation('product.created', payload);
    },
    []
  );

  const invalidateProductDeleted = useCallback(
    async (payload: {
      entityId?: string;
    }) => {
      return triggerCacheInvalidation('product.deleted', payload);
    },
    []
  );

  const invalidateAnalytics = useCallback(async () => {
    return triggerCacheInvalidation('analytics.new', {});
  }, []);

  const invalidateDashboard = useCallback(async () => {
    return triggerCacheInvalidation('dashboard.refresh', {});
  }, []);

  const invalidateAll = useCallback(async () => {
    return triggerCacheInvalidation('cache.clear_all', {});
  }, []);

  return {
    // Inventory invalidations
    invalidateInventory,
    invalidateInventoryCreated,
    invalidateInventoryDeleted,
    invalidateInventoryBulk,
    invalidateStockMovement,

    // Supplier invalidations
    invalidateSupplier,
    invalidateSupplierCreated,
    invalidateSupplierDeleted,

    // Product invalidations
    invalidateProduct,
    invalidateProductCreated,
    invalidateProductDeleted,

    // Analytics and Dashboard
    invalidateAnalytics,
    invalidateDashboard,

    // Global invalidation
    invalidateAll,
  };
}

/**
 * Hook to get manual query invalidation functions
 * For direct React Query invalidation without events
 */
export function useManualInvalidation() {
  const queryClient = useQueryClient();

  const invalidateQueries = useCallback(
    async (queryKey: unknown[]) => {
      await queryClient.invalidateQueries({ queryKey });
    },
    [queryClient]
  );

  const resetQueries = useCallback(
    async (queryKey: unknown[]) => {
      await queryClient.resetQueries({ queryKey });
    },
    [queryClient]
  );

  const refetchQueries = useCallback(
    async (queryKey: unknown[]) => {
      await queryClient.refetchQueries({ queryKey });
    },
    [queryClient]
  );

  return {
    invalidateQueries,
    resetQueries,
    refetchQueries,
  };
}

/**
 * Hook for mutation invalidation patterns
 * Common pattern: onSuccess callback triggers invalidation
 */
export function useMutationInvalidation() {
  const { invalidateInventory, invalidateSupplier, invalidateAnalytics } =
    useInvalidation();

  /**
   * Get onSuccess callback for inventory mutations
   */
  const onInventorySuccess = useCallback(
    (
      data: unknown,
      options?: {
        entityId?: string;
        supplierId?: string;
        category?: string;
      }
    ) => {
      invalidateInventory({
        entityId: options?.entityId || data?.id,
        supplierId: options?.supplierId,
        category: options?.category,
      });
      invalidateAnalytics();
    },
    [invalidateInventory, invalidateAnalytics]
  );

  /**
   * Get onSuccess callback for supplier mutations
   */
  const onSupplierSuccess = useCallback(
    (
      data: unknown,
      options?: {
        entityId?: string;
      }
    ) => {
      invalidateSupplier({
        entityId: options?.entityId || data?.id,
      });
      invalidateInventory({}); // Supplier changes affect inventory
      invalidateAnalytics();
    },
    [invalidateSupplier, invalidateInventory, invalidateAnalytics]
  );

  return {
    onInventorySuccess,
    onSupplierSuccess,
  };
}
