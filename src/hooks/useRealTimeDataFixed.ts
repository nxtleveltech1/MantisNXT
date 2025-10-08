/**
 * OPTIMIZED Real-Time Data Hooks with Performance & Caching Improvements
 * Enhanced version with better caching, deduplication, and memory management
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient, useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';

// Performance-optimized configuration
const API_CONFIG = {
  timeout: 12000, // Reduced from 15s to 12s for better UX
  retries: 3, // Increased retries but with better backoff
  staleTime: 2 * 60 * 1000, // 2 minutes - better caching
  refetchInterval: 3 * 60 * 1000, // 3 minutes - more frequent updates
  fallbackRefreshInterval: 45 * 1000, // 45 seconds for fallback
  cacheTime: 10 * 60 * 1000, // 10 minutes cache retention
  dedupingInterval: 2000, // 2 seconds request deduplication
};

// Request deduplication cache
const requestCache = new Map<string, Promise<any>>();
const cacheCleanupInterval = 30000; // Clean cache every 30 seconds

// Cleanup old requests periodically
setInterval(() => {
  requestCache.clear();
}, cacheCleanupInterval);

// Enhanced fetch with timeout, caching, and deduplication
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = API_CONFIG.timeout) {
  // Generate cache key for deduplication
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  
  // Return cached promise if request is in flight
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestPromise = (async () => {
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=120', // 2 minute browser cache
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // More detailed error messages
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out - server may be overloaded');
      }
      throw error;
    } finally {
      // Clean up cache entry after request completes
      setTimeout(() => {
        requestCache.delete(cacheKey);
      }, API_CONFIG.dedupingInterval);
    }
  })();

  // Cache the promise
  requestCache.set(cacheKey, requestPromise);
  
  return requestPromise;
}

// Enhanced supplier data hook with optimized caching and deduplication
export const useRealTimeSuppliers = (filters = {}) => {
  const queryClient = useQueryClient();

  // Stable query key generation to prevent unnecessary refetches
  const queryKey = useMemo(() => {
    const sortedFilters = Object.keys(filters).sort().reduce((sorted, key) => {
      sorted[key] = filters[key];
      return sorted;
    }, {});
    return ['suppliers', sortedFilters];
  }, [filters]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const url = `/api/suppliers?${params.toString()}`;
      console.log('🔍 Fetching suppliers from:', url);

      return fetchWithTimeout(url);
    },
    staleTime: API_CONFIG.staleTime,
    cacheTime: API_CONFIG.cacheTime,
    refetchInterval: API_CONFIG.refetchInterval,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    notifyOnChangeProps: ['data', 'error', 'isLoading'], // Reduce re-renders
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors, only on network/timeout errors
      if (error.message.includes('HTTP 4')) return false;
      return failureCount < API_CONFIG.retries;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    onError: (error) => {
      console.error('❌ Suppliers fetch error:', error.message);
    },
    onSuccess: (data) => {
      console.log('✅ Suppliers loaded:', data?.data?.length || 0, 'items');
      
      // Pre-populate individual supplier queries in cache for performance
      data?.data?.forEach(supplier => {
        queryClient.setQueryData(
          ['supplier', supplier.id],
          supplier,
          { updatedAt: Date.now() }
        );
      });
    }
  });
};

// Enhanced inventory hook with optimized caching and performance
export const useRealTimeInventory = (filters = {}) => {
  const queryClient = useQueryClient();

  // Stable query key generation
  const queryKey = useMemo(() => {
    const sortedFilters = Object.keys(filters).sort().reduce((sorted, key) => {
      sorted[key] = filters[key];
      return sorted;
    }, {});
    return ['inventory', sortedFilters];
  }, [filters]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const url = `/api/inventory?${params.toString()}`;
      console.log('🔍 Fetching inventory from:', url);

      return fetchWithTimeout(url);
    },
    staleTime: API_CONFIG.staleTime,
    cacheTime: API_CONFIG.cacheTime,
    refetchInterval: API_CONFIG.refetchInterval,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    notifyOnChangeProps: ['data', 'error', 'isLoading'],
    retry: (failureCount, error) => {
      if (error.message.includes('HTTP 4')) return false;
      return failureCount < API_CONFIG.retries;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    onError: (error) => {
      console.error('❌ Inventory fetch error:', error.message);
    },
    onSuccess: (data) => {
      console.log('✅ Inventory loaded:', data?.data?.length || 0, 'items');
      
      // Cache individual inventory items for performance
      data?.data?.forEach(item => {
        queryClient.setQueryData(
          ['inventory-item', item.id],
          item,
          { updatedAt: Date.now() }
        );
      });
    }
  });
};

// Optimized dashboard metrics hook with better coordination
export const useRealTimeDashboard = () => {
  const queryClient = useQueryClient();
  
  // Use ref to prevent race conditions in refetch
  const refetchingRef = useRef(false);

  const metricsQuery = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      console.log('🔍 Fetching dashboard metrics...');
      return fetchWithTimeout('/api/analytics/dashboard');
    },
    staleTime: API_CONFIG.staleTime,
    cacheTime: API_CONFIG.cacheTime,
    refetchInterval: API_CONFIG.refetchInterval,
    refetchOnWindowFocus: false,
    notifyOnChangeProps: ['data', 'error', 'isLoading'],
    retry: (failureCount, error) => {
      if (error.message.includes('HTTP 4')) return false;
      return failureCount < API_CONFIG.retries;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    onError: (error) => {
      console.error('❌ Dashboard metrics error:', error.message);
    },
    onSuccess: (data) => {
      console.log('✅ Dashboard metrics loaded');
    }
  });

  const activityQuery = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      console.log('🔍 Fetching recent activities...');
      return fetchWithTimeout('/api/activities/recent');
    },
    staleTime: API_CONFIG.fallbackRefreshInterval,
    cacheTime: API_CONFIG.cacheTime,
    refetchInterval: API_CONFIG.refetchInterval,
    refetchOnWindowFocus: false,
    notifyOnChangeProps: ['data', 'error', 'isLoading'],
    retry: (failureCount, error) => {
      if (error.message.includes('HTTP 4')) return false;
      return failureCount < API_CONFIG.retries;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    onError: (error) => {
      console.error('❌ Activities fetch error:', error.message);
    },
    onSuccess: (data) => {
      console.log('✅ Activities loaded:', data?.data?.length || 0, 'items');
    }
  });

  // Enhanced real-time connection state with better memory management
  const [realTimeData, setRealTimeData] = useState(() => ({
    connected: true,
    lastUpdate: new Date().toISOString(),
    refetch: undefined as (() => Promise<void>) | undefined
  }));

  // Memoized refetch function to prevent unnecessary re-renders
  const refetch = useCallback(async () => {
    if (refetchingRef.current) {
      console.log('⏳ Refetch already in progress, skipping...');
      return;
    }

    refetchingRef.current = true;
    try {
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        metricsQuery.refetch(),
        activityQuery.refetch()
      ]);

      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.warn(`⚠️ ${failures.length} of 2 dashboard queries failed`);
      }

      setRealTimeData(prev => ({
        ...prev,
        lastUpdate: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Dashboard refetch failed:', error);
    } finally {
      refetchingRef.current = false;
    }
  }, [metricsQuery.refetch, activityQuery.refetch]);

  // Update refetch function in state
  useEffect(() => {
    setRealTimeData(prev => ({ ...prev, refetch }));
  }, [refetch]);

  return {
    metrics: metricsQuery.data,
    activities: activityQuery.data?.data || [],
    loading: metricsQuery.isLoading || activityQuery.isLoading,
    error: metricsQuery.error || activityQuery.error,
    realTimeData,
    refetch
  };
};

// Optimized alerts hook with better caching and priority handling
export const useAlerts = (options = {}) => {
  const { priority = 'all', unreadOnly = false } = options;

  const queryKey = useMemo(() => {
    return ['alerts', { priority, unreadOnly }];
  }, [priority, unreadOnly]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      console.log('🔍 Fetching alerts...');
      const params = new URLSearchParams();
      
      if (priority !== 'all') params.append('priority', priority);
      if (unreadOnly) params.append('unread_only', 'true');
      
      const url = `/api/alerts${params.toString() ? `?${params.toString()}` : ''}`;
      return fetchWithTimeout(url);
    },
    staleTime: API_CONFIG.fallbackRefreshInterval,
    cacheTime: API_CONFIG.cacheTime,
    refetchInterval: API_CONFIG.refetchInterval,
    refetchOnWindowFocus: false,
    notifyOnChangeProps: ['data', 'error', 'isLoading'],
    retry: (failureCount, error) => {
      if (error.message.includes('HTTP 4')) return false;
      return failureCount < API_CONFIG.retries;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    onError: (error) => {
      console.error('❌ Alerts fetch error:', error.message);
    },
    onSuccess: (data) => {
      console.log('✅ Alerts loaded:', data?.data?.length || 0, 'items');
    }
  });
};

// Performance monitoring hook to track hook usage
export const useHookPerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    activeQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errorRate: 0,
    averageResponseTime: 0
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const updateMetrics = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      const activeQueries = queries.filter(q => q.state.isFetching).length;
      const successfulQueries = queries.filter(q => q.state.status === 'success').length;
      const errorQueries = queries.filter(q => q.state.status === 'error').length;
      const totalQueries = queries.length;

      setMetrics({
        activeQueries,
        cacheHits: successfulQueries,
        cacheMisses: errorQueries,
        errorRate: totalQueries > 0 ? (errorQueries / totalQueries) * 100 : 0,
        averageResponseTime: 0 // Would need more detailed tracking
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  return metrics;
};

// Optimized price lists hook with better conditional fetching
export const usePriceLists = (supplierId?: string, options = {}) => {
  const { includeInactive = false, categoryFilter = null } = options;

  const queryKey = useMemo(() => {
    return ['price-lists', supplierId, { includeInactive, categoryFilter }];
  }, [supplierId, includeInactive, categoryFilter]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = supplierId
        ? `/api/suppliers/${supplierId}/pricelists`
        : '/api/pricelists';

      const params = new URLSearchParams();
      if (includeInactive) params.append('include_inactive', 'true');
      if (categoryFilter) params.append('category', categoryFilter);

      const finalUrl = `${url}${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('🔍 Fetching price lists from:', finalUrl);
      return fetchWithTimeout(finalUrl);
    },
    enabled: !!supplierId, // Only fetch if supplierId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: API_CONFIG.cacheTime,
    keepPreviousData: true,
    notifyOnChangeProps: ['data', 'error', 'isLoading'],
    retry: (failureCount, error) => {
      if (error.message.includes('HTTP 4')) return false;
      return failureCount < API_CONFIG.retries;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    onError: (error) => {
      console.error('❌ Price lists fetch error:', error.message);
    }
  });
};

// Global cleanup function for memory management
export const useGlobalCleanup = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const cleanup = () => {
      // Clear old cache entries
      queryClient.getQueryCache().clear();
      
      // Clear request deduplication cache
      requestCache.clear();
      
      console.log('🧹 Performed global cache cleanup');
    };

    // Cleanup every 30 minutes
    const interval = setInterval(cleanup, 30 * 60 * 1000);

    // Cleanup on page unload
    const handleBeforeUnload = () => {
      cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [queryClient]);
};

// Optimized supplier mutations with better state management and error recovery
export const useSupplierMutations = () => {
  const queryClient = useQueryClient();

  const createSupplier = useMutation({
    mutationFn: async (supplierData: any) => {
      console.log('📤 Creating supplier...');
      return fetchWithTimeout('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplierData),
      });
    },
    onMutate: async (supplierData) => {
      // Optimistic creation
      const tempId = `temp-${Date.now()}`;
      const optimisticSupplier = { ...supplierData, id: tempId, status: 'creating' };

      // Cancel outgoing refetches
      await queryClient.cancelQueries(['suppliers']);

      // Snapshot previous value
      const previousSuppliers = queryClient.getQueryData(['suppliers']);

      // Optimistically add new supplier
      queryClient.setQueryData(['suppliers'], (old: any) => ({
        ...old,
        data: [optimisticSupplier, ...(old?.data || [])]
      }));

      return { previousSuppliers, tempId };
    },
    onSuccess: (data, variables, context) => {
      console.log('✅ Supplier created successfully');

      // Replace optimistic supplier with real data
      queryClient.setQueryData(['suppliers'], (old: any) => ({
        ...old,
        data: old?.data?.map((supplier: any) =>
          supplier.id === context.tempId ? data.data : supplier
        ) || [data.data]
      }));

      // Update individual supplier cache
      queryClient.setQueryData(['supplier', data.data.id], data.data);

      // Invalidate related queries
      queryClient.invalidateQueries(['dashboard-metrics']);
    },
    onError: (error, variables, context) => {
      console.error('❌ Supplier creation failed:', error.message);
      // Rollback optimistic update
      queryClient.setQueryData(['suppliers'], context?.previousSuppliers);
    }
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, data: supplierData }: { id: string, data: any }) => {
      console.log('📤 Updating supplier:', id);
      return fetchWithTimeout(`/api/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(supplierData),
      });
    },
    onMutate: async ({ id, data: newData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['suppliers']);
      await queryClient.cancelQueries(['supplier', id]);

      // Snapshot previous values
      const previousSuppliers = queryClient.getQueryData(['suppliers']);
      const previousSupplier = queryClient.getQueryData(['supplier', id]);

      // Optimistically update list
      queryClient.setQueryData(['suppliers'], (old: any) => ({
        ...old,
        data: old?.data?.map((supplier: any) =>
          supplier.id === id ? { ...supplier, ...newData, status: 'updating' } : supplier
        ) || []
      }));

      // Optimistically update individual supplier
      queryClient.setQueryData(['supplier', id], (old: any) => ({
        ...old,
        ...newData,
        status: 'updating'
      }));

      return { previousSuppliers, previousSupplier };
    },
    onSuccess: (data, { id }) => {
      console.log('✅ Supplier updated successfully');

      // Update with real server data
      queryClient.setQueryData(['suppliers'], (old: any) => ({
        ...old,
        data: old?.data?.map((supplier: any) =>
          supplier.id === id ? data.data : supplier
        ) || []
      }));

      queryClient.setQueryData(['supplier', id], data.data);
    },
    onError: (err, { id }, context) => {
      console.error('❌ Supplier update failed:', err.message);
      // Rollback optimistic updates
      queryClient.setQueryData(['suppliers'], context?.previousSuppliers);
      queryClient.setQueryData(['supplier', id], context?.previousSupplier);
    },
    onSettled: (data, error, { id }) => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries(['suppliers']);
      queryClient.invalidateQueries(['supplier', id]);
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      console.log('📤 Deleting supplier:', id);
      return fetchWithTimeout(`/api/suppliers/${id}`, {
        method: 'DELETE',
      });
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['suppliers']);

      // Snapshot previous value
      const previousSuppliers = queryClient.getQueryData(['suppliers']);

      // Optimistically remove supplier
      queryClient.setQueryData(['suppliers'], (old: any) => ({
        ...old,
        data: old?.data?.filter((supplier: any) => supplier.id !== id) || []
      }));

      return { previousSuppliers };
    },
    onSuccess: (data, id) => {
      console.log('✅ Supplier deleted successfully');
      // Remove from individual cache
      queryClient.removeQueries(['supplier', id]);
      queryClient.invalidateQueries(['dashboard-metrics']);
    },
    onError: (error, id, context) => {
      console.error('❌ Supplier deletion failed:', error.message);
      // Rollback optimistic deletion
      queryClient.setQueryData(['suppliers'], context?.previousSuppliers);
    }
  });

  return { createSupplier, updateSupplier, deleteSupplier };
};

// Optimized infinite scroll with better performance and caching
export const useInfiniteSuppliers = (filters = {}) => {
  const queryKey = useMemo(() => {
    const sortedFilters = Object.keys(filters).sort().reduce((sorted, key) => {
      sorted[key] = filters[key];
      return sorted;
    }, {});
    return ['suppliers-infinite', sortedFilters];
  }, [filters]);

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '25', // Increased page size for better performance
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : String(value)
          ])
        )
      });

      const url = `/api/suppliers?${params.toString()}`;
      console.log('🔍 Fetching infinite suppliers page', pageParam);

      return fetchWithTimeout(url);
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNext ? (lastPage.pagination.page + 1) : undefined,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: API_CONFIG.cacheTime,
    notifyOnChangeProps: ['data', 'error', 'isLoading', 'hasNextPage'],
    retry: (failureCount, error) => {
      if (error.message.includes('HTTP 4')) return false;
      return failureCount < API_CONFIG.retries;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    onError: (error) => {
      console.error('❌ Infinite suppliers fetch error:', error.message);
    }
  });
};

// Export all optimized hooks with performance monitoring
export default {
  useRealTimeSuppliers,
  useRealTimeInventory,
  useRealTimeDashboard,
  useAlerts,
  usePriceLists,
  useSupplierMutations,
  useInfiniteSuppliers,
  useHookPerformanceMonitor,
  useGlobalCleanup,
  API_CONFIG // Export config for reference
};