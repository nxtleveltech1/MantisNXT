/**
 * Location Distribution Widget
 * Shows product distribution across locations
 * All currency in ZAR (R) - South African Rands
 * Using professional subdued purple-gray palette from tweakcn theme
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
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { useLocationAnalytics, formatCurrency } from '@/hooks/api/useDashboardWidgets';
import { Store, Globe, Truck, MapPin, Package } from 'lucide-react';
import { CHART_COLORS, GRADIENT_PAIRS } from '@/lib/colors';

// Location-specific colors - professional subdued palette
const LOCATION_CHART_COLORS = [
    '#6366F1', // In-Store - Indigo
    '#22C55E', // Online - Green
    '#3B82F6', // Warehouse - Blue
    '#F59E0B', // Supplier - Amber
    '#8B5CF6', // Other - Violet
];

const LOCATION_TEXT_COLORS = [
    '#6366F1', // In-Store - Indigo
    '#22C55E', // Online - Green
    '#3B82F6', // Warehouse - Blue
    '#F59E0B', // Supplier - Amber
    '#8B5CF6', // Other - Violet
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <p className="mb-2 text-sm font-medium text-popover-foreground">{payload[0]?.payload?.locationName || payload[0]?.payload?.type}</p>
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
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: CHART_COLORS[0], borderTopColor: 'transparent' }} />
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
            <p className="text-sm" style={{ color: CHART_COLORS[0] }}>Failed to load location data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const locations = data.data?.locations || [];

  // Calculate totals
  const totalProducts = locations.reduce((sum: number, item: any) => sum + item.productCount, 0);
  const totalValue = locations.reduce((sum: number, item: any) => sum + item.totalValue, 0);

  // Prepare chart data from locations (top 6)
  const chartData = locations.slice(0, 6).map((loc: any, index: number) => ({
    ...loc,
    fill: LOCATION_CHART_COLORS[index % LOCATION_CHART_COLORS.length],
    textColor: LOCATION_TEXT_COLORS[index % LOCATION_TEXT_COLORS.length],
  }));

  // Get icon for location type
  const getLocationIcon = (type: string, name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('online')) return <Globe className="h-4 w-4" style={{ color: CHART_COLORS[6] }} />;
    if (nameLower.includes('drop') || type === 'supplier') return <Truck className="h-4 w-4" style={{ color: CHART_COLORS[2] }} />;
    if (nameLower.includes('store') || nameLower.includes('main')) return <Store className="h-4 w-4" style={{ color: CHART_COLORS[7] }} />;
    return <MapPin className="h-4 w-4" style={{ color: CHART_COLORS[8] }} />;
  };

  return (
    <Card className="bg-card border-border rounded-xl border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" style={{ color: CHART_COLORS[5] }} />
          Product Distribution by Location
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Inventory spread across {locations.length} locations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {chartData.map((loc: any, index: number) => (
            <div
              key={loc.locationId}
              className="rounded-lg border p-4 transition-all hover:shadow-md hover:scale-105"
              style={{
                borderLeftWidth: '4px',
                borderLeftColor: LOCATION_TEXT_COLORS[index % LOCATION_TEXT_COLORS.length],
                background: `linear-gradient(135deg, ${LOCATION_TEXT_COLORS[index % LOCATION_TEXT_COLORS.length]}08, transparent)`
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                {getLocationIcon(loc.locationType, loc.locationName)}
                <span className="text-sm font-medium truncate" title={loc.locationName}>
                  {loc.locationName}
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: LOCATION_TEXT_COLORS[index % LOCATION_TEXT_COLORS.length] }}>
                {loc.productCount.toLocaleString()}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                {formatCurrency(loc.totalValue)}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                {loc.valuePercentage}% of total
              </div>
            </div>
          ))}
        </div>

        {/* Totals Row */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          {/* Total Products */}
          <div className="rounded-lg p-4 text-center bg-muted/50 border border-border">
            <div className="text-3xl font-bold text-primary">{totalProducts.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Products</div>
          </div>
          {/* Total Value */}
          <div className="rounded-lg p-4 text-center bg-muted/50 border border-border">
            <div className="text-3xl font-bold text-foreground">{formatCurrency(totalValue)}</div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar Chart */}
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                <YAxis
                  dataKey="locationName"
                  type="category"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="productCount" name="Products" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Pie Chart */}
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="totalValue"
                  nameKey="locationName"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value: string) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground text-sm">No distribution data available</p>
          </div>
        )}

        {/* Location Details List */}
        {locations.length > 6 && (
          <div className="mt-6">
            <h4 className="mb-3 text-sm font-medium">All Locations</h4>
            <div className="max-h-[200px] space-y-2 overflow-y-auto">
              {locations.map((location: any, index: number) => (
                <div
                  key={location.locationId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg p-2 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getLocationIcon(location.locationType, location.locationName)}
                    <div>
                      <p className="truncate text-sm font-medium">{location.locationName}</p>
                      <p className="text-muted-foreground text-xs">
                        {location.productCount} products · {formatCurrency(location.totalValue)}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div
                      className="text-xs font-medium px-2 py-1 rounded"
                      style={{
                        backgroundColor: `${LOCATION_TEXT_COLORS[index % LOCATION_TEXT_COLORS.length]}20`,
                        color: LOCATION_TEXT_COLORS[index % LOCATION_TEXT_COLORS.length]
                      }}
                    >
                      {location.valuePercentage}%
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
