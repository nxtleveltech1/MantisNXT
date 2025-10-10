/**
 * Metrics Dashboard for NXT-SPP
 * Displays key metrics with trends and visual indicators
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  CheckCircle2,
  Users,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { DashboardMetrics } from '@/types/nxt-spp';
import { SkeletonMetrics } from './LoadingStates';

interface MetricsDashboardProps {
  metrics: DashboardMetrics | null;
  loading?: boolean;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  iconColor: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  trend,
  badge,
}: MetricCardProps) {
  const TrendIcon = trend?.direction === 'up' ? ArrowUpRight : trend?.direction === 'down' ? ArrowDownRight : Minus;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-md', iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold">{value}</div>
            {badge && (
              <Badge variant={badge.variant} className="text-xs">
                {badge.text}
              </Badge>
            )}
          </div>

          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}

          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend.direction === 'up' && 'text-green-600',
              trend.direction === 'down' && 'text-red-600',
              trend.direction === 'neutral' && 'text-muted-foreground'
            )}>
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">vs last period</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsDashboard({ metrics, loading, className }: MetricsDashboardProps) {
  if (loading || !metrics) {
    return <SkeletonMetrics />;
  }

  const totalProducts = metrics?.total_products || 0;
  const selectedProducts = metrics?.selected_products || 0;
  const totalSuppliers = metrics?.total_suppliers || 0;
  const newProductsCount = metrics?.new_products_count || 0;

  const selectionPercentage = totalProducts > 0
    ? Math.round((selectedProducts / totalProducts) * 100)
    : 0;

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {/* Total Suppliers */}
      <MetricCard
        title="Active Suppliers"
        value={totalSuppliers}
        description="Suppliers with uploaded pricelists"
        icon={Users}
        iconColor="bg-blue-100 text-blue-600"
        badge={{
          text: 'Active',
          variant: 'default'
        }}
      />

      {/* Total Products */}
      <MetricCard
        title="Products in Catalog"
        value={totalProducts.toLocaleString()}
        description="From all uploaded pricelists"
        icon={Package}
        iconColor="bg-green-100 text-green-600"
        trend={
          newProductsCount > 0
            ? {
                value: Math.round((newProductsCount / totalProducts) * 100),
                direction: 'up'
              }
            : undefined
        }
      />

      {/* Selected Products */}
      <MetricCard
        title="Selected Products"
        value={selectedProducts.toLocaleString()}
        description={
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              {selectionPercentage}% of catalog selected
            </div>
            <Progress value={selectionPercentage} className="h-1" />
          </div>
        }
        icon={CheckCircle2}
        iconColor="bg-purple-100 text-purple-600"
        badge={{
          text: 'Ready for stock',
          variant: 'secondary'
        }}
      />

      {/* Inventory Value */}
      <MetricCard
        title="Selected Inventory Value"
        value={formatCurrency(metrics?.selected_inventory_value || 0)}
        description="Total value of selected items"
        icon={DollarSign}
        iconColor="bg-orange-100 text-orange-600"
      />

      {/* New Products Alert */}
      {newProductsCount > 0 && (
        <Card className="md:col-span-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-blue-100">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">New Products Available</h3>
                <p className="text-sm text-blue-700">
                  <strong>{newProductsCount}</strong> new products have been added to the catalog.
                  Review and add them to your selection.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Changes Alert */}
      {(metrics?.recent_price_changes_count || 0) > 0 && (
        <Card className="md:col-span-2 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">Price Changes Detected</h3>
                <p className="text-sm text-amber-700">
                  <strong>{metrics?.recent_price_changes_count || 0}</strong> products have price updates in the last 30 days.
                  Review changes to ensure competitive pricing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
