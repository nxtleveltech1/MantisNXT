/**
 * Stock Alerts Widget
 * Displays critical, warning, and info level stock alerts
 */

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, Package } from 'lucide-react';
import { useStockAlerts } from '@/hooks/api/useDashboardWidgets';
import { cn } from '@/lib/utils';

type AlertFilter = 'all' | 'critical' | 'warning' | 'info';

export function StockAlertsWidget() {
  const { data, isLoading, error } = useStockAlerts();
  const [filter, setFilter] = useState<AlertFilter>('all');

  if (isLoading) {
    return (
      <Card className="bg-card border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Stock Alerts</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Loading alerts...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="bg-card border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alerts = data.data || [];
  const summary = data.summary || { critical: 0, warning: 0, info: 0, total: 0 };

  const filteredAlerts =
    filter === 'all' ? alerts : alerts.filter((alert) => alert.severity === filter);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
          icon: 'text-red-600 dark:text-red-400',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-300',
          icon: 'text-orange-600 dark:text-orange-400',
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          icon: 'text-blue-600 dark:text-blue-400',
        };
      default:
        return {
          bg: 'bg-muted',
          border: 'border-border',
          text: 'text-muted-foreground',
          icon: 'text-muted-foreground',
        };
    }
  };

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Stock Alerts</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {summary.total} total alerts
        </CardDescription>

        {/* Summary badges */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              filter === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted hover:bg-muted-foreground/10 border-border'
            )}
          >
            All ({summary.total})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              filter === 'critical'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            )}
          >
            Critical ({summary.critical})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              filter === 'warning'
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300'
            )}
          >
            Warning ({summary.warning})
          </button>
          <button
            onClick={() => setFilter('info')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              filter === 'info'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
            )}
          >
            Info ({summary.info})
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No alerts to display</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredAlerts.slice(0, 20).map((alert, index) => {
              const colors = getSeverityColors(alert.severity);
              return (
                <div
                  key={`${alert.productId}-${index}`}
                  className={cn(
                    'p-3 rounded-lg border transition-colors hover:shadow-sm',
                    colors.bg,
                    colors.border
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('mt-0.5 shrink-0', colors.icon)}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('font-medium text-sm truncate', colors.text)}>
                          {alert.productName}
                        </p>
                        {alert.sku && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {alert.sku}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {alert.locationName && (
                          <span className="truncate">📍 {alert.locationName}</span>
                        )}
                        {alert.supplierName && (
                          <span className="truncate">🏢 {alert.supplierName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {filteredAlerts.length > 20 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              View All {filteredAlerts.length} Alerts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
