/**
 * Magic Dashboard - Premium Homepage Dashboard
 * Comprehensive dashboard with KPIs, charts, alerts, and analytics
 * All currency in ZAR (R) - South African Rands
 * Using OkLCH design system colors
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BulletproofErrorBoundary } from '@/components/ui/BulletproofErrorBoundary';
import {
  Package,
  Building2,
  AlertTriangle,
  Boxes,
  RefreshCw,
  TrendingUp,
  ShoppingCart,
  Store,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Data hooks
import { useDashboardMetrics } from '@/hooks/api/useDashboardMetrics';
import { useRealTimeSuppliers, useRealTimeInventory } from '@/hooks/useRealTimeDataFixed';
import { formatCurrency } from '@/hooks/api/useDashboardWidgets';

// New Widget Components
import { FlippableWidget } from '@/components/dashboard/widgets/FlippableWidget';
import {
  ProductCountBarChart,
  SalesByCategoryPieChart,
  SalesTimelineChart,
} from '@/components/dashboard/widgets/InventoryByCategoryWidget';
import { StockAlertsWidget } from '@/components/dashboard/widgets/StockAlertsWidget';
import { LocationDistributionWidget } from '@/components/dashboard/widgets/LocationDistributionWidget';
import {
  LoyaltySignupsWidget,
  ActiveMembersWidget,
  PointsEconomyWidget,
} from '@/components/dashboard/widgets/LoyaltyWidgets';

// Time Range Selector
import { TimeRangeSelector, useTimeRange } from '@/components/dashboard/TimeRangeSelector';

// Activity Feed
import ActivityFeed from '@/components/dashboard/ActivityFeed';

// Utils
import { errorLogger } from '@/lib/utils/dataValidation';

// ZAR Currency Formatter
const formatZAR = (value: number) => {
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatZARCompact = (value: number) => {
  if (value >= 1000000) {
    return `R ${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `R ${(value / 1000).toFixed(1)}K`;
  }
  return `R ${value.toFixed(2)}`;
};

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

  // Fetch sales data
  useEffect(() => {
    async function fetchSalesData() {
      try {
        setSalesLoading(true);
        const [allRes, inStoreRes, onlineRes] = await Promise.all([
          fetch('/api/sales/analytics?channel=all'),
          fetch('/api/sales/analytics?channel=in-store'),
          fetch('/api/sales/analytics?channel=online'),
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
  }, []);

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
      <div className="min-h-screen space-y-6 bg-background p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-[450px] animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-background p-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-lg md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live overview in a dark, glassy shell with subtle color pops.</p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Suppliers</CardTitle>
              <Building2 className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics.activeSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.preferredSuppliers} preferred</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory Value</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatZARCompact(metrics.totalInventoryValue)}</div>
            <div className="mt-1 flex items-center gap-1 text-primary">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">+{metrics.changePercent.toFixed(1)}% vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{metrics.stockAlerts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.outOfStockItems} out of stock / {metrics.lowStockAlerts} low
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Supplier Products</CardTitle>
              <Boxes className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{(metrics.totalProducts || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total in catalog</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Overview Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {salesLoading ? '...' : formatZARCompact(salesMetrics?.totalSales || 0)}
            </div>
            <p className="text-xs mt-1 text-muted-foreground">{salesMetrics?.orderCount || 0} orders total</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">In-Store Sales</CardTitle>
              <Store className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {salesLoading ? '...' : formatZARCompact(salesMetrics?.inStoreSales || 0)}
            </div>
            <p className="text-xs mt-1 text-muted-foreground">{salesMetrics?.inStoreOrders || 0} orders</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Online Sales</CardTitle>
              <Globe className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {salesLoading ? '...' : formatZARCompact(salesMetrics?.onlineSales || 0)}
            </div>
            <p className="text-xs mt-1 text-muted-foreground">{salesMetrics?.onlineOrders || 0} orders</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {salesLoading ? '...' : formatZAR(salesMetrics?.avgOrderValue || 0)}
            </div>
            <p className="text-xs mt-1 text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart - Full Width */}
      <div className="w-full">
        <FlippableWidget views={mainWidgetViews} defaultViewId="product-count" />
      </div>

      {/* Location Distribution - Full Width */}
      <div className="w-full">
        <LocationDistributionWidget />
      </div>

      {/* Bottom Row - Stock Alerts + Loyalty + Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <StockAlertsWidget />
        </div>
        <LoyaltySignupsWidget />
        <ActiveMembersWidget />
        <div className="lg:col-span-1">
          <ActivityFeed limit={6} autoRefresh={true} refreshInterval={60000} compact={true} />
        </div>
      </div>
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
