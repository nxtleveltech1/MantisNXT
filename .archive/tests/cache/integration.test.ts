/**
 * ITERATION 2 - ADR-1 & ADR-6: Integration Tests
 *
 * Integration tests for cache system with React Query.
 * Tests end-to-end cache invalidation and query caching.
 */

import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardMetrics } from '@/hooks/api/useDashboardMetrics';
import { useInventoryList } from '@/hooks/api/useInventoryList';
import { useAnalyticsOverview } from '@/hooks/api/useAnalyticsOverview';
import { useInvalidation } from '@/hooks/api/useInvalidation';
import { initializeInvalidationManager } from '@/lib/cache/event-invalidation';

// Mock fetch
global.fetch = jest.fn();

describe('Cache Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 5 * 60 * 1000,
        },
      },
    });

    initializeInvalidationManager(queryClient);

    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Cache Hit/Miss Behavior', () => {
    it('should cache dashboard metrics query', async () => {
      const mockData = {
        success: true,
        data: {
          totalSuppliers: 10,
          activeSuppliers: 8,
          totalInventoryItems: 100,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const wrapper = ({ children }: any) => (
        <queryClient.QueryClientProvider client={queryClient}>
          {children}
        </queryClient.QueryClientProvider>
      );

      const { result, rerender } = renderHook(() => useDashboardMetrics(), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockData);

      // Rerender - should use cache
      rerender();

      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, cache hit
      expect(result.current.data).toEqual(mockData);
    });

    it('should cache inventory list with different filters separately', async () => {
      const mockData1 = {
        success: true,
        data: [{ id: '1', category: 'electronics' }],
      };
      const mockData2 = {
        success: true,
        data: [{ id: '2', category: 'furniture' }],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData2,
        });

      const wrapper = ({ children }: any) => (
        <queryClient.QueryClientProvider client={queryClient}>
          {children}
        </queryClient.QueryClientProvider>
      );

      // First query with electronics filter
      const { result: result1 } = renderHook(
        () => useInventoryList({ category: ['electronics'] }),
        { wrapper }
      );

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      // Second query with furniture filter
      const { result: result2 } = renderHook(
        () => useInventoryList({ category: ['furniture'] }),
        { wrapper }
      );

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Both queries should have been made (different cache keys)
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result1.current.data).toEqual(mockData1);
      expect(result2.current.data).toEqual(mockData2);
    });
  });

  describe('Event-Driven Invalidation', () => {
    it('should invalidate dashboard metrics on inventory update', async () => {
      const mockData = {
        success: true,
        data: { totalInventoryItems: 100 },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const wrapper = ({ children }: any) => (
        <queryClient.QueryClientProvider client={queryClient}>
          {children}
        </queryClient.QueryClientProvider>
      );

      // Load initial data
      const { result: metricsResult } = renderHook(
        () => useDashboardMetrics(),
        { wrapper }
      );

      await waitFor(() => expect(metricsResult.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Trigger invalidation
      const { result: invalidationResult } = renderHook(
        () => useInvalidation(),
        { wrapper }
      );

      await invalidationResult.current.invalidateInventory({
        entityId: 'test-item',
      });

      await waitFor(
        () => {
          const query = queryClient.getQueryCache().find({
            queryKey: ['dashboard-metrics'],
          });
          return query?.state.isInvalidated === true;
        },
        { timeout: 1000 }
      );

      const query = queryClient.getQueryCache().find({
        queryKey: ['dashboard-metrics'],
      });

      expect(query?.state.isInvalidated).toBe(true);
    });

    it('should invalidate inventory list on inventory creation', async () => {
      const mockData = {
        success: true,
        data: [{ id: '1', name: 'Item 1' }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const wrapper = ({ children }: any) => (
        <queryClient.QueryClientProvider client={queryClient}>
          {children}
        </queryClient.QueryClientProvider>
      );

      const { result: inventoryResult } = renderHook(
        () => useInventoryList({}),
        { wrapper }
      );

      await waitFor(() => expect(inventoryResult.current.isSuccess).toBe(true));

      const { result: invalidationResult } = renderHook(
        () => useInvalidation(),
        { wrapper }
      );

      await invalidationResult.current.invalidateInventoryCreated({
        entityId: 'new-item',
      });

      await waitFor(
        () => {
          const query = queryClient.getQueryCache().find({
            queryKey: ['inventory-list', {}],
          });
          return query?.state.isInvalidated === true;
        },
        { timeout: 1000 }
      );

      const query = queryClient.getQueryCache().find({
        queryKey: ['inventory-list', {}],
      });

      expect(query?.state.isInvalidated).toBe(true);
    });
  });

  describe('Cache Performance', () => {
    it('should measure cache hit performance improvement', async () => {
      const mockData = {
        success: true,
        data: { totalSuppliers: 10 },
      };

      (global.fetch as jest.Mock).mockImplementation(async () => {
        // Simulate 500ms network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          ok: true,
          json: async () => mockData,
        };
      });

      const wrapper = ({ children }: any) => (
        <queryClient.QueryClientProvider client={queryClient}>
          {children}
        </queryClient.QueryClientProvider>
      );

      // First request (cache miss)
      const start1 = Date.now();
      const { result: result1 } = renderHook(() => useDashboardMetrics(), {
        wrapper,
      });

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));
      const duration1 = Date.now() - start1;

      // Second request (cache hit)
      const start2 = Date.now();
      const { result: result2 } = renderHook(() => useDashboardMetrics(), {
        wrapper,
      });

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));
      const duration2 = Date.now() - start2;

      // Cache hit should be significantly faster
      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(100); // Should be near instant

      // Verify improvement factor
      const improvementFactor = duration1 / duration2;
      expect(improvementFactor).toBeGreaterThan(5); // At least 5x faster
    });
  });

  describe('Consistency Validation', () => {
    it('should maintain cache consistency after invalidation', async () => {
      const initialData = {
        success: true,
        data: { totalInventoryItems: 100 },
      };

      const updatedData = {
        success: true,
        data: { totalInventoryItems: 110 },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedData,
        });

      const wrapper = ({ children }: any) => (
        <queryClient.QueryClientProvider client={queryClient}>
          {children}
        </queryClient.QueryClientProvider>
      );

      // Load initial data
      const { result, rerender } = renderHook(() => useDashboardMetrics(), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(initialData);

      // Invalidate cache
      const { result: invalidationResult } = renderHook(
        () => useInvalidation(),
        { wrapper }
      );

      await invalidationResult.current.invalidateDashboard();

      // Refetch should get new data
      rerender();

      await waitFor(() => {
        return result.current.data?.data.totalInventoryItems === 110;
      });

      expect(result.current.data).toEqual(updatedData);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
