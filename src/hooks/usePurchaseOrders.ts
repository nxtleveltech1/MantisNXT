import { useState, useEffect, useCallback } from 'react';

// Simple interface that matches our actual database schema
interface DatabasePurchaseOrder {
  id: string;
  supplier_id: string;
  po_number: string;
  status:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'sent'
    | 'acknowledged'
    | 'in_progress'
    | 'shipped'
    | 'received'
    | 'completed'
    | 'cancelled';
  order_date: string;
  required_date?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined supplier information
  supplier_name?: string;
  supplier_code?: string;
  supplier_status?: string;
}

interface PurchaseOrderSearchFilters {
  search?: string;
  status?: string[];
  supplier_id?: string[];
  min_amount?: number;
  max_amount?: number;
  page?: number;
  limit?: number;
}

interface PurchaseOrderMetrics {
  totalOrders: number;
  totalValue: number;
  pendingApprovals: number;
  inProgress: number;
  completedThisMonth: number;
  overdueOrders: number;
  statusBreakdown: { [key: string]: number };
  departmentBreakdown: { [key: string]: number };
  monthlyTrend: Array<{
    month: string;
    orders: number;
    value: number;
  }>;
}

interface UsePurchaseOrdersOptions {
  filters?: PurchaseOrderSearchFilters;
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
  metrics?: PurchaseOrderMetrics;
}

export function usePurchaseOrders(options: UsePurchaseOrdersOptions = {}) {
  const { filters, autoFetch = true } = options;

  const [orders, setOrders] = useState<DatabasePurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<unknown>(null);

  const fetchPurchaseOrders = useCallback(
    async (searchFilters?: PurchaseOrderSearchFilters) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        const filtersToUse = searchFilters || filters;

        if (filtersToUse?.search) params.append('search', filtersToUse.search);
        if (filtersToUse?.status?.length) params.append('status', filtersToUse.status.join(','));
        if (filtersToUse?.supplier_id?.length)
          params.append('supplier_id', filtersToUse.supplier_id.join(','));
        if (filtersToUse?.min_amount !== undefined)
          params.append('min_amount', filtersToUse.min_amount.toString());
        if (filtersToUse?.max_amount !== undefined)
          params.append('max_amount', filtersToUse.max_amount.toString());
        if (filtersToUse?.page !== undefined) params.append('page', filtersToUse.page.toString());
        if (filtersToUse?.limit !== undefined)
          params.append('limit', filtersToUse.limit.toString());

        const url = `/api/purchase-orders?${params.toString()}`;
        console.log('Fetching purchase orders from URL:', url);

        const response = await fetch(url);
        console.log('Purchase orders response status:', response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: APIResponse<DatabasePurchaseOrder[]> = await response.json();
        console.log('Purchase Orders API Response:', result);
        console.log('Purchase Orders API success:', result.success);
        console.log('Purchase Orders API data length:', result.data?.length);
        console.log('First purchase order:', result.data?.[0]);

        if (result.success) {
          console.log('Setting purchase orders state with:', result.data);
          setOrders(result.data);
          if (result.pagination) {
            setPagination(result.pagination);
          }
        } else {
          throw new Error(result.error || 'Failed to fetch purchase orders');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch purchase orders';
        setError(errorMessage);
        console.error('Error fetching purchase orders:', err);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const createPurchaseOrder = useCallback(async (orderData: unknown) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<DatabasePurchaseOrder> = await response.json();

      if (result.success) {
        setOrders(prev => [result.data, ...prev]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create purchase order');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create purchase order';
      setError(errorMessage);
      console.error('Error creating purchase order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePurchaseOrder = useCallback(async (id: string, orderData: Partial<unknown>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<DatabasePurchaseOrder> = await response.json();

      if (result.success) {
        setOrders(prev => prev.map(order => (order.id === id ? result.data : order)));
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update purchase order');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update purchase order';
      setError(errorMessage);
      console.error('Error updating purchase order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePurchaseOrders = useCallback(async (ids: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<void> = await response.json();

      if (result.success) {
        setOrders(prev => prev.filter(order => !ids.includes(order.id)));
      } else {
        throw new Error(result.error || 'Failed to delete purchase orders');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete purchase orders';
      setError(errorMessage);
      console.error('Error deleting purchase orders:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchPurchaseOrders();
    }
  }, [fetchPurchaseOrders, autoFetch]);

  return {
    orders,
    loading,
    error,
    pagination,
    fetchPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrders,
    refresh: () => fetchPurchaseOrders(),
  };
}

// Hook for purchase order metrics
export function usePurchaseOrderMetrics() {
  const [metrics, setMetrics] = useState<PurchaseOrderMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/purchase-orders/analytics');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<PurchaseOrderMetrics> = await response.json();

      if (result.success) {
        setMetrics(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch purchase order metrics');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch purchase order metrics';
      setError(errorMessage);
      console.error('Error fetching purchase order metrics:', err);
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

// Hook for individual purchase order
export function usePurchaseOrder(id: string | null) {
  const [order, setOrder] = useState<DatabasePurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/purchase-orders/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<DatabasePurchaseOrder> = await response.json();

      if (result.success) {
        setOrder(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch purchase order');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch purchase order';
      setError(errorMessage);
      console.error('Error fetching purchase order:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return {
    order,
    loading,
    error,
    refresh: fetchOrder,
  };
}
