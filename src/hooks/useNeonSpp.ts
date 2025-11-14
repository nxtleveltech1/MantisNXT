/**
 * React Query hooks for Neon SPP endpoints
 *
 * Provides:
 * - Optimistic updates
 * - Automatic refetching
 * - Loading and error states
 * - Cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  InventorySelection,
  PricelistUpload,
  DashboardMetrics,
  NxtSoh,
  ProductTableBySupplier,
  MergeResult,
} from '@/types/nxt-spp';

// Query keys
export const sppKeys = {
  all: ['spp'] as const,
  activeSelection: () => [...sppKeys.all, 'selection', 'active'] as const,
  selections: () => [...sppKeys.all, 'selections'] as const,
  selection: (id: string) => [...sppKeys.selections(), id] as const,
  uploads: (filters?: Record<string, unknown>) => [...sppKeys.all, 'uploads', filters] as const,
  upload: (id: string) => [...sppKeys.all, 'upload', id] as const,
  metrics: () => [...sppKeys.all, 'metrics'] as const,
  nxtSoh: (filters?: Record<string, unknown>) => [...sppKeys.all, 'nxt-soh', filters] as const,
  productsBySupplier: (filters?: Record<string, unknown>) => [...sppKeys.all, 'products', filters] as const,
  selectionProducts: (selectionId: string) => [...sppKeys.selection(selectionId), 'products'] as const,
};

// ============================================================================
// ACTIVE SELECTION
// ============================================================================

export function useActiveSelection() {
  return useQuery({
    queryKey: sppKeys.activeSelection(),
    queryFn: async (): Promise<InventorySelection | null> => {
      const response = await fetch('/api/core/selections/active');
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch active selection');
      }
      const data = await response.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// LIST SELECTIONS
// ============================================================================

export function useSelections(status?: 'draft' | 'active' | 'archived' | string) {
  return useQuery({
    queryKey: sppKeys.selections(),
    queryFn: async (): Promise<InventorySelection[]> => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);

      const response = await fetch(`/api/core/selections?${params}`);
      if (!response.ok) throw new Error('Failed to fetch selections');
      const data = await response.json();
      return data.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

export function useDashboardMetrics() {
  return useQuery({
    queryKey: sppKeys.metrics(),
    queryFn: async (): Promise<DashboardMetrics> => {
      const response = await fetch('/api/spp/dashboard/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      return data.data || {
        total_suppliers: 0,
        total_products: 0,
        selected_products: 0,
        selected_inventory_value: 0,
        new_products_count: 0,
        recent_price_changes_count: 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// PRICELIST UPLOADS
// ============================================================================

export function usePricelistUploads(filters?: { limit?: number; status?: string }) {
  return useQuery({
    queryKey: sppKeys.uploads(filters),
    queryFn: async (): Promise<PricelistUpload[]> => {
      const params = new URLSearchParams();
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.status) params.append('status', filters.status);

      const response = await fetch(`/api/spp/upload?${params}`);
      if (!response.ok) throw new Error('Failed to fetch uploads');
      const data = await response.json();
      // API returns { success: true, data: { uploads: [...], total: 123 } }
      return data.data?.uploads || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useUploadPricelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: {
      file: File;
      supplier_id: string;
      filename: string;
      currency?: string;
      valid_from?: Date;
      valid_to?: Date;
      options?: Record<string, unknown>;
    }): Promise<string> => {
      const formData = new FormData();
      formData.append('file', request.file);
      formData.append('supplier_id', request.supplier_id);
      formData.append('filename', request.filename);
      if (request.currency) formData.append('currency', request.currency);
      if (request.valid_from) formData.append('valid_from', request.valid_from.toISOString());
      if (request.valid_to) formData.append('valid_to', request.valid_to.toISOString());
      if (request.options) formData.append('options', JSON.stringify(request.options));

      const response = await fetch('/api/spp/upload', {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || error.message || 'Upload failed');
        } else {
          const text = await response.text();
          throw new Error('Upload failed');
        }
      }

      let data: any;
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        throw new Error('Upload failed');
      }
      // Support both { upload_id } and { data: { upload_id } } shapes
      return (
        data.upload_id ||
        data?.data?.upload_id ||
        data?.upload?.upload_id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sppKeys.uploads() });
    },
  });
}

export function useMergeUpload() {
  const queryClient = useQueryClient();

  type MergeParams = string | { uploadId: string; skipInvalidRows?: boolean };

  return useMutation({
    mutationFn: async (params: MergeParams): Promise<MergeResult> => {
      const uploadId = typeof params === 'string' ? params : params.uploadId;
      const skipInvalid = typeof params === 'string' ? false : !!params.skipInvalidRows;

      const response = await fetch('/api/spp/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ upload_id: uploadId, skip_invalid_rows: skipInvalid }),
      });

      if (!response.ok) {
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || error.message || 'Merge failed');
        } else {
          const text = await response.text();
          throw new Error('Merge failed');
        }
      }

      let data: any;
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        throw new Error('Merge failed');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sppKeys.uploads() });
      queryClient.invalidateQueries({ queryKey: sppKeys.metrics() });
    },
  });
}

// ============================================================================
// NXT SOH (Stock on Hand)
// ============================================================================

export function useNxtSoh(filters?: {
  supplier_ids?: string[];
  location_ids?: string[];
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: sppKeys.nxtSoh(filters),
    queryFn: async (): Promise<{ data: NxtSoh[]; total: number; page: number }> => {
      const params = new URLSearchParams();
      if (filters?.supplier_ids) {
        filters.supplier_ids.forEach(id => params.append('supplier_id', id));
      }
      if (filters?.location_ids) {
        filters.location_ids.forEach(id => params.append('location_id', id));
      }
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/serve/nxt-soh?${params}`);
      if (!response.ok) throw new Error('Failed to fetch NXT SOH data');
      const result = await response.json();
      return {
        data: result.data || [],
        total: result.pagination?.total || 0,
        page: result.pagination?.page || 1,
      };
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!filters, // Only fetch when filters are provided
  });
}

// ============================================================================
// PRODUCT TABLE BY SUPPLIER
// ============================================================================

export function useProductsBySupplier(filters?: {
  supplier_id?: string;
  search?: string;
  is_new?: boolean;
  is_selected?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: sppKeys.productsBySupplier(filters),
    queryFn: async (): Promise<{ data: ProductTableBySupplier[]; total: number }> => {
      const params = new URLSearchParams();
      if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.is_new !== undefined) params.append('is_new', filters.is_new.toString());
      if (filters?.is_selected !== undefined) params.append('is_selected', filters.is_selected.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/serve/products-by-supplier?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const result = await response.json();
      return {
        data: result.data || [],
        total: result.pagination?.total || 0,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// SELECTION PRODUCTS
// ============================================================================

export function useSelectionProducts(selectionId: string | null) {
  return useQuery({
    queryKey: selectionId ? sppKeys.selectionProducts(selectionId) : ['no-selection'],
    queryFn: async (): Promise<ProductTableBySupplier[]> => {
      if (!selectionId) return [];

      const response = await fetch(`/api/core/selections/${selectionId}/products`);
      if (!response.ok) throw new Error('Failed to fetch selection products');
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!selectionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// ACTIVATE SELECTION
// ============================================================================

export function useActivateSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      selectionId,
      deactivateOthers = true,
    }: {
      selectionId: string;
      deactivateOthers?: boolean;
    }): Promise<InventorySelection> => {
      const response = await fetch(`/api/core/selections/${selectionId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivate_others: deactivateOthers }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Activation failed');
      }

      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sppKeys.activeSelection() });
      queryClient.invalidateQueries({ queryKey: sppKeys.metrics() });
      queryClient.invalidateQueries({ queryKey: sppKeys.nxtSoh() });
    },
  });
}

// ============================================================================
// ARCHIVE SELECTION
// ============================================================================

export function useArchiveSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (selectionId: string): Promise<void> => {
      const response = await fetch(`/api/core/selections/${selectionId}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Archive failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sppKeys.activeSelection() });
      queryClient.invalidateQueries({ queryKey: sppKeys.selections() });
    },
  });
}

// ============================================================================
// CREATE SELECTION
// ============================================================================

export function useCreateSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      selectionName,
      description,
      createdBy,
    }: {
      selectionName: string;
      description?: string;
      createdBy: string;
    }): Promise<InventorySelection> => {
      const response = await fetch('/api/core/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selection_name: selectionName,
          description,
          created_by: createdBy,
          status: 'draft',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create selection');
      }

      const data = await response.json();
      return data.selection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sppKeys.selections() });
    },
  });
}

// ============================================================================
// ADD PRODUCTS TO SELECTION
// ============================================================================

export function useAddProductsToSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      selectionId,
      productIds,
      action = 'select',
      selectedBy,
    }: {
      selectionId: string;
      productIds: string[];
      action?: 'select' | 'deselect';
      selectedBy: string;
    }): Promise<{ items_affected: number }> => {
      const response = await fetch('/api/core/selections/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selection_id: selectionId,
          supplier_product_ids: productIds,
          action,
          selected_by: selectedBy,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add products');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sppKeys.selection(variables.selectionId) });
      queryClient.invalidateQueries({ queryKey: sppKeys.selectionProducts(variables.selectionId) });
      queryClient.invalidateQueries({ queryKey: sppKeys.metrics() });
    },
  });
}
