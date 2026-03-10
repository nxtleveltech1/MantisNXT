/**
 * Inventory by Category Widgets
 * Multiple chart views for category-based inventory analysis
 * All currency in ZAR (R) - South African Rands
 * Using professional subdued purple-gray palette from tweakcn theme
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useInventoryByCategory, formatCurrency } from '@/hooks/api/useDashboardWidgets';
import { CHART_COLORS, CATEGORY_COLORS } from '@/lib/colors';

// Custom tooltip with ZAR formatting
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-sm">
        <p className="mb-1 text-sm font-medium text-popover-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Value') || entry.name.includes('Sales') ? formatCurrency(entry.value) : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Loading skeleton
const LoadingSkeleton = () => (
  <div className="flex h-[300px] w-full items-center justify-center">
    <div className="space-y-2 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: CHART_COLORS[0], borderTopColor: 'transparent' }} />
      <p className="text-muted-foreground text-sm">Loading data...</p>
    </div>
  </div>
);

// Error display
const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="flex h-[300px] w-full items-center justify-center">
    <div className="space-y-2 text-center">
      <p className="text-sm" style={{ color: CHART_COLORS[0] }}>Error loading data</p>
      <p className="text-muted-foreground text-xs">{message}</p>
    </div>
  </div>
);

// 1. Inventory Value by Category (Area Chart)
export function InventoryValueAreaChart({ dateRange = 'month' }: { dateRange?: string }) {
  const { data, isLoading, error } = useInventoryByCategory(dateRange);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay message={String(error)} />;
  if (!data?.success || !Array.isArray(data?.data) || data.data.length === 0) {
    return <ErrorDisplay message="No category data available" />;
  }

  const chartData = data.data
    .map((item: any) => ({
      ...item,
      totalValue: Number(item.totalValue ?? item.total_value ?? 0),
      categoryName: item.categoryName ?? item.category_name ?? 'Uncategorized',
    }))
    .filter((item: any) => item.totalValue > 0)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        {/* Categories */}
        <div className="rounded-lg p-3 bg-muted/50 border border-border">
          <div className="text-2xl font-bold text-foreground">{data.summary.totalCategories}</div>
          <div className="text-muted-foreground text-xs">Categories</div>
        </div>
        {/* Total Value */}
        <div className="rounded-lg p-3 bg-muted/50 border border-border">
          <div className="text-2xl font-bold text-foreground">{formatCurrency(data.summary.totalValue)}</div>
          <div className="text-muted-foreground text-xs">Total Value</div>
        </div>
        {/* Products */}
        <div className="rounded-lg p-3 bg-muted/50 border border-border">
          <div className="text-2xl font-bold text-foreground">{data.summary.totalProducts.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">Products</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="categoryName"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
            stroke="hsl(var(--border))"
            angle={0}
            textAnchor="middle"
            interval={0}
            height={40}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickFormatter={value => `R${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="totalValue"
            name="Value"
            stroke="#6366F1"
            strokeWidth={2}
            fillOpacity={0.15}
            fill="#6366F1"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// 2. Product Count by Category (Bar Chart)
export function ProductCountBarChart({ dateRange = 'month' }: { dateRange?: string }) {
  const { data, isLoading, error } = useInventoryByCategory(dateRange);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay message={String(error)} />;
  if (!data?.success || !Array.isArray(data?.data) || data.data.length === 0) {
    return <ErrorDisplay message="No category data available" />;
  }

  const chartData = data.data
    .map((item: any) => ({
      ...item,
      productCount: Number(item.productCount ?? item.product_count ?? 0),
      categoryName: item.categoryName ?? item.category_name ?? 'Uncategorized',
    }))
    .filter((item: any) => item.productCount > 0)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <div className="text-2xl font-bold text-foreground">{data.summary.totalProducts.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">Total Products</div>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <div className="text-2xl font-bold text-foreground">{data.summary.topCategory}</div>
          <div className="text-muted-foreground text-xs">Top Category</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="categoryName"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
            stroke="hsl(var(--border))"
            angle={0}
            textAnchor="middle"
            interval={0}
            height={40}
          />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="productCount" name="Products" radius={[4, 4, 0, 0]}>
            {chartData.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 3. Sales by Category (Pie Chart) - Uses REAL sales data
export function SalesByCategoryPieChart() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSalesData() {
      try {
        setLoading(true);
        const res = await fetch('/api/sales/analytics?channel=all');
        const json = await res.json();

        if (json.success && json.data?.trend) {
          const data = json.data.trend.slice(0, 8).map((item: any) => ({
            name: item.date,
            value: item.value,
          }));
          setSalesData(data);
        }
      } catch (err) {
        console.error('Error fetching sales data:', err);
        setError('Failed to load sales data');
      } finally {
        setLoading(false);
      }
    }
    fetchSalesData();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay message={error} />;

  if (salesData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No sales data available yet.</p>
        </div>
      </div>
    );
  }

  const totalSales = salesData.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">{formatCurrency(totalSales)}</div>
        <div className="text-muted-foreground text-xs">Total Sales by Period</div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={salesData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={100}
            dataKey="value"
            strokeWidth={2}
            stroke="hsl(var(--background))"
          >
            {salesData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// 4. Sales Timeline (Line Chart) - Uses REAL sales data
export function SalesTimelineChart({ period = 'week' }: { period?: 'day' | 'week' | 'month' }) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, orders: 0 });

  useEffect(() => {
    async function fetchSalesTimeline() {
      try {
        setLoading(true);
        const res = await fetch('/api/sales/analytics?channel=all');
        const json = await res.json();

        if (json.success && json.data) {
          const { trend, summary: summ } = json.data;

          const formattedData = trend.map((item: any) => ({
            time: item.date,
            sales: item.value,
          }));

          setChartData(formattedData);
          setSummary({
            total: summ?.totalSales || 0,
            orders: summ?.orderCount || 0
          });
        }
      } catch (err) {
        console.error('Error fetching sales timeline:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSalesTimeline();
  }, [period]);

  if (loading) return <LoadingSkeleton />;

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No timeline data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <div className="text-2xl font-bold text-foreground">{formatCurrency(summary.total)}</div>
          <div className="text-muted-foreground text-xs">Total Sales</div>
        </div>
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <div className="text-2xl font-bold text-foreground">{summary.orders}</div>
          <div className="text-muted-foreground text-xs">Total Orders</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
            stroke="hsl(var(--border))"
            angle={0}
            textAnchor="middle"
            interval={0}
            height={40}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickFormatter={value => `R${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="sales"
            name="Sales (ZAR)"
            stroke="#6366F1"
            strokeWidth={2}
            dot={{ r: 4, fill: '#6366F1' }}
            activeDot={{ r: 6, fill: '#6366F1' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
