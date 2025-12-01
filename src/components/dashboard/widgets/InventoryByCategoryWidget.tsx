/**
 * Inventory by Category Widgets
 * Multiple chart views for category-based inventory analysis
 */

'use client';

import React from 'react';
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

// Chart colors
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#a78bfa',
];

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border-border rounded-lg border p-3 shadow-lg">
        <p className="mb-1 text-sm font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
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
      <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      <p className="text-muted-foreground text-sm">Loading data...</p>
    </div>
  </div>
);

// Error display
const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="flex h-[300px] w-full items-center justify-center">
    <div className="space-y-2 text-center">
      <p className="text-sm text-red-600">Error loading data</p>
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
    .slice(0, 10); // Top 10 categories

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold">{data.summary.totalCategories}</div>
          <div className="text-muted-foreground text-xs">Categories</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{formatCurrency(data.summary.totalValue)}</div>
          <div className="text-muted-foreground text-xs">Total Value</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{data.summary.totalProducts.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">Products</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="categoryName"
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={value => formatCurrency(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="totalValue"
            name="Value"
            stroke="hsl(var(--chart-2))"
            fillOpacity={1}
            fill="url(#colorValue)"
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
        <div>
          <div className="text-2xl font-bold">{data.summary.totalProducts.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">Total Products</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{data.summary.topCategory}</div>
          <div className="text-muted-foreground text-xs">Top Category</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="categoryName"
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="productCount"
            name="Products"
            fill="hsl(var(--chart-3))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 3. Sales by Category [PLACEHOLDER - WooCommerce Integration]
export function SalesByCategoryPieChart() {
  // Mock data for WooCommerce integration
  const mockData = [
    { name: 'Electronics', value: 125000, count: 450 },
    { name: 'Furniture', value: 85000, count: 320 },
    { name: 'Clothing', value: 65000, count: 890 },
    { name: 'Home & Garden', value: 48000, count: 540 },
    { name: 'Sports', value: 32000, count: 280 },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          📦 WooCommerce Integration Required
        </p>
        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
          This widget will display sales data once WooCommerce is connected. Mock data shown below.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={mockData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {mockData.map((entry, index) => (
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

// 4. Sales Timeline [PLACEHOLDER - WooCommerce Integration]
export function SalesTimelineChart({ period = 'week' }: { period?: 'day' | 'week' | 'month' }) {
  // Mock data for WooCommerce integration
  const mockData = {
    day: Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      sales: Math.random() * 5000 + 1000,
      orders: Math.floor(Math.random() * 20) + 5,
    })),
    week: Array.from({ length: 7 }, (_, i) => ({
      time: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      sales: Math.random() * 15000 + 5000,
      orders: Math.floor(Math.random() * 50) + 20,
    })),
    month: Array.from({ length: 30 }, (_, i) => ({
      time: `Day ${i + 1}`,
      sales: Math.random() * 20000 + 8000,
      orders: Math.floor(Math.random() * 60) + 30,
    })),
  };

  const chartData = mockData[period].slice(0, period === 'day' ? 12 : undefined);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          📦 WooCommerce Integration Required
        </p>
        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
          This widget will display sales timeline once WooCommerce is connected. Mock data shown
          below.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            angle={period === 'day' ? -45 : 0}
            textAnchor={period === 'day' ? 'end' : 'middle'}
            height={period === 'day' ? 60 : 40}
          />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="sales"
            name="Sales (ZAR)"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="orders"
            name="Orders"
            stroke="hsl(var(--chart-3))"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
