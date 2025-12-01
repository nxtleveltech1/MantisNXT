'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BulletproofErrorBoundary } from '@/components/ui/BulletproofErrorBoundary';
import {
  ConditionalLoader,
  MetricCardSkeleton,
  ActivityFeedSkeleton,
  AlertPanelSkeleton,
  EmptyState,
} from '@/components/ui/BulletproofLoadingStates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Calendar,
  BarChart3,
  Zap,
  Shield,
  Truck,
  ArrowUpRight,
  Eye,
  Download,
  Bell,
  Clock,
  Target,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// React Query hooks for optimized caching and performance
import { useDashboardMetrics } from '@/hooks/api/useDashboardMetrics';

// Fixed hooks for real data integration with better error handling
import {
  useRealTimeDashboard,
  useRealTimeSuppliers,
  useRealTimeInventory,
  useSupplierMutations,
  useAlerts,
} from '@/hooks/useRealTimeDataFixed';

// Date utilities for safe timestamp handling
import { safeRelativeTime } from '@/lib/utils/dateUtils';

// Data validation utilities
import type { ValidatedActivityItem, ValidatedAlertItem } from '@/lib/utils/dataValidation';
import { validateActivityItems, errorLogger } from '@/lib/utils/dataValidation';

import { processAlertsData } from '@/lib/utils/alertValidationEnhancements';

// Types
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  href?: string;
  loading?: boolean;
  onClick?: () => void;
}

// Use validated types from dataValidation utils
type ActivityItem = ValidatedActivityItem;
type AlertItem = ValidatedAlertItem;

// Enhanced Metric Card Component with Shadcn Design Principles
const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = 'up',
  color = 'blue',
  href,
  loading = false,
  onClick,
}) => {
  // Enhanced color scheme with semantic tokens and rings
  const colorScheme = {
    blue: {
      icon: 'bg-primary/10 text-primary ring-1 ring-primary/20',
      gradient: 'from-primary/5 via-background to-background',
      change: trend === 'up' ? 'text-success' : 'text-destructive',
    },
    green: {
      icon: 'bg-success/10 text-success ring-1 ring-success/20',
      gradient: 'from-success/5 via-background to-background',
      change: trend === 'up' ? 'text-success' : 'text-destructive',
    },
    yellow: {
      icon: 'bg-warning/10 text-warning ring-1 ring-warning/20',
      gradient: 'from-warning/5 via-background to-background',
      change: trend === 'up' ? 'text-success' : 'text-destructive',
    },
    red: {
      icon: 'bg-destructive/10 text-destructive ring-1 ring-destructive/20',
      gradient: 'from-destructive/5 via-background to-background',
      change: trend === 'up' ? 'text-success' : 'text-destructive',
    },
    purple: {
      icon: 'bg-accent/10 text-accent ring-1 ring-accent/20',
      gradient: 'from-accent/5 via-background to-background',
      change: trend === 'up' ? 'text-success' : 'text-destructive',
    },
  };

  const CardWrapper = href ? 'a' : 'div';
  const cardProps = href ? { href } : onClick ? { onClick, role: 'button', tabIndex: 0 } : {};

  if (loading) {
    return (
      <Card className="border-border/50 animate-pulse border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <div className="bg-muted h-4 w-20 rounded"></div>
              <div className="bg-muted h-8 w-16 rounded"></div>
              <div className="bg-muted h-3 w-24 rounded"></div>
            </div>
            <div className="bg-muted h-12 w-12 rounded-xl"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'hover:border-primary/20 shadow-sm hover:-translate-y-1 hover:shadow-lg',
        'border-border/50 border',
        href || onClick ? 'cursor-pointer' : ''
      )}
      {...cardProps}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Subtle gradient background */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity duration-300',
          `bg-gradient-to-br ${colorScheme[color].gradient}`,
          'group-hover:opacity-60'
        )}
      />

      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Label with proper typography */}
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {title}
            </p>

            {/* Large metric value */}
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
              {(href || onClick) && (
                <ArrowUpRight className="text-muted-foreground h-4 w-4 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
              )}
            </div>

            {/* Change indicator with refined styling */}
            {change !== undefined && (
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                    trend === 'up'
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  )}
                >
                  {trend === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {change > 0 ? '+' : ''}
                    {change}%
                  </span>
                </div>
                {changeLabel && (
                  <span className="text-muted-foreground text-xs">{changeLabel}</span>
                )}
              </div>
            )}
          </div>

          {/* Refined icon presentation */}
          <div
            className={cn(
              'rounded-xl p-3 transition-all duration-300',
              colorScheme[color].icon,
              'group-hover:scale-110'
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Activity Feed Component
const ActivityFeed: React.FC<{ activities: ActivityItem[] }> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'supplier_added':
        return <Building2 className="h-4 w-4" />;
      case 'inventory_update':
        return <Package className="h-4 w-4" />;
      case 'price_change':
        return <DollarSign className="h-4 w-4" />;
      case 'delivery_received':
        return <Truck className="h-4 w-4" />;
      case 'contract_signed':
        return <Award className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive ring-1 ring-destructive/20';
      case 'medium':
        return 'bg-warning/10 text-warning ring-1 ring-warning/20';
      case 'low':
        return 'bg-success/10 text-success ring-1 ring-success/20';
      default:
        return 'bg-muted text-muted-foreground ring-1 ring-border';
    }
  };

  const getStatusVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const isRecent = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    return diffMinutes < 10;
  };

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <div
          key={activity.id}
          className={cn(
            'group relative',
            'flex items-start gap-4 rounded-lg p-4',
            'border-border/50 bg-card border',
            'hover:border-primary/30 hover:bg-accent/5',
            'transition-all duration-300',
            'animate-in fade-in-0 slide-in-from-right-4',
            // Stagger animations for first 3 items
            index < 3 && `animation-delay-${index * 100}`
          )}
        >
          {/* Enhanced icon with pulse effect for recent items */}
          <div
            className={cn(
              'relative flex-shrink-0 rounded-lg p-2.5 transition-all duration-300',
              getPriorityColor(activity.priority),
              'group-hover:scale-110'
            )}
          >
            {getActivityIcon(activity.type)}

            {/* Pulse indicator for very recent items */}
            {isRecent(activity.timestamp) && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-primary relative inline-flex h-3 w-3 rounded-full" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Title and status inline */}
            <div className="flex items-center justify-between gap-2">
              <h4 className="truncate text-sm font-semibold">{activity.title}</h4>
              <Badge variant={getStatusVariant(activity.status)} className="shrink-0 text-xs">
                {activity.status}
              </Badge>
            </div>

            {/* Description with better line height */}
            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
              {activity.description}
            </p>

            {/* Metadata footer */}
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{safeRelativeTime(activity.timestamp, 'Unknown time')}</span>
              </div>

              <Badge variant="outline" className="text-xs">
                {activity.priority}
              </Badge>
            </div>
          </div>

          {/* Hover action indicator */}
          <div className="opacity-0 transition-opacity group-hover:opacity-100">
            <Eye className="text-muted-foreground h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Enhanced Alert Panel Component
const AlertPanel: React.FC<{ alerts: AlertItem[] }> = ({ alerts }) => {
  const severityConfig = {
    critical: {
      bg: 'bg-destructive/5 dark:bg-destructive/10',
      border: 'border-l-4 border-l-destructive',
      icon: 'text-destructive',
      badge: 'bg-destructive/10 text-destructive border-destructive/20',
    },
    error: {
      bg: 'bg-destructive/5 dark:bg-destructive/10',
      border: 'border-l-4 border-l-destructive',
      icon: 'text-destructive',
      badge: 'bg-destructive/10 text-destructive border-destructive/20',
    },
    warning: {
      bg: 'bg-warning/5 dark:bg-warning/10',
      border: 'border-l-4 border-l-warning',
      icon: 'text-warning',
      badge: 'bg-warning/10 text-warning border-warning/20',
    },
    info: {
      bg: 'bg-primary/5 dark:bg-primary/10',
      border: 'border-l-4 border-l-primary',
      icon: 'text-primary',
      badge: 'bg-primary/10 text-primary border-primary/20',
    },
    success: {
      bg: 'bg-success/5 dark:bg-success/10',
      border: 'border-l-4 border-l-success',
      icon: 'text-success',
      badge: 'bg-success/10 text-success border-success/20',
    },
  };

  const unreadAlerts = alerts.filter(alert => !alert.isRead).slice(0, 10);

  return (
    <div className="space-y-3">
      {unreadAlerts.map((alert, index) => (
        <div
          key={alert.id}
          className={cn(
            'relative overflow-hidden rounded-lg border transition-all duration-300',
            'hover:-translate-x-1 hover:shadow-md',
            severityConfig[alert.severity as keyof typeof severityConfig]?.bg ||
              severityConfig.info.bg,
            severityConfig[alert.severity as keyof typeof severityConfig]?.border ||
              severityConfig.info.border,
            'animate-in fade-in-0 slide-in-from-right-4',
            index < 3 && `animation-delay-${index * 100}`
          )}
        >
          <div className="space-y-2 p-4">
            {/* Header with severity icon */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-2">
                <AlertTriangle
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    severityConfig[alert.severity as keyof typeof severityConfig]?.icon ||
                      severityConfig.info.icon
                  )}
                />
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm leading-tight font-semibold">{alert.title}</h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">{alert.message}</p>
                </div>
              </div>

              {/* Action menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Mark as read</DropdownMenuItem>
                  <DropdownMenuItem>View details</DropdownMenuItem>
                  <DropdownMenuItem>Dismiss</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Footer metadata */}
            <div className="border-border/30 flex items-center justify-between border-t pt-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  severityConfig[alert.severity as keyof typeof severityConfig]?.badge ||
                    severityConfig.info.badge
                )}
              >
                {alert.type.replace('_', ' ')}
              </Badge>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                <span>{safeRelativeTime(alert.createdAt, 'Unknown time')}</span>
              </div>
            </div>
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
    realTimeData,
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
    error: suppliersError,
  } = useRealTimeSuppliers({
    status: ['active', 'preferred'],
    includeMetrics: true,
  });

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    error: inventoryError,
  } = useRealTimeInventory({
    includeAlerts: true,
    includeMetrics: true,
  });

  const { createSupplier } = useSupplierMutations();

  // Computed metrics
  const computedMetrics = useMemo(() => {
    const suppliers = (suppliersData as unknown)?.data || [];
    const inventory = (inventoryData as unknown)?.data || [];
    const metrics = (inventoryData as unknown)?.metrics || {};

    return {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter((s: unknown) => s.status === 'active').length,
      strategicPartners: suppliers.filter((s: unknown) => s.tier === 'strategic').length,
      avgSupplierRating:
        suppliers.length > 0
          ? suppliers.reduce(
              (sum: number, s: unknown) => sum + (s.performance?.overallRating || 0),
              0
            ) / suppliers.length
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
      await Promise.all(
        [
          dashboardQuery.refetch(),
          realTimeData.refetch?.(),
          (suppliersData as unknown)?.refetch?.(),
          (inventoryData as unknown)?.refetch?.(),
          alertsQuery.refetch?.(),
        ].filter(Boolean)
      );
    } catch (error) {
      errorLogger.logError('dashboard-refresh', error, 'Error refreshing dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  // Prefer React Query data when available (cached and faster)
  const loading =
    dashboardQuery.isLoading ||
    dashboardLoading ||
    suppliersLoading ||
    inventoryLoading ||
    alertsQuery.isLoading;
  const error =
    dashboardQuery.error || dashboardError || suppliersError || inventoryError || alertsQuery.error;

  // Prevent hydration mismatches by showing loading state until mounted
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-muted mb-4 h-8 w-64 rounded"></div>
          <div className="bg-muted mb-6 h-4 w-96 rounded"></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-muted h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section with enhanced spacing */}
      <div className="animate-in fade-in-0 slide-in-from-top-4 flex flex-col gap-4 duration-400 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            Real-Time Dashboard
            {!dashboardQuery.isLoading && dashboardQuery.data && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-xs"
              >
                <Zap className="mr-1 h-3 w-3" />
                Cached
              </Badge>
            )}
            {realTimeData.connected && (
              <div className="bg-success/10 text-success border-success/20 flex items-center gap-1.5 rounded-md border px-2 py-1">
                <div className="bg-success h-2 w-2 animate-pulse rounded-full"></div>
                <span className="text-xs font-medium">Live</span>
              </div>
            )}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Live data from your supplier and inventory management systems
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="mr-2 h-4 w-4" />
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
            className="transition-transform duration-100 active:scale-95"
          >
            <RefreshCw
              className={cn(
                'mr-2 h-4 w-4 transition-transform duration-500',
                refreshing && 'animate-spin'
              )}
            />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Key Metrics with staggered animations */}
      <ConditionalLoader
        loading={loading}
        error={error ? new Error(error.toString()) : null}
        data={computedMetrics}
        onRetry={handleRefresh}
        loadingComponent={<MetricCardSkeleton count={4} />}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {[
            {
              title: 'Total Suppliers',
              value: computedMetrics.totalSuppliers.toLocaleString(),
              change: 8,
              changeLabel: 'vs last month',
              icon: <Building2 className="h-6 w-6" />,
              color: 'blue' as const,
              href: '/suppliers',
              loading: suppliersLoading,
            },
            {
              title: 'Active Suppliers',
              value: computedMetrics.activeSuppliers.toLocaleString(),
              change: 5,
              changeLabel: 'vs last month',
              icon: <CheckCircle className="h-6 w-6" />,
              color: 'green' as const,
              loading: suppliersLoading,
            },
            {
              title: 'Inventory Value',
              value: new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
                minimumFractionDigits: 0,
              }).format(computedMetrics.totalInventoryValue),
              change: 3.2,
              changeLabel: 'vs last month',
              icon: <Package className="h-6 w-6" />,
              color: 'purple' as const,
              href: '/inventory',
              loading: inventoryLoading,
            },
            {
              title: 'Stock Alerts',
              value: computedMetrics.lowStockAlerts + computedMetrics.outOfStockItems,
              change: -12,
              trend: 'down' as const,
              changeLabel: 'vs last week',
              icon: <AlertTriangle className="h-6 w-6" />,
              color: 'red' as const,
              loading: inventoryLoading,
            },
          ].map((metric, i) => (
            <div
              key={i}
              className={cn(
                'animate-in fade-in-0 slide-in-from-bottom-4 duration-400',
                `animation-delay-${i * 100}`
              )}
            >
              <MetricCard {...metric} />
            </div>
          ))}
        </div>
      </ConditionalLoader>

      {/* Main Content Tabs with enhanced styling */}
      <Tabs
        defaultValue="overview"
        className="animate-in fade-in-0 slide-in-from-bottom-6 animation-delay-400 space-y-6 duration-500"
      >
        <TabsList className="bg-muted/50 grid w-full grid-cols-4 p-1">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="suppliers"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Suppliers
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Inventory
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              {/* Performance Overview with enhanced design */}
              <Card className="border-border/50 border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Target className="text-primary h-5 w-5" />
                    System Performance
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Real-time performance metrics and system health
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Supplier Performance</span>
                        <span className="text-muted-foreground text-sm tabular-nums">
                          {computedMetrics.avgSupplierRating.toFixed(1)}/5.0
                        </span>
                      </div>
                      <Progress
                        value={(computedMetrics.avgSupplierRating / 5) * 100}
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Inventory Accuracy</span>
                        <span className="text-muted-foreground text-sm tabular-nums">98.5%</span>
                      </div>
                      <Progress value={98.5} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity with enhanced design */}
              <Card className="border-border/50 border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Activity className="text-primary h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Latest updates and system events
                  </CardDescription>
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

            {/* Right Sidebar - 4 columns */}
            <div className="space-y-6 lg:col-span-4">
              {/* Alerts with enhanced design */}
              <Card className="border-border/50 border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Bell className="text-primary h-5 w-5" />
                    Active Alerts
                    {alerts.filter(a => !a.isRead).length > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {alerts.filter(a => !a.isRead).length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    System notifications and warnings
                  </CardDescription>
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
                        icon={<CheckCircle className="text-success h-8 w-8" />}
                        title="No Active Alerts"
                        description="All systems are running smoothly. You'll be notified when attention is needed."
                      />
                    }
                  >
                    <AlertPanel alerts={alerts} />
                  </ConditionalLoader>
                </CardContent>
              </Card>

              {/* Quick Actions with enhanced design */}
              <Card className="border-border/50 border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold tracking-tight">
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Common tasks and operations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/suppliers/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Supplier
                    </a>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/inventory/add">
                      <Package className="mr-2 h-4 w-4" />
                      Add Inventory Item
                    </a>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <a href="/reports">
                      <Download className="mr-2 h-4 w-4" />
                      Generate Report
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
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
                notation: 'compact',
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
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
