/**
 * Stock Alerts Widget
 * Displays critical, warning, and info level stock alerts
 * Using MantisNXT vibrant rainbow color palette
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, Package } from 'lucide-react';
import { useStockAlerts } from '@/hooks/api/useDashboardWidgets';
import { cn } from '@/lib/utils';
import { CHART_COLORS, MANTIS_COLORS } from '@/lib/colors';

type AlertFilter = 'all' | 'critical' | 'warning' | 'info';

// Alert colors based on MantisNXT palette
const ALERT_COLORS = {
  critical: {
    bg: `${MANTIS_COLORS.red}15`,
    border: `${MANTIS_COLORS.red}40`,
    text: MANTIS_COLORS.red,
    icon: MANTIS_COLORS.red,
  },
  warning: {
    bg: `${MANTIS_COLORS.orange}15`,
    border: `${MANTIS_COLORS.orange}40`,
    text: MANTIS_COLORS.orange,
    icon: MANTIS_COLORS.orange,
  },
  info: {
    bg: `${MANTIS_COLORS.cyan}15`,
    border: `${MANTIS_COLORS.cyan}40`,
    text: MANTIS_COLORS.cyan,
    icon: MANTIS_COLORS.cyan,
  },
};

export function StockAlertsWidget() {
  const { data, isLoading, error } = useStockAlerts();
  const [filter, setFilter] = useState<AlertFilter>('all');

  if (isLoading) {
    return (
      <Card className="bg-card border-border rounded-xl border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Stock Alerts</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Loading alerts...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded" style={{ background: `linear-gradient(90deg, ${CHART_COLORS[i % CHART_COLORS.length]}20, transparent)` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="bg-card border-border rounded-xl border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8" style={{ color: MANTIS_COLORS.orange }} />
            <p className="text-muted-foreground text-sm">Failed to load alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alerts = data.data || [];
  const summary = data.summary || { critical: 0, warning: 0, info: 0, total: 0 };

  const filteredAlerts =
    filter === 'all' ? alerts : alerts.filter(alert => alert.severity === filter);

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
    return ALERT_COLORS[severity as keyof typeof ALERT_COLORS] || {
      bg: 'hsl(var(--muted))',
      border: 'hsl(var(--border))',
      text: 'hsl(var(--muted-foreground))',
      icon: 'hsl(var(--muted-foreground))',
    };
  };

  return (
    <Card className="bg-card border-border rounded-xl border shadow-sm h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" style={{ color: MANTIS_COLORS.orange }} />
          Stock Alerts
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          {summary.total} total alerts
        </CardDescription>

        {/* Summary badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: filter === 'all' ? MANTIS_COLORS.blue : `${MANTIS_COLORS.blue}15`,
              color: filter === 'all' ? 'white' : MANTIS_COLORS.blue,
              borderColor: MANTIS_COLORS.blue,
            }}
          >
            All ({summary.total})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: filter === 'critical' ? MANTIS_COLORS.red : `${MANTIS_COLORS.red}15`,
              color: filter === 'critical' ? 'white' : MANTIS_COLORS.red,
              borderColor: MANTIS_COLORS.red,
            }}
          >
            Critical ({summary.critical})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: filter === 'warning' ? MANTIS_COLORS.orange : `${MANTIS_COLORS.orange}15`,
              color: filter === 'warning' ? 'white' : MANTIS_COLORS.orange,
              borderColor: MANTIS_COLORS.orange,
            }}
          >
            Warning ({summary.warning})
          </button>
          <button
            onClick={() => setFilter('info')}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: filter === 'info' ? MANTIS_COLORS.cyan : `${MANTIS_COLORS.cyan}15`,
              color: filter === 'info' ? 'white' : MANTIS_COLORS.cyan,
              borderColor: MANTIS_COLORS.cyan,
            }}
          >
            Info ({summary.info})
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="mx-auto mb-2 h-8 w-8" style={{ color: MANTIS_COLORS.emerald }} />
            <p className="text-muted-foreground text-sm">No alerts to display</p>
          </div>
        ) : (
          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {filteredAlerts.slice(0, 20).map((alert, index) => {
              const colors = getSeverityColors(alert.severity);
              return (
                <div
                  key={`${alert.productId}-${index}`}
                  className="rounded-lg border p-3 transition-all hover:shadow-md hover:scale-[1.01]"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0" style={{ color: colors.icon }}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium" style={{ color: colors.text }}>
                          {alert.productName}
                        </p>
                        {alert.sku && (
                          <Badge
                            variant="outline"
                            className="shrink-0 text-xs"
                            style={{ borderColor: colors.border, color: colors.text }}
                          >
                            {alert.sku}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">{alert.message}</p>
                      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
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
            <Button
              variant="outline"
              size="sm"
              style={{ borderColor: MANTIS_COLORS.blue, color: MANTIS_COLORS.blue }}
            >
              View All {filteredAlerts.length} Alerts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
