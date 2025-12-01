/**
 * Dashboard Widget Data Hooks
 * React Query hooks for fetching dashboard widget data
 */

import { useQuery } from '@tanstack/react-query';

// Types
export interface CategoryData {
  categoryId: string;
  categoryName: string;
  parentCategoryId: string | null;
  productCount: number;
  totalQuantity: number;
  totalValue: number;
  avgPrice: number;
  percentage: number;
}

export interface LocationData {
  locationId: string;
  locationName: string;
  locationType: string;
  storageType: string | null;
  productCount: number;
  totalQuantity: number;
  totalValue: number;
  avgQuantityPerProduct: number;
  outOfStockCount: number;
  lowStockCount: number;
  valuePercentage: number;
}

export interface DistributionData {
  type: string;
  productCount: number;
  totalValue: number;
}

export interface StockAlert {
  severity: 'critical' | 'warning' | 'info';
  productId: string | null;
  productName: string;
  sku: string | null;
  quantity: number | null;
  reorderPoint: number | null;
  locationName: string;
  locationType: string;
  supplierName: string;
  unitPrice: number;
  message: string;
}

export interface AlertSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

// Hooks
export function useInventoryByCategory(dateRange: string = 'month') {
  return useQuery({
    queryKey: ['dashboard', 'inventory-by-category', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/inventory-by-category?range=${dateRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory by category');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLocationAnalytics() {
  return useQuery({
    queryKey: ['dashboard', 'location-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/location-analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch location analytics');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ['dashboard', 'stock-alerts'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stock-alerts');
      if (!response.ok) {
        throw new Error('Failed to fetch stock alerts');
      }
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute (more frequent for alerts)
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });
}

// Helper to format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Helper to format percentage
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
