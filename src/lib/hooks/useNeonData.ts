/**
 * React hooks for Neon database operations
 *
 * Provides type-safe hooks for:
 * - Active inventory selection
 * - NXT SOH (authoritative stock view)
 * - Pricelist uploads
 * - Selection products
 */

'use client';

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  InventorySelection,
  NxtSoh,
  PricelistUpload,
  InventorySelectedItem,
} from '@/types/nxt-spp';

// ============================================================================
// API Client Functions
// ============================================================================

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }
  const data = await response.json();
  return data.data || data;
}

async function mutator<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  const data = await response.json();
  return data.data || data;
}

// ============================================================================
// Active Selection Hooks
// ============================================================================

/**
 * Get the currently active inventory selection
 */
export function useActiveSelection() {
  return useQuery<InventorySelection | null>({
    queryKey: ['activeSelection'],
    queryFn: () => fetcher<InventorySelection>('/api/core/selections/active'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Activate a selection (with automatic deactivation of others)
 */
export function useActivateSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      selectionId,
      deactivateOthers = false,
    }: {
      selectionId: string;
      deactivateOthers?: boolean;
    }) => {
      return mutator<InventorySelection>(`/api/core/selections/${selectionId}/activate`, {
        method: 'POST',
        body: JSON.stringify({ deactivate_others: deactivateOthers }),
      });
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['activeSelection'] });
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      queryClient.invalidateQueries({ queryKey: ['nxtSoh'] });
    },
  });
}

// ============================================================================
// NXT SOH Hooks (Authoritative Stock View)
// ============================================================================

export interface NxtSohFilters {
  supplier_ids?: string[];
  location_ids?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get NXT SOH (authoritative stock on hand for selected items)
 *
 * This is the SINGLE SOURCE OF TRUTH for operational stock queries.
 * Returns ONLY items in the active selection.
 */
export function useNxtSoh(
  filters?: NxtSohFilters,
  options?: Omit<UseQueryOptions<NxtSoh[]>, 'queryKey' | 'queryFn'>
) {
  const params = new URLSearchParams();

  if (filters?.supplier_ids && filters.supplier_ids.length > 0) {
    params.set('supplier_ids', filters.supplier_ids.join(','));
  }
  if (filters?.location_ids && filters.location_ids.length > 0) {
    params.set('location_ids', filters.location_ids.join(','));
  }
  if (filters?.search) {
    params.set('search', filters.search);
  }
  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters?.offset) {
    params.set('offset', filters.offset.toString());
  }

  const url = `/api/serve/nxt-soh${params.toString() ? `?${params.toString()}` : ''}`;

  return useQuery<NxtSoh[]>({
    queryKey: ['nxtSoh', filters],
    queryFn: () => fetcher<NxtSoh[]>(url),
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

// ============================================================================
// Pricelist Upload Hooks
// ============================================================================

export interface PricelistUploadFilters {
  supplier_id?: string;
  status?: PricelistUpload['status'][];
  search?: string;
  from_date?: Date;
  to_date?: Date;
  limit?: number;
  offset?: number;
}

/**
 * List pricelist uploads with filtering
 */
export function usePricelistUploads(
  filters?: PricelistUploadFilters,
  options?: Omit<
    UseQueryOptions<{ uploads: PricelistUpload[]; total: number }>,
    'queryKey' | 'queryFn'
  >
) {
  const params = new URLSearchParams();

  if (filters?.supplier_id) {
    params.set('supplier_id', filters.supplier_id);
  }
  if (filters?.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }
  if (filters?.search) {
    params.set('search', filters.search);
  }
  if (filters?.from_date) {
    params.set('from_date', filters.from_date.toISOString());
  }
  if (filters?.to_date) {
    params.set('to_date', filters.to_date.toISOString());
  }
  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters?.offset) {
    params.set('offset', filters.offset.toString());
  }

  const url = `/api/spp/uploads${params.toString() ? `?${params.toString()}` : ''}`;

  return useQuery<{ uploads: PricelistUpload[]; total: number }>({
    queryKey: ['pricelistUploads', filters],
    queryFn: () => fetcher(url),
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Get upload details with all rows
 */
export function useUploadDetails(uploadId: string | null) {
  return useQuery({
    queryKey: ['uploadDetails', uploadId],
    queryFn: () => fetcher(`/api/spp/uploads/${uploadId}`),
    enabled: !!uploadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Reprocess a failed upload
 */
export function useReprocessUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uploadId: string) => {
      return mutator(`/api/spp/uploads/${uploadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'reprocess' }),
      });
    },
    onSuccess: (_, uploadId) => {
      queryClient.invalidateQueries({ queryKey: ['uploadDetails', uploadId] });
      queryClient.invalidateQueries({ queryKey: ['pricelistUploads'] });
    },
  });
}

// ============================================================================
// Selection Products Hooks
// ============================================================================

export interface SelectionProductFilters {
  status?: InventorySelectedItem['status'];
  supplier_id?: string;
  search?: string;
}

/**
 * Get products in a selection
 */
export function useSelectionProducts(
  selectionId: string | null,
  filters?: SelectionProductFilters
) {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.set('status', filters.status);
  }
  if (filters?.supplier_id) {
    params.set('supplier_id', filters.supplier_id);
  }
  if (filters?.search) {
    params.set('search', filters.search);
  }

  const url = `/api/core/selections/${selectionId}/products${params.toString() ? `?${params.toString()}` : ''}`;

  return useQuery<InventorySelectedItem[]>({
    queryKey: ['selectionProducts', selectionId, filters],
    queryFn: () => fetcher(url),
    enabled: !!selectionId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Add products to a selection (bulk)
 */
export function useAddProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      selectionId,
      supplierProductIds,
      notes,
    }: {
      selectionId: string;
      supplierProductIds: string[];
      notes?: string;
    }) => {
      return mutator(`/api/core/selections/${selectionId}/products`, {
        method: 'POST',
        body: JSON.stringify({
          supplier_product_ids: supplierProductIds,
          notes,
        }),
      });
    },
    onSuccess: (_, { selectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['selectionProducts', selectionId] });
      queryClient.invalidateQueries({ queryKey: ['selections'] });
    },
  });
}

/**
 * Remove products from a selection (bulk)
 */
export function useRemoveProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      selectionId,
      supplierProductIds,
    }: {
      selectionId: string;
      supplierProductIds: string[];
    }) => {
      return mutator(`/api/core/selections/${selectionId}/products`, {
        method: 'DELETE',
        body: JSON.stringify({
          supplier_product_ids: supplierProductIds,
        }),
      });
    },
    onSuccess: (_, { selectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['selectionProducts', selectionId] });
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      queryClient.invalidateQueries({ queryKey: ['nxtSoh'] });
    },
  });
}

// ============================================================================
// Dashboard Hooks
// ============================================================================

/**
 * Get dashboard metrics
 */
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: () => fetcher('/api/spp/dashboard/metrics'),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
}
