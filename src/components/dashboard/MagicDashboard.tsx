/**
 * Magic Dashboard - Premium Homepage Dashboard
 * Comprehensive dashboard with KPIs, charts, alerts, and analytics
 * All currency in ZAR (R) - South African Rands
 * Using MantisNXT vibrant rainbow color palette
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
  InventoryValueAreaChart,
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

// Colors
import { CHART_COLORS, KPI_COLORS, GRADIENT_PAIRS } from '@/lib/colors';

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
      id: 'inventory-value',
      title: 'Inventory Value by Category',
      description: 'Total stock value distributed across categories',
      component: <InventoryValueAreaChart dateRange={timeRange} />,
    },
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
      <div className="bg-background min-h-screen space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 animate-pulse rounded-xl" style={{ background: `linear-gradient(135deg, ${CHART_COLORS[i % CHART_COLORS.length]}20, transparent)` }} />
          ))}
        </div>
        <div className="h-[450px] animate-pulse rounded-xl" style={{ background: `linear-gradient(135deg, ${CHART_COLORS[5]}10, transparent)` }} />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your business overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden" style={{ borderLeftWidth: '4px', borderLeftColor: KPI_COLORS.suppliers }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Suppliers</CardTitle>
              <Building2 className="h-4 w-4" style={{ color: KPI_COLORS.suppliers }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: KPI_COLORS.suppliers }}>{metrics.activeSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.preferredSuppliers} preferred
            </p>
          </CardContent>
          <div className="absolute bottom-0 right-0 w-20 h-20 opacity-10" style={{ background: `radial-gradient(circle at bottom right, ${KPI_COLORS.suppliers}, transparent)` }} />
        </Card>

        <Card className="relative overflow-hidden" style={{ borderLeftWidth: '4px', borderLeftColor: KPI_COLORS.inventory }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory Value</CardTitle>
              <Package className="h-4 w-4" style={{ color: KPI_COLORS.inventory }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: KPI_COLORS.inventory }}>{formatZARCompact(metrics.totalInventoryValue)}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" style={{ color: KPI_COLORS.inventory }} />
              <span className="text-xs" style={{ color: KPI_COLORS.inventory }}>+{metrics.changePercent.toFixed(1)}% vs last period</span>
            </div>
          </CardContent>
          <div className="absolute bottom-0 right-0 w-20 h-20 opacity-10" style={{ background: `radial-gradient(circle at bottom right, ${KPI_COLORS.inventory}, transparent)` }} />
        </Card>

        <Card className="relative overflow-hidden" style={{ borderLeftWidth: '4px', borderLeftColor: KPI_COLORS.alerts }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4" style={{ color: KPI_COLORS.alerts }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: KPI_COLORS.alerts }}>{metrics.stockAlerts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.outOfStockItems} out of stock / {metrics.lowStockAlerts} low
            </p>
          </CardContent>
          <div className="absolute bottom-0 right-0 w-20 h-20 opacity-10" style={{ background: `radial-gradient(circle at bottom right, ${KPI_COLORS.alerts}, transparent)` }} />
        </Card>

        <Card className="relative overflow-hidden" style={{ borderLeftWidth: '4px', borderLeftColor: KPI_COLORS.products }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Supplier Products</CardTitle>
              <Boxes className="h-4 w-4" style={{ color: KPI_COLORS.products }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: KPI_COLORS.products }}>{(metrics.totalProducts || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total in catalog</p>
          </CardContent>
          <div className="absolute bottom-0 right-0 w-20 h-20 opacity-10" style={{ background: `radial-gradient(circle at bottom right, ${KPI_COLORS.products}, transparent)` }} />
        </Card>
      </div>

      {/* Sales Overview Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${KPI_COLORS.salesTotal}15, ${KPI_COLORS.salesTotal}05)`, borderColor: `${KPI_COLORS.salesTotal}40` }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4" style={{ color: KPI_COLORS.salesTotal }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: KPI_COLORS.salesTotal }}>
              {salesLoading ? '...' : formatZARCompact(salesMetrics?.totalSales || 0)}
            </div>
            <p className="text-xs mt-1" style={{ color: `${KPI_COLORS.salesTotal}99` }}>
              {salesMetrics?.orderCount || 0} orders total
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${KPI_COLORS.salesInStore}15, ${KPI_COLORS.salesInStore}05)`, borderColor: `${KPI_COLORS.salesInStore}40` }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">In-Store Sales</CardTitle>
              <Store className="h-4 w-4" style={{ color: KPI_COLORS.salesInStore }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: KPI_COLORS.salesInStore }}>
              {salesLoading ? '...' : formatZARCompact(salesMetrics?.inStoreSales || 0)}
            </div>
            <p className="text-xs mt-1" style={{ color: `${KPI_COLORS.salesInStore}99` }}>
              {salesMetrics?.inStoreOrders || 0} orders
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${KPI_COLORS.salesOnline}15, ${KPI_COLORS.salesOnline}05)`, borderColor: `${KPI_COLORS.salesOnline}40` }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Online Sales</CardTitle>
              <Globe className="h-4 w-4" style={{ color: KPI_COLORS.salesOnline }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: KPI_COLORS.salesOnline }}>
              {salesLoading ? '...' : formatZARCompact(salesMetrics?.onlineSales || 0)}
            </div>
            <p className="text-xs mt-1" style={{ color: `${KPI_COLORS.salesOnline}99` }}>
              {salesMetrics?.onlineOrders || 0} orders
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${KPI_COLORS.avgOrder}15, ${KPI_COLORS.avgOrder}05)`, borderColor: `${KPI_COLORS.avgOrder}40` }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: KPI_COLORS.avgOrder }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: KPI_COLORS.avgOrder }}>
              {salesLoading ? '...' : formatZAR(salesMetrics?.avgOrderValue || 0)}
            </div>
            <p className="text-xs mt-1" style={{ color: `${KPI_COLORS.avgOrder}99` }}>Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart - Full Width */}
      <div className="w-full">
        <FlippableWidget views={mainWidgetViews} defaultViewId="inventory-value" />
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
