/**
 * ITERATION 2 - ADR-1: Inventory List Cached Query Hook
 *
 * Phase 1 cache integration for inventory list endpoint.
 * Target: 70-90% response time reduction (800ms → 80-240ms)
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/lib/cache/patterns';

/**
 * Inventory list filters
 */
export interface InventoryFilters {
  search?: string;
  category?: string[];
  brand?: string[];
  supplier?: string[];
  status?: string[];
  low_stock?: boolean;
  out_of_stock?: boolean;
  over_stock?: boolean;
  min_cost?: number;
  max_cost?: number;
  min_price?: number;
  max_price?: number;
  location?: string[];
  tags?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  include_analytics?: boolean;
  include_movements?: boolean;
}

/**
 * Inventory list data structure
 */
export interface InventoryListData {
  success: boolean;
  data: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  analytics?: {
    total_items: number;
    out_of_stock: number;
    low_stock: number;
    over_stock: number;
    categories: number;
    brands: number;
    suppliers: number;
    total_value: number;
    avg_cost_price: number;
    avg_sale_price: number;
    avg_margin_percentage: number;
  };
  recentMovements?: unknown[];
  filters: InventoryFilters;
}

/**
 * Inventory item structure
 */
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_email?: string;
  supplier_contact?: string;
  supplier_sku?: string;
  cost_price: number;
  sale_price?: number;
  rsp?: number;
  currency: string;
  stock_qty: number;
  reserved_qty: number;
  available_qty: number;
  reorder_point: number;
  max_stock?: number;
  unit?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  barcode?: string;
  location?: string;
  tags: string[];
  images: string[];
  status: 'active' | 'inactive' | 'discontinued';
  tax_rate: number;
  custom_fields: Record<string, unknown>;
  notes?: string;
  stock_status: 'normal' | 'low' | 'out' | 'over';
  margin: number;
  margin_percentage: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch inventory list from API
 */
async function fetchInventoryList(
  filters?: InventoryFilters
): Promise<InventoryListData> {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, String(value));
        }
      }
    });
  }

  const url = `/api/inventory/complete${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch inventory list');
  }

  return response.json();
}

/**
 * Cache policy for inventory list
 * Stale time: 5 minutes (moderate caching, changes less frequently than dashboard)
 * GC time: 15 minutes (keep in cache for longer sessions)
 */
const CACHE_POLICY = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 15 * 60 * 1000, // 15 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

/**
 * Cached query hook for inventory list
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Event-driven invalidation on inventory changes
 * - Filter-based cache keys for granular caching
 * - Performance monitoring integration
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useInventoryList({
 *   category: ['Electronics'],
 *   low_stock: true,
 * });
 * ```
 */
export function useInventoryList(
  filters?: InventoryFilters
): UseQueryResult<InventoryListData> {
  return useQuery({
    queryKey: QueryKeys.inventoryList(filters),
    queryFn: () => fetchInventoryList(filters),
    ...CACHE_POLICY,
  });
}

/**
 * Hook variant with custom cache policy
 */
export function useInventoryListCustom(
  filters?: InventoryFilters,
  cachePolicy?: Partial<typeof CACHE_POLICY>
): UseQueryResult<InventoryListData> {
  return useQuery({
    queryKey: QueryKeys.inventoryList(filters),
    queryFn: () => fetchInventoryList(filters),
    ...CACHE_POLICY,
    ...cachePolicy,
  });
}
