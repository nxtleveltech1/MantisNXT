/**
 * Location Distribution Widget
 * Shows product distribution across In-Store/Main vs Dropshipping locations
 */

"use client";

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
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm mb-2">{payload[0]?.payload?.type}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Value') ? formatCurrency(entry.value) : entry.value.toLocaleString()}
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
      <Card className="bg-card border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Product Distribution by Location</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Loading distribution data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="bg-card border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Product Distribution by Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-red-600">Failed to load location data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const distribution = data.data?.distribution || [];
  const locations = data.data?.locations || [];

  const chartData = distribution.map((item) => ({
    type: item.type,
    'Product Count': item.productCount,
    'Total Value': item.totalValue,
  }));

  // Calculate totals
  const totalProducts = distribution.reduce((sum, item) => sum + item.productCount, 0);
  const totalValue = distribution.reduce((sum, item) => sum + item.totalValue, 0);

  const inStoreData = distribution.find((d) => d.type === 'In-Store/Main') || {
    productCount: 0,
    totalValue: 0,
  };
  const dropshipData = distribution.find((d) => d.type === 'Dropshipping') || {
    productCount: 0,
    totalValue: 0,
  };

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Product Distribution by Location</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Inventory spread across locations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">In-Store/Main</span>
            </div>
            <div className="text-2xl font-bold">{inStoreData.productCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(inStoreData.totalValue)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {totalProducts > 0
                ? ((inStoreData.productCount / totalProducts) * 100).toFixed(1)
                : '0'}
              % of total
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium">Dropshipping</span>
            </div>
            <div className="text-2xl font-bold">{dropshipData.productCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(dropshipData.totalValue)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {totalProducts > 0
                ? ((dropshipData.productCount / totalProducts) * 100).toFixed(1)
                : '0'}
              % of total
            </div>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <div className="text-2xl font-bold mt-2">{totalProducts.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">{formatCurrency(totalValue)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {locations.length} locations
            </div>
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
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No distribution data available</p>
          </div>
        )}

        {/* Detailed Location Breakdown */}
        {locations.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Location Details</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {locations.slice(0, 10).map((location) => (
                <div
                  key={location.locationId}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{location.locationName}</p>
                    <p className="text-xs text-muted-foreground">
                      {location.productCount} products · {formatCurrency(location.totalValue)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xs font-medium text-muted-foreground">
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
