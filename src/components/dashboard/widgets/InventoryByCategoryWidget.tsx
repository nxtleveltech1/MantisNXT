/**
 * Inventory by Category Widgets
 * Multiple chart views for category-based inventory analysis
 * All currency in ZAR (R) - South African Rands
 * Using MantisNXT vibrant rainbow color palette
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
import { CHART_COLORS, CATEGORY_COLORS, SALES_COLORS, GRADIENT_PAIRS } from '@/lib/colors';

// Custom tooltip with ZAR formatting
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="mb-1 text-sm font-medium text-white">{label}</p>
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
        <div className="rounded-lg p-3" style={{ background: `linear-gradient(135deg, ${SALES_COLORS.total}15, ${SALES_COLORS.total}05)`, border: `1px solid ${SALES_COLORS.total}30` }}>
          <div className="text-2xl font-bold" style={{ color: SALES_COLORS.total }}>{data.summary.totalCategories}</div>
          <div className="text-muted-foreground text-xs">Categories</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: `linear-gradient(135deg, ${SALES_COLORS.trend}15, ${SALES_COLORS.trend}05)`, border: `1px solid ${SALES_COLORS.trend}30` }}>
          <div className="text-2xl font-bold" style={{ color: SALES_COLORS.trend }}>{formatCurrency(data.summary.totalValue)}</div>
          <div className="text-muted-foreground text-xs">Total Value</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: `linear-gradient(135deg, ${SALES_COLORS.orders}15, ${SALES_COLORS.orders}05)`, border: `1px solid ${SALES_COLORS.orders}30` }}>
          <div className="text-2xl font-bold" style={{ color: SALES_COLORS.orders }}>{data.summary.totalProducts.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">Products</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#39FF14" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#00FFFF" stopOpacity={0.1} />
            </linearGradient>
          </defs>
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
            stroke="#39FF14"
            strokeWidth={2}
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
        <div className="rounded-lg p-3" style={{ background: `linear-gradient(135deg, ${SALES_COLORS.trend}15, ${SALES_COLORS.trend}05)`, border: `1px solid ${SALES_COLORS.trend}30` }}>
          <div className="text-2xl font-bold" style={{ color: SALES_COLORS.trend }}>{data.summary.totalProducts.toLocaleString()}</div>
          <div className="text-muted-foreground text-xs">Total Products</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: `linear-gradient(135deg, ${SALES_COLORS.orders}15, ${SALES_COLORS.orders}05)`, border: `1px solid ${SALES_COLORS.orders}30` }}>
          <div className="text-2xl font-bold" style={{ color: SALES_COLORS.orders }}>{data.summary.topCategory}</div>
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
        <div className="text-2xl font-bold" style={{ color: SALES_COLORS.total }}>{formatCurrency(totalSales)}</div>
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
        <div className="rounded-lg p-3" style={{ background: `linear-gradient(135deg, ${SALES_COLORS.total}15, ${SALES_COLORS.total}05)`, border: `1px solid ${SALES_COLORS.total}30` }}>
          <div className="text-2xl font-bold" style={{ color: SALES_COLORS.total }}>{formatCurrency(summary.total)}</div>
          <div className="text-muted-foreground text-xs">Total Sales</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: `linear-gradient(135deg, ${SALES_COLORS.online}15, ${SALES_COLORS.online}05)`, border: `1px solid ${SALES_COLORS.online}30` }}>
          <div className="text-2xl font-bold" style={{ color: SALES_COLORS.online }}>{summary.orders}</div>
          <div className="text-muted-foreground text-xs">Total Orders</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FF00FF" />
              <stop offset="15%" stopColor="#BF00FF" />
              <stop offset="30%" stopColor="#00BFFF" />
              <stop offset="50%" stopColor="#00FFFF" />
              <stop offset="65%" stopColor="#39FF14" />
              <stop offset="80%" stopColor="#FFFF00" />
              <stop offset="100%" stopColor="#FF6600" />
            </linearGradient>
          </defs>
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
            stroke="url(#salesGradient)"
            strokeWidth={3}
            dot={{ r: 5, fill: SALES_COLORS.total, strokeWidth: 2, stroke: 'white' }}
            activeDot={{ r: 7, fill: SALES_COLORS.total, strokeWidth: 2, stroke: 'white' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
