/**
 * Neon SPP Store - State management for Supplier Portfolio System
 *
 * Manages:
 * - Active inventory selections
 * - Pricelist uploads
 * - Dashboard metrics
 * - Upload and merge operations
 */

import { create } from 'zustand';
import type {
  InventorySelection,
  PricelistUpload,
  DashboardMetrics,
  MergeResult,
  PricelistUploadRequest,
} from '@/types/nxt-spp';

interface NeonSppState {
  // State
  activeSelection: InventorySelection | null;
  uploads: PricelistUpload[];
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchActiveSelection: () => Promise<void>;
  fetchUploads: (filters?: { limit?: number; status?: string }) => Promise<void>;
  fetchMetrics: () => Promise<void>;
  uploadPricelist: (request: PricelistUploadRequest) => Promise<string>;
  validateUpload: (uploadId: string) => Promise<void>;
  mergeUpload: (uploadId: string) => Promise<MergeResult>;
  activateSelection: (selectionId: string, deactivateOthers?: boolean) => Promise<void>;
  reset: () => void;
}

export const useNeonSppStore = create<NeonSppState>((set, get) => ({
  // Initial state
  activeSelection: null,
  uploads: [],
  metrics: null,
  loading: false,
  error: null,

  // Fetch active selection
  fetchActiveSelection: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/core/selections/active');
      if (!response.ok) {
        if (response.status === 404) {
          set({ activeSelection: null, loading: false });
          return;
        }
        throw new Error('Failed to fetch active selection');
      }
      const data = await response.json();
      set({ activeSelection: data.data, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Fetch uploads with filters
  fetchUploads: async (filters) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.status) params.append('status', filters.status);

      const response = await fetch(`/api/spp/upload?${params}`);
      if (!response.ok) throw new Error('Failed to fetch uploads');

      const data = await response.json();
      const uploads = data?.data?.uploads || data?.data || [];
      set({ uploads, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Fetch dashboard metrics
  fetchMetrics: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/spp/dashboard/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      set({
        metrics: data.data || {
          total_suppliers: 0,
          total_products: 0,
          selected_products: 0,
          selected_inventory_value: 0,
          new_products_count: 0,
          recent_price_changes_count: 0,
        },
        loading: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Upload pricelist
  uploadPricelist: async (request: PricelistUploadRequest) => {
    set({ loading: true, error: null });
    try {
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      const uploadId = data.data.upload_id;

      // Refresh uploads list
      await get().fetchUploads({ limit: 20 });
      set({ loading: false });

      return uploadId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Validate upload
  validateUpload: async (uploadId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/spp/upload/${uploadId}/validate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Validation failed');

      await get().fetchUploads({ limit: 20 });
      set({ loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Merge upload
  mergeUpload: async (uploadId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/spp/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: uploadId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Merge failed');
      }

      const data = await response.json();
      const result: MergeResult = data.data;

      // Refresh data
      await Promise.all([
        get().fetchUploads({ limit: 20 }),
        get().fetchMetrics(),
      ]);

      set({ loading: false });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Merge failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Activate selection
  activateSelection: async (selectionId: string, deactivateOthers = true) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/core/selections/${selectionId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivate_others: deactivateOthers }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Activation failed');
      }

      const data = await response.json();
      set({ activeSelection: data.data, loading: false });

      // Refresh metrics
      await get().fetchMetrics();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Activation failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Reset state
  reset: () => {
    set({
      activeSelection: null,
      uploads: [],
      metrics: null,
      loading: false,
      error: null,
    });
  },
}));
