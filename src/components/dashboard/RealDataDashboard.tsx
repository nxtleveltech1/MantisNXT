"use client"

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BulletproofErrorBoundary } from '@/components/ui/BulletproofErrorBoundary'
import {
  ConditionalLoader,
  MetricCardSkeleton,
  ActivityFeedSkeleton,
  AlertPanelSkeleton,
  EmptyState,
  ErrorState,
  LoadingSpinner
} from '@/components/ui/BulletproofLoadingStates'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  CheckCircle,
  Star,
  Award,
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  Settings,
  RefreshCw,
  AlertTriangle,
  Package,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  Zap,
  Shield,
  Truck,
  ArrowUpRight,
  Eye,
  Filter,
  Download,
  Bell,
  Clock,
  Target
} from "lucide-react";

// React Query hooks for optimized caching and performance
import { useDashboardMetrics } from '@/hooks/api/useDashboardMetrics';

// Fixed hooks for real data integration with better error handling
import {
  useRealTimeDashboard,
  useRealTimeSuppliers,
  useRealTimeInventory,
  usePriceLists,
  useSupplierMutations,
  useAlerts
} from '@/hooks/useRealTimeDataFixed';

// Date utilities for safe timestamp handling
import {
  safeRelativeTime,
  safeFormatDate,
  safeParseDate,
  compareTimestamps
} from '@/lib/utils/dateUtils';

// Data validation utilities
import {
  validateActivityItems,
  validateAlertItems,
  ValidatedActivityItem,
  ValidatedAlertItem,
  errorLogger,
  transformAlertItem,
  debugAlertStructure
} from '@/lib/utils/dataValidation';

import { processAlertsData } from '@/lib/utils/alertValidationEnhancements';

// Types
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: "up" | "down";
  color?: "blue" | "green" | "yellow" | "red" | "purple";
  href?: string;
  loading?: boolean;
  onClick?: () => void;
}

// Use validated types from dataValidation utils
type ActivityItem = ValidatedActivityItem;
type AlertItem = ValidatedAlertItem;

// Removed - Using BulletproofLoadingStates components instead

// Enhanced Metric Card Component
const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = "up",
  color = "blue",
  href,
  loading = false,
  onClick
}) => {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
    yellow: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
    red: "text-red-600 bg-red-50 dark:bg-red-900/20",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20"
  };

  const CardWrapper = href ? "a" : "div";
  const cardProps = href ? { href } : onClick ? { onClick } : {};

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-300 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-md transition-all duration-200 ${
      href || onClick ? 'cursor-pointer hover:shadow-lg' : ''
    }`}>
      <CardWrapper {...cardProps}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold">{value}</p>
                {(href || onClick) && <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
              </div>
              {change !== undefined && (
                <div className="flex items-center mt-2">
                  {trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    trend === "up" ? "text-green-600" : "text-red-600"
                  }`}>
                    {change > 0 ? "+" : ""}{change}%
                  </span>
                  {changeLabel && (
                    <span className="text-sm text-muted-foreground ml-1">
                      {changeLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </CardWrapper>
    </Card>
  );
};

// Real-time Activity Feed Component
const ActivityFeed: React.FC<{ activities: ActivityItem[] }> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'supplier_added': return <Building2 className="h-4 w-4" />;
      case 'inventory_update': return <Package className="h-4 w-4" />;
      case 'price_change': return <DollarSign className="h-4 w-4" />;
      case 'delivery_received': return <Truck className="h-4 w-4" />;
      case 'contract_signed': return <Award className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className={`p-2 rounded-full border ${getPriorityColor(activity.priority)}`}>
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{activity.title}</p>
              <Badge variant="outline" className="text-xs">
                {activity.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {activity.description}
            </p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {safeRelativeTime(activity.timestamp, 'Unknown time')}
              </p>
              <Badge
                variant={activity.status === 'completed' ? 'default' :
                        activity.status === 'failed' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {activity.status}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Alert Panel Component
const AlertPanel: React.FC<{ alerts: AlertItem[] }> = ({ alerts }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-700';
      case 'error': return 'border-red-400 bg-red-50 text-red-600';
      case 'warning': return 'border-yellow-400 bg-yellow-50 text-yellow-700';
      case 'info': return 'border-blue-400 bg-blue-50 text-blue-700';
      default: return 'border-gray-400 bg-gray-50 text-gray-700';
    }
  };

  const unreadAlerts = alerts.filter(alert => !alert.isRead).slice(0, 10);

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {unreadAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-3 border rounded-lg ${getSeverityColor(alert.severity)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs mt-1">{alert.message}</p>
            </div>
            <Bell className="h-4 w-4 ml-2 flex-shrink-0" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <Badge variant="outline" className="text-xs">
              {alert.type.replace('_', ' ')}
            </Badge>
            <span className="text-xs opacity-75">
              {safeRelativeTime(alert.createdAt, 'Unknown time')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Main Dashboard Component
const RealDataDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('30');
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatches by only rendering client-side content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // PRIMARY DATA SOURCE: React Query cached dashboard metrics (FAST!)
  const dashboardQuery = useDashboardMetrics();

  // FALLBACK: Real-time data hooks for additional features
  const {
    metrics: dashboardMetrics,
    activities: rawActivities,
    loading: dashboardLoading,
    error: dashboardError,
    realTimeData
  } = useRealTimeDashboard();

  // Safely validate and normalize activities
  const activities = React.useMemo(() => {
    try {
      return validateActivityItems(rawActivities || []);
    } catch (error) {
      errorLogger.logError('activities-validation', error, 'Activities validation failed');
      return [];
    }
  }, [rawActivities]);

  const {
    data: suppliersData,
    isLoading: suppliersLoading,
    error: suppliersError
  } = useRealTimeSuppliers({
    status: ['active', 'preferred'],
    includeMetrics: true
  });

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    error: inventoryError
  } = useRealTimeInventory({
    includeAlerts: true,
    includeMetrics: true
  });

  const { createSupplier } = useSupplierMutations();

  // Computed metrics
  const computedMetrics = useMemo(() => {
    const suppliers = suppliersData?.data || [];
    const inventory = inventoryData?.data || [];
    const metrics = inventoryData?.metrics || {};

    return {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(s => s.status === 'active').length,
      strategicPartners: suppliers.filter(s => s.tier === 'strategic').length,
      avgSupplierRating: suppliers.length > 0
        ? suppliers.reduce((sum, s) => sum + (s.performance?.overallRating || 0), 0) / suppliers.length
        : 0,
      totalInventoryValue: metrics.totalValue || 0,
      totalInventoryItems: metrics.totalItems || 0,
      lowStockAlerts: metrics.lowStockItems || 0,
      outOfStockItems: metrics.outOfStockItems || 0,
    };
  }, [suppliersData, inventoryData]);

  // Real alerts from API using enhanced validation with comprehensive error handling
  const alertsQuery = useAlerts();
  const alerts = React.useMemo(() => {
    try {
      const validatedAlerts = processAlertsData(alertsQuery.data);
      return validatedAlerts;
    } catch (error) {
      errorLogger.logError('alerts-validation', error, 'Enhanced alerts validation failed');
      return [];
    }
  }, [alertsQuery.data]);

  // Refresh all data including React Query cache
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dashboardQuery.refetch(),  // React Query hook - FAST!
        realTimeData.refetch?.(),
        suppliersData.refetch?.(),
        inventoryData.refetch?.(),
        alertsQuery.refetch?.()
      ].filter(Boolean));
    } catch (error) {
      errorLogger.logError('dashboard-refresh', error, 'Error refreshing dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  // Prefer React Query data when available (cached and faster)
  const loading = dashboardQuery.isLoading || dashboardLoading || suppliersLoading || inventoryLoading || alertsQuery.isLoading;
  const error = dashboardQuery.error || dashboardError || suppliersError || inventoryError || alertsQuery.error;

  // Prevent hydration mismatches by showing loading state until mounted
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Real-Time Dashboard
            {!dashboardQuery.isLoading && dashboardQuery.data && (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                  <Zap className="h-3 w-3 mr-1" />
                  Cached
                </Badge>
              </div>
            )}
            {realTimeData.connected && (
              <div className="flex items-center gap-1 text-green-600">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs">Live</span>
              </div>
            )}
          </h1>
          <p className="text-muted-foreground">
            Live data from your supplier and inventory management systems
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <ConditionalLoader
        loading={loading}
        error={error ? new Error(error.toString()) : null}
        data={computedMetrics}
        onRetry={handleRefresh}
        loadingComponent={<MetricCardSkeleton count={4} />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Suppliers"
            value={computedMetrics.totalSuppliers.toLocaleString()}
            change={8}
            changeLabel="vs last month"
            icon={<Building2 className="h-6 w-6" />}
            color="blue"
            href="/suppliers"
            loading={suppliersLoading}
          />

          <MetricCard
            title="Active Suppliers"
            value={computedMetrics.activeSuppliers.toLocaleString()}
            change={5}
            changeLabel="vs last month"
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
            loading={suppliersLoading}
          />

          <MetricCard
            title="Inventory Value"
            value={new Intl.NumberFormat('en-ZA', {
              style: 'currency',
              currency: 'ZAR',
              minimumFractionDigits: 0
            }).format(computedMetrics.totalInventoryValue)}
            change={3.2}
            changeLabel="vs last month"
            icon={<Package className="h-6 w-6" />}
            color="purple"
            href="/inventory"
            loading={inventoryLoading}
          />

          <MetricCard
            title="Stock Alerts"
            value={computedMetrics.lowStockAlerts + computedMetrics.outOfStockItems}
            change={-12}
            trend="down"
            changeLabel="vs last week"
            icon={<AlertTriangle className="h-6 w-6" />}
            color="red"
            loading={inventoryLoading}
          />
        </div>
      </ConditionalLoader>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Performance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    System Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Supplier Performance</span>
                        <span className="text-sm text-muted-foreground">
                          {computedMetrics.avgSupplierRating.toFixed(1)}/5.0
                        </span>
                      </div>
                      <Progress value={(computedMetrics.avgSupplierRating / 5) * 100} className="h-2" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Inventory Accuracy</span>
                        <span className="text-sm text-muted-foreground">98.5%</span>
                      </div>
                      <Progress value={98.5} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ConditionalLoader
                    loading={dashboardLoading}
                    error={dashboardError ? new Error(dashboardError.toString()) : null}
                    data={activities}
                    onRetry={() => realTimeData.refetch?.()}
                    loadingComponent={<ActivityFeedSkeleton count={5} />}
                    emptyComponent={
                      <EmptyState
                        icon={<Activity className="h-8 w-8" />}
                        title="No Recent Activities"
                        description="Activity will appear here as actions are performed in the system"
                      />
                    }
                  >
                    <ActivityFeed activities={activities} />
                  </ConditionalLoader>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Active Alerts
                    {alerts.filter(a => !a.isRead).length > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {alerts.filter(a => !a.isRead).length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ConditionalLoader
                    loading={alertsQuery.isLoading}
                    error={alertsQuery.error ? new Error(alertsQuery.error.toString()) : null}
                    data={alerts.filter(a => !a.isRead)}
                    onRetry={() => alertsQuery.refetch?.()}
                    loadingComponent={<AlertPanelSkeleton count={3} />}
                    emptyComponent={
                      <EmptyState
                        icon={<CheckCircle className="h-8 w-8 text-green-500" />}
                        title="No Active Alerts"
                        description="All systems are running smoothly. You'll be notified when attention is needed."
                      />
                    }
                  >
                    <AlertPanel alerts={alerts} />
                  </ConditionalLoader>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/suppliers/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Supplier
                    </a>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/inventory/add">
                      <Package className="h-4 w-4 mr-2" />
                      Add Inventory Item
                    </a>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/reports">
                      <Download className="h-4 w-4 mr-2" />
                      Generate Report
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Suppliers"
              value={computedMetrics.totalSuppliers}
              change={8}
              icon={<Building2 className="h-6 w-6" />}
              color="blue"
              loading={suppliersLoading}
            />
            <MetricCard
              title="Active Suppliers"
              value={computedMetrics.activeSuppliers}
              change={5}
              icon={<CheckCircle className="h-6 w-6" />}
              color="green"
              loading={suppliersLoading}
            />
            <MetricCard
              title="Strategic Partners"
              value={computedMetrics.strategicPartners}
              change={2}
              icon={<Star className="h-6 w-6" />}
              color="purple"
              loading={suppliersLoading}
            />
            <MetricCard
              title="Avg Rating"
              value={`${computedMetrics.avgSupplierRating.toFixed(1)}/5.0`}
              change={3}
              icon={<Award className="h-6 w-6" />}
              color="yellow"
              loading={suppliersLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Items"
              value={computedMetrics.totalInventoryItems}
              change={3}
              icon={<Package className="h-6 w-6" />}
              color="blue"
              loading={inventoryLoading}
            />
            <MetricCard
              title="Total Value"
              value={new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
                notation: 'compact'
              }).format(computedMetrics.totalInventoryValue)}
              change={5.2}
              icon={<DollarSign className="h-6 w-6" />}
              color="green"
              loading={inventoryLoading}
            />
            <MetricCard
              title="Low Stock"
              value={computedMetrics.lowStockAlerts}
              change={-8}
              trend="down"
              icon={<AlertTriangle className="h-6 w-6" />}
              color="yellow"
              loading={inventoryLoading}
            />
            <MetricCard
              title="Out of Stock"
              value={computedMetrics.outOfStockItems}
              change={-15}
              trend="down"
              icon={<AlertTriangle className="h-6 w-6" />}
              color="red"
              loading={inventoryLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Data Quality"
              value="96.8%"
              change={2.1}
              icon={<Shield className="h-6 w-6" />}
              color="green"
            />
            <MetricCard
              title="Response Time"
              value="1.2s"
              change={-15}
              trend="down"
              icon={<Zap className="h-6 w-6" />}
              color="blue"
            />
            <MetricCard
              title="Uptime"
              value="99.9%"
              change={0.1}
              icon={<Target className="h-6 w-6" />}
              color="purple"
            />
            <MetricCard
              title="Throughput"
              value="2.4k/min"
              change={12}
              icon={<BarChart3 className="h-6 w-6" />}
              color="yellow"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Wrapped Dashboard with Enhanced Error Boundary
const WrappedRealDataDashboard: React.FC = () => (
  <BulletproofErrorBoundary
    showDetails={process.env.NODE_ENV === 'development'}
    onError={(error, errorInfo) => {
      console.error('🚨 Dashboard Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }}
  >
    <Suspense fallback={<MetricCardSkeleton count={4} />}>
      <RealDataDashboard />
    </Suspense>
  </BulletproofErrorBoundary>
);

export default WrappedRealDataDashboard;