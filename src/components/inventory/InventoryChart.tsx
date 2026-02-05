'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartData {
  trends: Array<{
    month: string;
    totalItems: number;
    totalMovement: number;
    inbound: number;
    outbound: number;
  }>;
  distribution: Array<{ name: string; value: number; color: string }>;
  stockLevels: Array<{ label: string; optimal: number; low: number; outOfStock: number }>;
  turnover: Array<{ category: string; turnover: number; target: number }>;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <p className="mb-1 text-sm font-medium">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}:{' '}
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function ChartSkeleton() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function InventoryChart() {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: ChartData }>({
    queryKey: ['inventory-chart-data'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/chart-data');
      if (!res.ok) throw new Error('Failed to fetch chart data');
      return res.json();
    },
    staleTime: 60_000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const chartData = data?.data;

  if (error) {
    return (
      <div className="flex h-[300px] items-center justify-center text-destructive">
        <p className="text-sm">Failed to load inventory charts</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="trends" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="trends">Trends</TabsTrigger>
        <TabsTrigger value="distribution">Distribution</TabsTrigger>
        <TabsTrigger value="stock-levels">Stock Levels</TabsTrigger>
        <TabsTrigger value="turnover">Turnover</TabsTrigger>
      </TabsList>

      <TabsContent value="trends" className="space-y-4">
        {isLoading ? (
          <ChartSkeleton />
        ) : !chartData?.trends?.length ? (
          <EmptyState message="No movement data available" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.trends}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e0e0e0' }} />
                <YAxis tick={{ fontSize: 12 }} tickLine={{ stroke: '#e0e0e0' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  stroke="#82ca9d"
                  fillOpacity={1}
                  fill="url(#colorInbound)"
                  name="Inbound"
                />
                <Area
                  type="monotone"
                  dataKey="outbound"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorOutbound)"
                  name="Outbound"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </TabsContent>

      <TabsContent value="distribution" className="space-y-4">
        {isLoading ? (
          <ChartSkeleton />
        ) : !chartData?.distribution?.length ? (
          <EmptyState message="No product distribution data available" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </TabsContent>

      <TabsContent value="stock-levels" className="space-y-4">
        {isLoading ? (
          <ChartSkeleton />
        ) : !chartData?.stockLevels?.length ? (
          <EmptyState message="No stock level data available" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.stockLevels}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={{ stroke: '#e0e0e0' }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  tickFormatter={value => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="optimal" stackId="a" fill="#10b981" name="Optimal Stock" />
                <Bar dataKey="low" stackId="a" fill="#f59e0b" name="Low Stock" />
                <Bar dataKey="outOfStock" stackId="a" fill="#ef4444" name="Out of Stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </TabsContent>

      <TabsContent value="turnover" className="space-y-4">
        {isLoading ? (
          <ChartSkeleton />
        ) : !chartData?.turnover?.length ? (
          <EmptyState message="No turnover data available" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.turnover} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  tickFormatter={value => `${value}x`}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#e0e0e0' }}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="turnover" fill="#3b82f6" name="Actual Turnover" />
                <Bar dataKey="target" fill="#e5e7eb" name="Target Turnover" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
