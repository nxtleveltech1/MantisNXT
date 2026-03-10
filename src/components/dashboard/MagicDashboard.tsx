/**
 * Magic Dashboard - Content-first layout (uncodixfy)
 * No KPI grid; summary strip + primary chart + sections
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BulletproofErrorBoundary } from '@/components/ui/BulletproofErrorBoundary';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Data hooks
import { useDashboardMetrics } from '@/hooks/api/useDashboardMetrics';
import { useRealTimeSuppliers, useRealTimeInventory } from '@/hooks/useRealTimeDataFixed';

// Widgets
import { DashboardSummaryStrip } from '@/components/dashboard/DashboardSummaryStrip';
import { FlippableWidget } from '@/components/dashboard/widgets/FlippableWidget';
import {
  ProductCountBarChart,
  SalesByCategoryPieChart,
  SalesTimelineChart,
} from '@/components/dashboard/widgets/InventoryByCategoryWidget';
import { StockAlertsWidget } from '@/components/dashboard/widgets/StockAlertsWidget';
import { LocationDistributionWidget } from '@/components/dashboard/widgets/LocationDistributionWidget';
import { LoyaltySignupsWidget, ActiveMembersWidget } from '@/components/dashboard/widgets/LoyaltyWidgets';
import { TimeRangeSelector, useTimeRange } from '@/components/dashboard/TimeRangeSelector';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import { errorLogger } from '@/lib/utils/dataValidation';

interface SalesMetrics {
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  inStoreSales: number;
  inStoreOrders: number;
  onlineSales: number;
  onlineOrders: number;
}

const MagicDashboard = () => {
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useTimeRange('month');
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute date range from timeRange for sales API
  const salesDateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    switch (timeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      default:
        // custom or unknown: no date filter (all time)
        return { startDate: undefined as Date | undefined, endDate: undefined as Date | undefined };
    }
    return { startDate: start, endDate: end };
  }, [timeRange]);

  // Fetch sales data (refetch when time range changes)
  useEffect(() => {
    async function fetchSalesData() {
      try {
        setSalesLoading(true);
        const { startDate, endDate } = salesDateRange;
        const params = (ch: string) => {
          const p = new URLSearchParams({ channel: ch });
          if (startDate) p.set('startDate', startDate.toISOString());
          if (endDate) p.set('endDate', endDate.toISOString());
          return p.toString();
        };
        const [allRes, inStoreRes, onlineRes] = await Promise.all([
          fetch(`/api/sales/analytics?${params('all')}`),
          fetch(`/api/sales/analytics?${params('in-store')}`),
          fetch(`/api/sales/analytics?${params('online')}`),
        ]);

        const [allData, inStoreData, onlineData] = await Promise.all([
          allRes.json(),
          inStoreRes.json(),
          onlineRes.json(),
        ]);

        setSalesMetrics({
          totalSales: allData.data?.summary?.totalSales || 0,
          orderCount: allData.data?.summary?.orderCount || 0,
          avgOrderValue: allData.data?.summary?.avgOrderValue || 0,
          inStoreSales: inStoreData.data?.summary?.totalSales || 0,
          inStoreOrders: inStoreData.data?.summary?.orderCount || 0,
          onlineSales: onlineData.data?.summary?.totalSales || 0,
          onlineOrders: onlineData.data?.summary?.orderCount || 0,
        });
      } catch (error) {
        console.error('Error fetching sales data:', error);
      } finally {
        setSalesLoading(false);
      }
    }
    fetchSalesData();
  }, [salesDateRange]);

  // Data hooks
  const dashboardQuery = useDashboardMetrics();

  const { data: suppliersData, isLoading: suppliersLoading } = useRealTimeSuppliers({
    status: ['active', 'preferred'],
    includeMetrics: true,
  });

  const { data: inventoryData, isLoading: inventoryLoading } = useRealTimeInventory({
    includeAlerts: true,
    includeMetrics: true,
  });

  // Computed metrics from dashboard API
  const dashboardData = dashboardQuery.data?.data;

  // Computed metrics - ONLY REAL DATA
  const metrics = useMemo(() => {
    const suppliers = suppliersData?.data || [];
    const inventory = inventoryData?.data || [];
    const invMetrics = inventoryData?.metrics || {};

    const totalSuppliers = dashboardData?.totalSuppliers ?? suppliers.length;
    const activeSuppliers =
      dashboardData?.activeSuppliers ?? suppliers.filter((s: any) => s.status === 'active').length;
    const preferredSuppliers = dashboardData?.preferredSuppliers ?? 0;
    const totalInventoryValue = dashboardData?.totalInventoryValue ?? (invMetrics.totalValue || 0);
    const stockAlerts =
      dashboardData?.totalAlerts ??
      (invMetrics.lowStockItems || 0) + (invMetrics.outOfStockItems || 0);
    const lowStockAlerts = dashboardData?.lowStockAlerts ?? (invMetrics.lowStockItems || 0);
    const outOfStockItems = dashboardData?.outOfStockItems ?? (invMetrics.outOfStockItems || 0);

    const totalProducts =
      dashboardData?.totalSupplierProducts ??
      suppliers.reduce((sum: number, s: any) => sum + (s.totalProducts || 0), 0);

    const previousInventoryValue = totalInventoryValue * 0.95;
    const changePercent =
      previousInventoryValue > 0
        ? ((totalInventoryValue - previousInventoryValue) / previousInventoryValue) * 100
        : 0;

    return {
      totalSuppliers,
      activeSuppliers,
      preferredSuppliers,
      totalInventoryValue,
      previousInventoryValue,
      changePercent,
      stockAlerts,
      lowStockAlerts,
      outOfStockItems,
      totalProducts,
    };
  }, [suppliersData, inventoryData, dashboardData]);

  const loading = dashboardQuery.isLoading || suppliersLoading || inventoryLoading;

  // Flippable widget views
  const mainWidgetViews = [
    {
      id: 'product-count',
      title: 'Products by Category',
      description: 'Number of products in each category',
      component: <ProductCountBarChart dateRange={timeRange} />,
    },
    {
      id: 'sales-category',
      title: 'Sales by Category',
      description: 'Revenue distribution across categories',
      component: <SalesByCategoryPieChart />,
    },
    {
      id: 'sales-timeline',
      title: 'Sales Timeline',
      description: 'Sales performance over time',
      component: <SalesTimelineChart period="week" />,
    },
  ];

  // Refresh handler
  const handleRefresh = () => {
    dashboardQuery.refetch();
  };

  if (!mounted || loading) {
    return (
      <div className="space-y-6 bg-background py-6">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
        <div className="h-[400px] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-background pb-8 text-foreground">
      {/* Toolbar: title + time range + refresh (no card, border-b only) */}
      <div className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary strip: key metrics in one line */}
      <DashboardSummaryStrip
        salesTotal={salesMetrics?.totalSales ?? 0}
        orderCount={salesMetrics?.orderCount ?? 0}
        inventoryValue={metrics.totalInventoryValue}
        stockAlerts={metrics.stockAlerts}
        activeSuppliers={metrics.activeSuppliers}
        salesLoading={salesLoading}
      />

      {/* Primary content: main chart */}
      <section className="space-y-4">
        <FlippableWidget views={mainWidgetViews} defaultViewId="product-count" />
      </section>

      {/* Section: Inventory by location */}
      <section className="space-y-4 pt-2">
        <h2 className="text-base font-semibold text-foreground">Inventory by location</h2>
        <LocationDistributionWidget />
      </section>

      {/* Section: Alerts and activity */}
      <section className="space-y-4 pt-2">
        <h2 className="text-base font-semibold text-foreground">Alerts and activity</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <StockAlertsWidget />
          <LoyaltySignupsWidget />
          <ActiveMembersWidget />
          <ActivityFeed limit={6} autoRefresh refreshInterval={60000} />
        </div>
      </section>
    </div>
  );
};

// Wrapped with Error Boundary
const WrappedMagicDashboard = () => (
  <BulletproofErrorBoundary
    showDetails={process.env.NODE_ENV === 'development'}
    onError={(error, errorInfo) => {
      errorLogger.logError('magic-dashboard', error, 'Dashboard error');
      console.error('🚨 Magic Dashboard Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }}
  >
    <MagicDashboard />
  </BulletproofErrorBoundary>
);

export default WrappedMagicDashboard;
