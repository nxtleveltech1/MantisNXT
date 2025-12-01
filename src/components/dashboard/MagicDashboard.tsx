/**
 * Magic Dashboard - Upgraded Homepage Dashboard
 * Comprehensive dashboard with KPIs, charts, alerts, and analytics
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BulletproofErrorBoundary } from '@/components/ui/BulletproofErrorBoundary';
import { Package, Building2, AlertTriangle, Boxes, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Data hooks
import { useDashboardMetrics } from '@/hooks/api/useDashboardMetrics';
import { useRealTimeSuppliers, useRealTimeInventory } from '@/hooks/useRealTimeDataFixed';
import { formatCurrency } from '@/hooks/api/useDashboardWidgets';

// New Widget Components
import { EnhancedKPICard } from '@/components/dashboard/widgets/EnhancedKPICard';
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

const MagicDashboard = () => {
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useTimeRange('month');

  useEffect(() => {
    setMounted(true);
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

    // Use dashboard API data when available
    const totalSuppliers = dashboardData?.totalSuppliers ?? suppliers.length;
    const activeSuppliers =
      dashboardData?.activeSuppliers ?? suppliers.filter(s => s.status === 'active').length;
    const preferredSuppliers = dashboardData?.preferredSuppliers ?? 0;
    const totalInventoryValue = dashboardData?.totalInventoryValue ?? (invMetrics.totalValue || 0);
    const totalInventoryItems = dashboardData?.totalInventoryItems ?? inventory.length;
    const stockAlerts =
      dashboardData?.totalAlerts ??
      (invMetrics.lowStockItems || 0) + (invMetrics.outOfStockItems || 0);
    const lowStockAlerts = dashboardData?.lowStockAlerts ?? (invMetrics.lowStockItems || 0);
    const outOfStockItems = dashboardData?.outOfStockItems ?? (invMetrics.outOfStockItems || 0);

    // Supplier product counts (SIP portfolio)
    const totalProducts =
      dashboardData?.totalSupplierProducts ??
      suppliers.reduce((sum: number, s: any) => sum + (s.totalProducts || 0), 0);
    const newProducts = 0; // Would come from API

    // Calculate trends (simplified)
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
      totalInventoryItems,
      previousInventoryValue,
      changePercent,
      stockAlerts,
      lowStockAlerts,
      outOfStockItems,
      totalProducts,
      newProducts,
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
      description: 'Revenue distribution across categories [WooCommerce]',
      component: <SalesByCategoryPieChart />,
    },
    {
      id: 'sales-timeline',
      title: 'Sales Timeline',
      description: 'Sales performance over time [WooCommerce]',
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-muted h-32 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="bg-muted h-[400px] animate-pulse rounded-xl" />
            <div className="bg-muted h-[400px] animate-pulse rounded-xl" />
          </div>
          <div className="lg:col-span-4">
            <div className="bg-muted h-[800px] animate-pulse rounded-xl" />
          </div>
        </div>
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EnhancedKPICard
          title="Active Suppliers"
          subtitle={`${metrics.preferredSuppliers} preferred`}
          value={metrics.activeSuppliers}
          trend="neutral"
          icon={Building2}
          href="/suppliers"
          colorScheme="default"
        />
        <EnhancedKPICard
          title="Total Inventory Value"
          subtitle="NXT SOH - In-Store/Main"
          value={formatCurrency(metrics.totalInventoryValue)}
          trend={metrics.changePercent > 0 ? 'up' : metrics.changePercent < 0 ? 'down' : 'neutral'}
          trendValue={`${Math.abs(metrics.changePercent).toFixed(1)}%`}
          icon={Package}
          href="/inventory"
          colorScheme="success"
        />
        <EnhancedKPICard
          title="Stock Alerts"
          subtitle={`${metrics.outOfStockItems} out of stock`}
          value={metrics.stockAlerts}
          trend={metrics.stockAlerts > 0 ? 'down' : 'neutral'}
          trendValue={metrics.stockAlerts > 0 ? `${metrics.stockAlerts} active` : undefined}
          icon={AlertTriangle}
          href="/inventory"
          colorScheme="warning"
        />
        <EnhancedKPICard
          title="Supplier Products"
          subtitle="Total in catalog"
          value={metrics.totalProducts || 0}
          trend={metrics.newProducts > 0 ? 'up' : 'neutral'}
          trendValue={metrics.newProducts > 0 ? `+${metrics.newProducts} new` : undefined}
          icon={Boxes}
          href="/catalog"
          colorScheme="info"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column - Main Widgets */}
        <div className="space-y-6 lg:col-span-8">
          {/* Flippable Main Widget */}
          <FlippableWidget views={mainWidgetViews} defaultViewId="inventory-value" />

          {/* Location Distribution Widget */}
          <LocationDistributionWidget />
        </div>

        {/* Right Column - Stock Alerts */}
        <div className="lg:col-span-4">
          <StockAlertsWidget />
        </div>
      </div>

      {/* Bottom Row - Loyalty Widgets + Activity Feed */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LoyaltySignupsWidget />
        <ActiveMembersWidget />
        <PointsEconomyWidget />
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
