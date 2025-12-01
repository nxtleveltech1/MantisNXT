/**
 * Location Distribution Widget
 * Shows product distribution across In-Store/Main vs Dropshipping locations
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { useLocationAnalytics, formatCurrency } from '@/hooks/api/useDashboardWidgets';
import { Store, Truck } from 'lucide-react';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border-border rounded-lg border p-3 shadow-lg">
        <p className="mb-2 text-sm font-medium">{payload[0]?.payload?.type}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{' '}
            {entry.name.includes('Value')
              ? formatCurrency(entry.value)
              : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function LocationDistributionWidget() {
  const { data, isLoading, error } = useLocationAnalytics();

  if (isLoading) {
    return (
      <Card className="bg-card border-border rounded-xl border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Product Distribution by Location</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Loading distribution data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="bg-card border-border rounded-xl border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Product Distribution by Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="text-sm text-red-600">Failed to load location data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const distribution = data.data?.distribution || [];
  const locations = data.data?.locations || [];

  const chartData = distribution.map(item => ({
    type: item.type,
    'Product Count': item.productCount,
    'Total Value': item.totalValue,
  }));

  // Calculate totals
  const totalProducts = distribution.reduce((sum, item) => sum + item.productCount, 0);
  const totalValue = distribution.reduce((sum, item) => sum + item.totalValue, 0);

  const inStoreData = distribution.find(d => d.type === 'In-Store/Main') || {
    productCount: 0,
    totalValue: 0,
  };
  const dropshipData = distribution.find(d => d.type === 'Dropshipping') || {
    productCount: 0,
    totalValue: 0,
  };

  return (
    <Card className="bg-card border-border rounded-xl border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Product Distribution by Location</CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Inventory spread across locations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="bg-muted/50 border-border rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                <Store className="text-primary h-4 w-4" />
              </div>
              <span className="text-sm font-medium">In-Store/Main</span>
            </div>
            <div className="text-2xl font-bold">{inStoreData.productCount.toLocaleString()}</div>
            <div className="text-muted-foreground mt-1 text-xs">
              {formatCurrency(inStoreData.totalValue)}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              {totalProducts > 0
                ? ((inStoreData.productCount / totalProducts) * 100).toFixed(1)
                : '0'}
              % of total
            </div>
          </div>

          <div className="bg-muted/50 border-border rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium">Dropshipping</span>
            </div>
            <div className="text-2xl font-bold">{dropshipData.productCount.toLocaleString()}</div>
            <div className="text-muted-foreground mt-1 text-xs">
              {formatCurrency(dropshipData.totalValue)}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              {totalProducts > 0
                ? ((dropshipData.productCount / totalProducts) * 100).toFixed(1)
                : '0'}
              % of total
            </div>
          </div>

          <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
            <span className="text-muted-foreground text-sm font-medium">Total</span>
            <div className="mt-2 text-2xl font-bold">{totalProducts.toLocaleString()}</div>
            <div className="text-muted-foreground mt-1 text-xs">{formatCurrency(totalValue)}</div>
            <div className="text-muted-foreground mt-1 text-xs">{locations.length} locations</div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                dataKey="type"
                type="category"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Product Count" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Total Value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground text-sm">No distribution data available</p>
          </div>
        )}

        {/* Detailed Location Breakdown */}
        {locations.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-sm font-medium">Location Details</h4>
            <div className="max-h-[200px] space-y-2 overflow-y-auto">
              {locations.slice(0, 10).map(location => (
                <div
                  key={location.locationId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg p-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{location.locationName}</p>
                    <p className="text-muted-foreground text-xs">
                      {location.productCount} products · {formatCurrency(location.totalValue)}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-muted-foreground text-xs font-medium">
                      {location.locationType}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
