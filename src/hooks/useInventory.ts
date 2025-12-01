import { useState, useEffect, useCallback } from 'react';
import type { InventorySearchFilters, InventoryMetrics } from '@/types/inventory';

// Simple interface that matches our actual API response
interface DatabaseInventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  maxStock: number;
  minStock: number;
  locations: unknown[];
  primaryLocationId: string;
  batchTracking: boolean;
  lots: unknown[];
  supplierId: string;
  supplierName: string;
  supplierSku: string;
  unitCost: number;
  unitPrice: number;
  currency: string;
  unit: string;
  weight?: number;
  dimensions?: unknown;
  status: string;
  alerts: unknown[];
  lastStockUpdate: Date;
  lastOrderDate?: Date | null;
  nextDeliveryDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
  notes: string;
}

interface UseInventoryOptions {
  filters?: InventorySearchFilters;
  autoFetch?: boolean;
}

interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metrics?: InventoryMetrics;
}

export function useInventory(options: UseInventoryOptions = {}) {
  const { filters, autoFetch = true } = options;

  const [items, setItems] = useState<DatabaseInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);

  const fetchInventory = useCallback(
    async (searchFilters?: InventorySearchFilters) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        const filtersToUse = searchFilters || filters;

        if (filtersToUse?.query) params.append('query', filtersToUse.query);
        if (filtersToUse?.category?.length)
          params.append('category', filtersToUse.category.join(','));
        if (filtersToUse?.status?.length) params.append('status', filtersToUse.status.join(','));
        if (filtersToUse?.warehouse?.length)
          params.append('warehouse', filtersToUse.warehouse.join(','));
        if (filtersToUse?.supplier?.length)
          params.append('supplier', filtersToUse.supplier.join(','));
        if (filtersToUse?.lowStock !== undefined)
          params.append('lowStock', filtersToUse.lowStock.toString());
        if (filtersToUse?.outOfStock !== undefined)
          params.append('outOfStock', filtersToUse.outOfStock.toString());
        if (filtersToUse?.tags?.length) params.append('tags', filtersToUse.tags.join(','));

        const url = `/api/inventory?${params.toString()}`;
        console.log('Fetching inventory from URL:', url);

        const response = await fetch(url);
        console.log('Inventory response status:', response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: APIResponse<DatabaseInventoryItem[]> = await response.json();
        console.log('Inventory API Response:', result);
        console.log('Inventory API success:', result.success);
        console.log('Inventory API data length:', result.data?.length);
        console.log('First inventory item:', result.data?.[0]);

        if (result.success) {
          console.log('Setting inventory state with:', result.data);
          setItems(result.data);
          if (result.metrics) {
            setMetrics(result.metrics);
          }
        } else {
          throw new Error(result.error || 'Failed to fetch inventory');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch inventory';
        setError(errorMessage);
        console.error('Error fetching inventory:', err);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const createItem = useCallback(async (itemData: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<DatabaseInventoryItem> = await response.json();

      if (result.success) {
        setItems(prev => [result.data, ...prev]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create inventory item');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create inventory item';
      setError(errorMessage);
      console.error('Error creating inventory item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateItem = useCallback(async (id: string, itemData: Partial<unknown>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<DatabaseInventoryItem> = await response.json();

      if (result.success) {
        setItems(prev => prev.map(item => (item.id === id ? result.data : item)));
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update inventory item');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update inventory item';
      setError(errorMessage);
      console.error('Error updating inventory item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/inventory`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [id] }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<void> = await response.json();

      if (result.success) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        throw new Error(result.error || 'Failed to delete inventory item');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete inventory item';
      setError(errorMessage);
      console.error('Error deleting inventory item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchInventory();
    }
  }, [fetchInventory, autoFetch]);

  return {
    items,
    loading,
    error,
    metrics,
    fetchInventory,
    createItem,
    updateItem,
    deleteItem,
    refresh: () => fetchInventory(),
  };
}

// Hook for inventory metrics
export function useInventoryMetrics() {
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/inventory/analytics');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<InventoryMetrics> = await response.json();

      if (result.success) {
        setMetrics(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch inventory metrics');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch inventory metrics';
      setError(errorMessage);
      console.error('Error fetching inventory metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
}

// Hook for individual inventory item
export function useInventoryItem(id: string | null) {
  const [item, setItem] = useState<DatabaseInventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/inventory/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<DatabaseInventoryItem> = await response.json();

      if (result.success) {
        setItem(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch inventory item');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch inventory item';
      setError(errorMessage);
      console.error('Error fetching inventory item:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  return {
    item,
    loading,
    error,
    refresh: fetchItem,
  };
}
